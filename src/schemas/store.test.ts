import { parseCollection, parseCollections, parseTagDesign, tagDesignSchema } from './store';

const design = {
  front_art_url: 'http://127.0.0.1:8000/storage/collections/veracruz.webp',
  accent: '#C9A45C',
  name_line: 'VERACRUZ',
  discipline_line: 'TRIATLÓN 2026',
  back_line: 'TU HISTORIA SIGUE VIVA',
  monogram_url: 'http://127.0.0.1:8000/images/brand/logo/fl-monograma.png',
};

describe('tagDesignSchema', () => {
  it('accepts the documented contract', () => {
    expect(tagDesignSchema.parse(design)).toEqual(design);
  });

  it('normalizes empty strings and invalid accents to null', () => {
    const parsed = parseTagDesign({ ...design, front_art_url: '  ', accent: 'red', discipline_line: '' });
    expect(parsed).toMatchObject({ front_art_url: null, accent: null, discipline_line: null, name_line: 'VERACRUZ' });
  });

  it('accepts short hex accents and a missing monogram', () => {
    const parsed = parseTagDesign({ ...design, accent: '#abc', monogram_url: null });
    expect(parsed?.accent).toBe('#abc');
    expect(parsed?.monogram_url).toBeNull();
  });

  it('is optional: absent or malformed designs read as null, never throw', () => {
    expect(parseTagDesign(undefined)).toBeNull();
    expect(parseTagDesign(null)).toBeNull();
    expect(parseTagDesign({ ...design, name_line: '' })).toBeNull();
    expect(parseTagDesign({ ...design, back_line: undefined })).toBeNull();
    expect(parseTagDesign('VERACRUZ')).toBeNull();
  });

  it('is idempotent', () => {
    const once = parseTagDesign(design);
    expect(parseTagDesign(once)).toEqual(once);
  });
});

describe('collections', () => {
  const collection = {
    uuid: 'c-1',
    name: 'Veracruz 2026',
    slug: 'veracruz-2026',
    tagline: null,
    description: 'Colección permanente.',
    discipline: 'Triatlón',
    destination: 'Veracruz',
    year: 2026,
    accent_color: '#C9A45C',
    cover_url: null,
    tag_design: design,
    tag_designs: [
      { slug: 'principal', name: 'Veracruz 2026', ...design },
      { slug: 'noche', name: 'Noche', ...design, front_art_url: null },
      { slug: 'broken', name: 'Sin diseño' },
    ],
  };

  it('parses a collection and its named designs, dropping invalid ones', () => {
    const parsed = parseCollection(collection);
    expect(parsed?.tag_design?.name_line).toBe('VERACRUZ');
    expect(parsed?.tag_designs.map((d) => d.slug)).toEqual(['principal', 'noche']);
    expect(parsed?.tag_designs[1]?.design.front_art_url).toBeNull();
  });

  it('works with an older backend that has no tag_design', () => {
    const { tag_design: _omit, tag_designs: _omit2, ...legacy } = collection;
    const parsed = parseCollection(legacy);
    expect(parsed?.tag_design).toBeNull();
    expect(parsed?.tag_designs).toEqual([]);
  });

  it('drops invalid rows from a list instead of inventing data', () => {
    expect(parseCollections([collection, { name: '' }, null])).toHaveLength(1);
    expect(parseCollections({ data: [] })).toEqual([]);
  });
});
