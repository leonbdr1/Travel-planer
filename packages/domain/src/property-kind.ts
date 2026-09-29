// Kind of accommodation (Aufgaben 6 und 7, docs/logik/unterkunftsarten.md):
// a hotel has many rooms, a guesthouse some, a holiday flat one or a few.
// Few reviews weigh differently, and so does a defect bound to one unit.
export type PropertyKind = 'hotel' | 'pension' | 'ferienwohnung';

export const PROPERTY_KINDS: readonly PropertyKind[] = ['hotel', 'pension', 'ferienwohnung'];

const FLAT = /ferienwohnung|ferienhaus|apartment|appartement|\bwohnung|holiday (home|house|apartment)|vacation|chalet|villa|cottage|bungalow|privatunterkunft|private (host|accommodation)|\bfewo\b|\bflat\b|studio/i;
const GUESTHOUSE = /pension|gasthof|gasthaus|gästehaus|gaestehaus|guest ?house|bed (and|&) breakfast|\bb&b\b|\binn\b|zimmervermietung|pensione|garni/i;
const HOTEL = /hotel|resort|hostel|motel/i;

function fromText(text: string): PropertyKind | null {
  // "Aparthotel" and "Apartmenthotel" are hotels.
  if (/apart(ment)?hotel/i.test(text)) return 'hotel';
  if (FLAT.test(text)) return 'ferienwohnung';
  if (GUESTHOUSE.test(text)) return 'pension';
  if (HOTEL.test(text)) return 'hotel';
  return null;
}

/** The provider's type first, then the name; unknown counts as hotel (the strictest, former rule). */
export function propertyKind(hotelType: string | null | undefined, name: string | null | undefined): PropertyKind {
  return (hotelType ? fromText(hotelType) : null) ?? (name ? fromText(name) : null) ?? 'hotel';
}
