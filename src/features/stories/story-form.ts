/**
 * Pure logic of the story editor form (unit tested in story-form.test.ts).
 * Lengths mirror the backend rules, so most mistakes are caught before the
 * request; the server still has the last word. It holds:
 * the zod schema react-hook-form validates with, the DD/MM/AAAA ↔
 * YYYY-MM-DD date conversion (there is no date picker dependency, so the
 * date is a masked numeric field), and `buildPatch`, which sends ONLY what
 * changed and never an official field (those are read-only, the backend
 * owns them).
 */

import { z } from 'zod';

import type { StoryPatch } from '@/api/stories';
import { t } from '@/i18n';
import { STORY_TEXT_FIELDS, type EditableStory, type StoryTextField } from '@/schemas/story';

/** `label` is a function so the message is written in the language active when it is shown. */
const optionalText = (max: number, label: () => string) =>
  z
    .string()
    .trim()
    .max(max, { error: () => t('{label}: máximo {max} caracteres.', { label: label(), max }) });

const TIME = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;

export const storyFormSchema = z.object({
  title: optionalText(120, () => t('Título')),
  event_name: optionalText(160, () => t('Evento')),
  distance: optionalText(60, () => t('Distancia')),
  result_time: z
    .string()
    .trim()
    .refine((value) => value === '' || TIME.test(value), { error: () => t('Usa el formato h:mm:ss (por ejemplo 1:58:30).') }),
  // Positions are free text on purpose: "12", "12 de 340", "3.º".
  result_position: optionalText(60, () => t('Posición')),
  bib_number: optionalText(12, () => t('Dorsal')),
  athlete_display_name: optionalText(80, () => t('Nombre||nombre completo del atleta')),
  pace: optionalText(20, () => t('Ritmo')),
  category: optionalText(40, () => t('Categoría')),
  category_position: optionalText(20, () => t('Posición')),
  gender_position: optionalText(20, () => t('Posición')),
  /** Shown and typed as DD/MM/AAAA. */
  race_date: z
    .string()
    .trim()
    .refine((value) => value === '' || displayToIsoDate(value) !== null, { error: () => t('Escribe una fecha válida: día/mes/año.') }),
  location: optionalText(160, () => t('Lugar||sede o ciudad de la carrera')),
  dedication: optionalText(600, () => t('Dedicatoria')),
  body: optionalText(8000, () => t('Historia')),
});

export type StoryFormValues = z.infer<typeof storyFormSchema>;

/** `2026-03-08` (or a full ISO timestamp) → `08/03/2026`; anything else → ''. */
export function isoToDisplayDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** `08/03/2026` → `2026-03-08`; null when it is not a real calendar day. */
export function displayToIsoDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Inserts the slashes while the athlete types digits: `08032026` → `08/03/2026`. */
export function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function toFormValues(story: EditableStory): StoryFormValues {
  const values = {} as StoryFormValues;
  for (const field of STORY_TEXT_FIELDS) {
    values[field] = field === 'race_date' ? isoToDisplayDate(story.race_date) : (story[field] ?? '');
  }
  return values;
}

export function isOfficial(story: Pick<EditableStory, 'official'>, field: StoryTextField): boolean {
  return story.official[field] === true;
}

/**
 * Only the fields that changed, never an official one. Cleared text is
 * sent as `null`. An empty object means there is nothing to save.
 */
export function buildPatch(story: EditableStory, values: StoryFormValues): StoryPatch {
  const before = toFormValues(story);
  const patch: StoryPatch = {};
  for (const field of STORY_TEXT_FIELDS) {
    if (isOfficial(story, field)) continue;
    const next = values[field].trim();
    if (next === before[field].trim()) continue;
    patch[field] = next === '' ? null : field === 'race_date' ? displayToIsoDate(next) : next;
  }
  return patch;
}

/** Backend validation errors (`{field: [message]}`) for fields this form shows. */
export function serverFieldErrors(fieldErrors: Record<string, string[]> | undefined): Partial<Record<StoryTextField, string>> {
  const result: Partial<Record<StoryTextField, string>> = {};
  if (!fieldErrors) return result;
  for (const field of STORY_TEXT_FIELDS) {
    const message = fieldErrors[field]?.[0];
    if (message) result[field] = message;
  }
  return result;
}
