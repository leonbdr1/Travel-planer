// Provider texts as readable blocks (Ben, 2026-09-29: the description showed
// "<p><strong>Charming Accommodation in Todtmoos</strong></p><p><…").
import { describe, expect, it } from 'vitest';
import { blocksLanguage, decodeEntities, guessLanguage, textBlocks } from '../src/rich-text';

describe('textBlocks', () => {
  it('turns a LiteAPI description into headings, paragraphs and lists', () => {
    const html =
      '<p><strong>Charming Accommodation in Todtmoos</strong></p><p>Located in Todtmoos, this apartment&nbsp;offers a\ngarden.</p>' +
      '<p><strong>Amenities</strong><br />Free WiFi &amp; parking.</p><ul><li>Kitchen</li>\n<li>Terrace <em>with view</em></li></ul>';
    expect(textBlocks(html)).toEqual([
      { kind: 'heading', text: 'Charming Accommodation in Todtmoos' },
      { kind: 'paragraph', text: 'Located in Todtmoos, this apartment offers a garden.' },
      { kind: 'heading', text: 'Amenities' },
      { kind: 'paragraph', text: 'Free WiFi & parking.' },
      { kind: 'list', items: ['Kitchen', 'Terrace with view'] },
    ]);
  });

  it('keeps a bold lead-in inside its paragraph and reads h-tags as headings', () => {
    expect(textBlocks('<h3>Lage</h3><p><b>Lage:</b> Direkt am See.</p>')).toEqual([
      { kind: 'heading', text: 'Lage' },
      { kind: 'paragraph', text: 'Lage: Direkt am See.' },
    ]);
  });

  it('splits plain text at line breaks, so run-together notes become separate lines', () => {
    const info = 'This property does not accommodate bachelor(ette) or similar parties.\nManaged by a private host\n\nA deposit may be required at the property.';
    expect(textBlocks(info)).toEqual([
      { kind: 'paragraph', text: 'This property does not accommodate bachelor(ette) or similar parties.' },
      { kind: 'paragraph', text: 'Managed by a private host' },
      { kind: 'paragraph', text: 'A deposit may be required at the property.' },
    ]);
  });

  it('makes a list of consecutive bullet lines', () => {
    expect(textBlocks('Bitte beachten:\n• Kurtaxe vor Ort\n- Haustiere auf Anfrage\nGute Reise')).toEqual([
      { kind: 'paragraph', text: 'Bitte beachten:' },
      { kind: 'list', items: ['Kurtaxe vor Ort', 'Haustiere auf Anfrage'] },
      { kind: 'paragraph', text: 'Gute Reise' },
    ]);
  });

  it('drops scripts, styles, comments and unknown tags, decodes entities', () => {
    const html = '<div><script>alert(1)</script><style>p{}</style><!-- x --><span class="a">Gr&uuml;&#223;e &#x20AC; 5 &lt;3 &bogus;</span></div>';
    expect(textBlocks(html)).toEqual([{ kind: 'paragraph', text: 'Grüße € 5 <3 &bogus;' }]);
    expect(decodeEntities('&#0;&#x110000;&amp;')).toBe('&#0;&#x110000;&');
  });

  it('returns nothing for empty input', () => {
    expect(textBlocks(null)).toEqual([]);
    expect(textBlocks('  <p> </p> ')).toEqual([]);
  });
});

describe('guessLanguage', () => {
  it('tells German from English and stays silent when unsure', () => {
    expect(guessLanguage('Die Unterkunft verlangt eine Kaution, bitte beachten Sie die Hausordnung.')).toBe('de');
    expect(guessLanguage('A deposit may be required at the property. This property does not accommodate parties.')).toBe('en');
    expect(guessLanguage('WLAN')).toBeNull();
    expect(blocksLanguage(textBlocks('<p>Free WiFi</p><ul><li>You can park at the house</li></ul>'))).toBe('en');
  });
});
