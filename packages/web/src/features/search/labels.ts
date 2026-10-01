import type { MetaConfigResponse } from '@reiseplaner/contracts';
import { formatDrive } from '@reiseplaner/domain';

/** AI label text for catalog descriptions (konzept.md 7: approved vs. draft). */
export function catalogLabel(meta: MetaConfigResponse, verified: boolean): string {
  return (verified ? meta.ai_labels.catalog_description : meta.ai_labels.catalog_description_draft) ?? '';
}

/** Drive time for display: exact under 7 h, then "ca. 8 h", "über 10 h", "über 20 h", "über 30 h" (Aufgabe F16). */
export function formatMinutes(minutes: number): string {
  return formatDrive(minutes);
}
