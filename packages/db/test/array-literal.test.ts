import { describe, expect, it } from 'vitest';
import { parsePgArrayLiteral, toPgArrayLiteral } from '../src/db';

describe('Postgres array literals', () => {
  it.each([
    [[], '{}'],
    [['a', 'b'], '{"a","b"}'],
    [['with,comma', 'quote"inside', 'back\\slash', ''], '{"with,comma","quote\\"inside","back\\\\slash",""}'],
    [[1, 2, 3], '{"1","2","3"}'],
  ])('encodes %j', (input, literal) => {
    expect(toPgArrayLiteral(input)).toBe(literal);
  });

  it('parses unquoted, quoted and NULL elements', () => {
    expect(parsePgArrayLiteral('{a,"b c",NULL,"x\\"y","1,2"}')).toEqual(['a', 'b c', null, 'x"y', '1,2']);
    expect(parsePgArrayLiteral('{}')).toEqual([]);
    expect(parsePgArrayLiteral('{solo}')).toEqual(['solo']);
  });

  it('round-trips arbitrary strings', () => {
    const values = ['plain', 'mit Leerzeichen', 'Kom,ma', 'An"führung', 'Back\\slash', 'Ümläut'];
    expect(parsePgArrayLiteral(toPgArrayLiteral(values))).toEqual(values);
  });
});
