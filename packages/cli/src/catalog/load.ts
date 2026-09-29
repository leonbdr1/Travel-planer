// Loads and schema-checks the YAML catalog.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { placesFileSchema, regionSchema, themeSchema, type CatalogPlace, type CatalogRegion, type CatalogTheme } from './schema';

export interface LoadedCatalog {
  dir: string;
  themes: CatalogTheme[];
  regions: CatalogRegion[];
  places: Array<{ region: string; file: string; index: number; place: CatalogPlace }>;
  /** Hand-rated [fame, attractions] per "region|name" (Aufgabe 8, attraktivitaet.yaml). */
  attractiveness: Map<string, [number, number]>;
  errors: string[];
}

const attractivenessSchema = z.record(z.string(), z.record(z.string(), z.tuple([z.number().int().min(0).max(3), z.number().int().min(0).max(3)])));

export function loadCatalog(dir: string): LoadedCatalog {
  const errors: string[] = [];
  const read = <S extends z.ZodType>(file: string, schema: S): z.infer<S> | null => {
    const result = schema.safeParse(parse(readFileSync(file, 'utf8')));
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${file.slice(dir.length + 1)}: ${issue.path.join('.')}: ${issue.message}`);
      return null;
    }
    return result.data;
  };
  const themes = read(join(dir, 'themes.yaml'), z.array(themeSchema)) ?? [];
  const regions: CatalogRegion[] = [];
  for (const file of readdirSync(join(dir, 'regions')).filter((f) => f.endsWith('.yaml')).sort()) {
    regions.push(...(read(join(dir, 'regions', file), z.array(regionSchema)) ?? []));
  }
  const places: LoadedCatalog['places'] = [];
  for (const file of readdirSync(join(dir, 'places')).filter((f) => f.endsWith('.yaml')).sort()) {
    const path = join(dir, 'places', file);
    const doc = read(path, placesFileSchema);
    if (!doc) continue;
    if (`${doc.region}.yaml` !== file) errors.push(`places/${file}: region "${doc.region}" does not match the file name`);
    doc.places.forEach((place, index) => places.push({ region: doc.region, file: path, index, place }));
  }
  // Attractiveness (Aufgabe 8): optional file; every entry must name a catalog place.
  const attractiveness = new Map<string, [number, number]>();
  const attractivenessFile = join(dir, 'attraktivitaet.yaml');
  if (existsSync(attractivenessFile)) {
    const known = new Set(places.map((p) => `${p.region}|${p.place.name}`));
    for (const [region, entries] of Object.entries(read(attractivenessFile, attractivenessSchema) ?? {})) {
      for (const [name, value] of Object.entries(entries)) {
        const key = `${region}|${name}`;
        if (!known.has(key)) errors.push(`attraktivitaet.yaml: ${key} is not a catalog place`);
        else attractiveness.set(key, value);
      }
    }
  }
  return { dir, themes, regions, places, attractiveness, errors };
}
