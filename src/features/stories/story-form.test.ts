/**
 * The story editor form: validation, the masked date field and the patch
 * that is sent (only changes, never official fields).
 */

import { editableStorySchema } from '@/schemas/story';

import { buildPatch, displayToIsoDate, isoToDisplayDate, isOfficial, maskDate, serverFieldErrors, storyFormSchema, toFormValues } from './story-form';

const story = editableStorySchema.parse({
  public_id: 'abc123def456',
  title: 'Mi primer maratón',
  event_name: 'Maratón de Veracruz',
  distance: '42K',
  result_time: '3:58:12',
  result_position: 412,
  bib_number: '1234',
  athlete_display_name: 'Ana Pérez',
  pace: null,
  category: null,
  category_position: null,
  gender_position: null,
  race_date: '2026-03-08',
  location: 'Veracruz',
  dedication: null,
  body: 'Lo logré.',
  visibility: 'private',
  share_url: null,
  official: { result_time: true, result_position: true },
});

describe('dates', () => {
  it('converts between the backend and the typed format', () => {
    expect(isoToDisplayDate('2026-03-08')).toBe('08/03/2026');
    expect(isoToDisplayDate('2026-03-08T06:00:00Z')).toBe('08/03/2026');
    expect(isoToDisplayDate(null)).toBe('');
    expect(displayToIsoDate('08/03/2026')).toBe('2026-03-08');
    expect(displayToIsoDate('8/3/2026')).toBe('2026-03-08');
  });

  it('rejects days that do not exist', () => {
    expect(displayToIsoDate('31/02/2026')).toBeNull();
    expect(displayToIsoDate('29/02/2025')).toBeNull();
    expect(displayToIsoDate('29/02/2024')).toBe('2024-02-29');
    expect(displayToIsoDate('00/01/2026')).toBeNull();
    expect(displayToIsoDate('01/13/2026')).toBeNull();
    expect(displayToIsoDate('2026-03-08')).toBeNull();
  });

  it('adds the slashes while typing', () => {
    expect(maskDate('0')).toBe('0');
    expect(maskDate('080')).toBe('08/0');
    expect(maskDate('08032026')).toBe('08/03/2026');
    expect(maskDate('08/03/20269')).toBe('08/03/2026');
  });
});

describe('storyFormSchema', () => {
  const values = toFormValues(story);

  it('accepts the story as loaded, with empty optional fields', () => {
    expect(values.pace).toBe('');
    expect(values.race_date).toBe('08/03/2026');
    expect(storyFormSchema.safeParse(values).success).toBe(true);
  });

  it('validates time, positions, date and lengths', () => {
    const issues = (patch: Partial<typeof values>) => storyFormSchema.safeParse({ ...values, ...patch }).error?.issues.map((issue) => issue.path[0]) ?? [];
    expect(issues({ result_time: '4 horas' })).toEqual(['result_time']);
    expect(issues({ result_time: '58:30' })).toEqual([]);
    expect(issues({ result_time: '10:05:59' })).toEqual([]);
    expect(issues({ gender_position: '3 de 120' })).toEqual([]);
    expect(issues({ gender_position: 'x'.repeat(21) })).toEqual(['gender_position']);
    expect(issues({ bib_number: 'x'.repeat(13) })).toEqual(['bib_number']);
    expect(issues({ race_date: '31/02/2026' })).toEqual(['race_date']);
    expect(issues({ title: 'x'.repeat(121) })).toEqual(['title']);
    expect(issues({ body: 'x'.repeat(8001) })).toEqual(['body']);
  });
});

describe('buildPatch', () => {
  const values = toFormValues(story);

  it('is empty when nothing changed (even with extra spaces)', () => {
    expect(buildPatch(story, values)).toEqual({});
    expect(buildPatch(story, { ...values, title: '  Mi primer maratón ' })).toEqual({});
  });

  it('sends only the fields that changed, trimmed', () => {
    expect(buildPatch(story, { ...values, title: ' Mi maratón ', pace: '5:38 /km' })).toEqual({ title: 'Mi maratón', pace: '5:38 /km' });
  });

  it('sends null for cleared text and the date as YYYY-MM-DD', () => {
    expect(buildPatch(story, { ...values, body: '   ', race_date: '09/03/2026' })).toEqual({ body: null, race_date: '2026-03-09' });
    expect(buildPatch(story, { ...values, race_date: '' })).toEqual({ race_date: null });
  });

  it('never sends an official field, whatever the form holds', () => {
    expect(isOfficial(story, 'result_time')).toBe(true);
    expect(isOfficial(story, 'pace')).toBe(false);
    expect(buildPatch(story, { ...values, result_time: '2:00:00', result_position: '1', bib_number: '77' })).toEqual({ bib_number: '77' });
  });
});

describe('serverFieldErrors', () => {
  it('keeps the first message of the fields this form shows', () => {
    expect(serverFieldErrors({ title: ['Muy largo.', 'Otro'], unknown: ['x'] })).toEqual({ title: 'Muy largo.' });
    expect(serverFieldErrors(undefined)).toEqual({});
  });
});
