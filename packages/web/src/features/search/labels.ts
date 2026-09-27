import type { MetaConfigResponse } from '@reiseplaner/contracts';

/** AI label text for catalog descriptions (konzept.md 7: approved vs. draft). */
export function catalogLabel(meta: MetaConfigResponse, verified: boolean): string {
  return (verified ? meta.ai_labels.catalog_description : meta.ai_labels.catalog_description_draft) ?? '';
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
