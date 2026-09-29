import { describe, expect, it } from 'vitest';
import { fuseRatings } from '../src/rating-fusion';

describe('fuseRatings', () => {
  it('returns null without any usable evidence', () => {
    expect(fuseRatings({ rating: null, count: null }, [])).toBeNull();
    expect(fuseRatings({ rating: 9, count: 0 }, [{ rating: 8, count: 0 }])).toBeNull();
  });

  it('keeps the own rating when no external source knows the house', () => {
    expect(fuseRatings({ rating: 8.4, count: 120 }, [])).toEqual({ rating: 8.4, count: 120, fused: false });
  });

  it('uses the external rating for an unrated house', () => {
    expect(fuseRatings({ rating: null, count: 0 }, [{ rating: 9.2, count: 200 }], 0.5)).toEqual({ rating: 9.2, count: 100, fused: true });
  });

  it('weights by review counts, external reviews counting half', () => {
    // own 10 × 4 = 40 (weight 4); external 8 × 100 × 0.5 = 400 (weight 50)
    const fused = fuseRatings({ rating: 10, count: 4 }, [{ rating: 8, count: 100 }], 0.5);
    expect(fused).toEqual({ rating: 8.15, count: 54, fused: true });
  });

  it('ignores invalid evidence (out of range, fractional counts)', () => {
    expect(fuseRatings({ rating: 8, count: 10 }, [{ rating: 12, count: 50 }, { rating: 7, count: 2.5 }])).toEqual({ rating: 8, count: 10, fused: false });
  });
});
