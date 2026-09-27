// Deterministic fake models per output tool (PROVIDERS_MODE=fake). They are
// wired into the simulated Anthropic transport by tool name.
import type { FakeLlmResponder } from '@reiseplaner/providers';
import { fakeCatalogPlaces, fakeCatalogRegions } from './catalog';
import { fakeReviewVerify } from './review-verify';
import { fakeWishParse } from './wish-parse';

export const fakeResponders: Readonly<Record<string, FakeLlmResponder>> = {
  submit_wish_mapping: fakeWishParse,
  submit_review_findings: fakeReviewVerify,
  submit_regions: fakeCatalogRegions,
  submit_places: fakeCatalogPlaces,
};
