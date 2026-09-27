// Loads and schema-checks the YAML catalog.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { placesFileSchema, regionSchema, themeSchema, type CatalogPlace, type CatalogRegion, type CatalogTheme } from './schema';

export interface LoadedCatalog {
  dir: string;
  themes: CatalogTheme[];
  regions: CatalogRegion[];
  places: Array<{ region: string; file: string; index: number; place: CatalogPlace }>;
  errors: string[];
}

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
  return { dir, themes, regions, places, errors };
}
