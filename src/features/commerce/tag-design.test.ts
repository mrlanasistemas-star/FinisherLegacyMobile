import { tagGeometry, TAG_WIDTHS } from '@/components/tag/tag-geometry';
import { palette } from '@/theme/tokens';

import { DEFAULT_BACK_LINE, balanceLines, isTagProduct, tagFaceFrom, withAlpha } from './tag-design';

const design = {
  front_art_url: 'https://finisherlegacy.com/storage/veracruz.webp',
  accent: '#1F6F78',
  name_line: 'Veracruz',
  discipline_line: 'Triatlón 2026',
  back_line: 'Tu historia sigue viva',
  monogram_url: 'https://finisherlegacy.com/images/brand/logo/fl-monograma.png',
};

describe('tagFaceFrom (TagRender props)', () => {
  it('maps a tag_design to the drawn faces', () => {
    expect(tagFaceFrom(design)).toEqual({
      artUrl: design.front_art_url,
      accent: '#1F6F78',
      nameLine: 'VERACRUZ',
      disciplineLine: 'TRIATLÓN 2026',
      backLine: 'TU HISTORIA SIGUE VIVA',
      monogramUrl: design.monogram_url,
    });
  });

  it('falls back to a black-and-gold front with the product name when there is no design', () => {
    expect(tagFaceFrom(undefined, { name: 'Finisher Legacy Tag Cozumel' })).toEqual({
      artUrl: null,
      accent: palette.gold,
      nameLine: 'FINISHER LEGACY TAG COZUMEL',
      disciplineLine: null,
      backLine: DEFAULT_BACK_LINE,
      monogramUrl: null,
    });
  });

  it('treats an invalid design as absent and an invalid accent as gold', () => {
    expect(tagFaceFrom({ name_line: '' }, { name: 'Tag' }).nameLine).toBe('TAG');
    expect(tagFaceFrom({ ...design, accent: 'blue' }).accent).toBe(palette.gold);
    expect(tagFaceFrom(null).nameLine).toBe('FINISHER LEGACY');
  });

  it('keeps the design discipline line over the fallback, even when null', () => {
    expect(tagFaceFrom({ ...design, discipline_line: null }, { discipline: 'Running' }).disciplineLine).toBeNull();
    expect(tagFaceFrom(undefined, { name: 'X', discipline: 'Running' }).disciplineLine).toBe('RUNNING');
  });
});

describe('isTagProduct', () => {
  it('detects tags by type or by a valid tag_design', () => {
    expect(isTagProduct({ type: 'legacy_tag' })).toBe(true);
    expect(isTagProduct({ type: 'apparel', tag_design: design })).toBe(true);
    expect(isTagProduct({ type: 'apparel', tag_design: null })).toBe(false);
    expect(isTagProduct({ type: 'equipment' })).toBe(false);
    expect(isTagProduct(undefined)).toBe(false);
  });
});

describe('tag helpers', () => {
  it('balances the back phrase on two lines like the deck', () => {
    expect(balanceLines('TU HISTORIA SIGUE VIVA')).toEqual(['TU HISTORIA', 'SIGUE VIVA']);
    expect(balanceLines('FINISHER')).toEqual(['FINISHER']);
  });

  it('adds alpha to hex accents', () => {
    expect(withAlpha('#c9ae8b', 0.2)).toBe('#C9AE8B33');
    expect(withAlpha('#abc', 1)).toBe('#AABBCCFF');
    expect(withAlpha('nope', 0)).toBe(`${palette.gold.toUpperCase()}00`);
  });

  it('keeps the ≈1:2 body proportion at every size', () => {
    for (const width of Object.values(TAG_WIDTHS)) {
      const g = tagGeometry(width);
      expect(g.bodyH / g.width).toBeCloseTo(2);
      expect(g.height).toBeCloseTo(g.loopH + g.bodyH);
      expect(g.slot.width).toBeLessThan(g.width);
    }
    expect(TAG_WIDTHS.sm).toBeLessThan(TAG_WIDTHS.lg);
  });
});
