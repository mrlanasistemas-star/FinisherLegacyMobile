import { z } from 'zod';

/**
 * Zod contract for Entrenamientos (`/training/*`): the voice and text
 * messages ("Envíame ánimo") family and friends send through a shared link,
 * and the links themselves. Responses are parsed, never cast — a malformed
 * row is dropped instead of crashing the list, and an unknown icon falls
 * back to `heart`.
 */

export const TRAINING_ICONS = ['heart', 'fire', 'medal', 'muscle', 'star', 'flag', 'sun', 'rocket'] as const;
export type TrainingIcon = (typeof TRAINING_ICONS)[number];

export const TRAINING_FILTERS = ['all', 'unheard', 'favorites'] as const;
export type TrainingFilter = (typeof TRAINING_FILTERS)[number];

const trimmedOrNull = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const trainingMessageSchema = z.object({
  uuid: z.string().min(1),
  sender_name: z.string().trim().min(1).catch('Alguien especial'),
  relationship: trimmedOrNull,
  body: trimmedOrNull,
  icon: z.enum(TRAINING_ICONS).catch('heart'),
  /** Signed and short-lived: download soon after fetching if it must work offline. */
  audio_url: trimmedOrNull,
  duration_seconds: z.coerce.number().nonnegative().catch(0),
  listened_at: z.string().nullish().transform((v) => v ?? null),
  favorite: z.boolean().catch(false),
  created_at: z.string(),
  link: z
    .object({ uuid: z.string(), title: z.string().nullish().transform((v) => v ?? null) })
    .nullish()
    .transform((v) => v ?? null),
});

export type TrainingMessage = z.infer<typeof trainingMessageSchema>;

/**
 * A voice note still being processed on the server: no `audio_url` yet but a
 * known duration. Not a text-only message — the UI shows "Procesando…",
 * refetches, and keeps it out of play queues until the audio is ready.
 */
export function isProcessing(message: Pick<TrainingMessage, 'audio_url' | 'duration_seconds'>): boolean {
  return !message.audio_url && message.duration_seconds > 0;
}

const pageMetaSchema = z.object({
  current_page: z.coerce.number().int().min(1),
  last_page: z.coerce.number().int().min(1),
  total: z.coerce.number().int().min(0),
  unheard_count: z.coerce.number().int().min(0).catch(0),
});

export type TrainingMessagesMeta = z.infer<typeof pageMetaSchema>;

export interface TrainingMessagesPage {
  data: TrainingMessage[];
  meta: TrainingMessagesMeta;
}

/** Drops individual malformed rows; a malformed envelope throws (it's a real contract break). */
function parseRows<T>(schema: z.ZodType<T>, raw: unknown): T[] {
  if (!Array.isArray(raw)) throw new Error('Respuesta inesperada del servidor.');
  return raw.flatMap((row) => {
    const result = schema.safeParse(row);
    return result.success ? [result.data] : [];
  });
}

export function parseTrainingMessagesPage(raw: unknown): TrainingMessagesPage {
  const envelope = z.object({ data: z.unknown(), meta: pageMetaSchema }).parse(raw);
  return { data: parseRows(trainingMessageSchema, envelope.data), meta: envelope.meta };
}

export const trainingLinkSchema = z.object({
  uuid: z.string().min(1),
  title: z.string().trim().min(1).catch('Envíame ánimo'),
  url: z.string().url(),
  expires_at: z.string().nullish().transform((v) => v ?? null),
  revoked_at: z.string().nullish().transform((v) => v ?? null),
  messages_count: z.coerce.number().int().min(0).catch(0),
});

export type TrainingLink = z.infer<typeof trainingLinkSchema>;

export function parseTrainingLinks(raw: unknown): TrainingLink[] {
  const envelope = z.object({ data: z.unknown() }).parse(raw);
  return parseRows(trainingLinkSchema, envelope.data);
}

export function parseTrainingLink(raw: unknown): TrainingLink {
  return z.object({ data: trainingLinkSchema }).parse(raw).data;
}

/** "Compartir mi enlace" form. Expiry in days; `null` = never expires. */
export const createTrainingLinkSchema = z.object({
  title: z.string().trim().min(2, 'Escribe un título de al menos 2 letras.').max(80, 'Máximo 80 caracteres.'),
  expires_in_days: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90)]).nullable(),
});

export type CreateTrainingLinkInput = z.infer<typeof createTrainingLinkSchema>;

/** A link is usable when it was neither revoked nor has expired. */
export function isLinkActive(link: Pick<TrainingLink, 'revoked_at' | 'expires_at'>, now: number = Date.now()): boolean {
  if (link.revoked_at) return false;
  if (link.expires_at && Date.parse(link.expires_at) <= now) return false;
  return true;
}
