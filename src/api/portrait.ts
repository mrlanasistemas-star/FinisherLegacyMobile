/**
 * Portarretrato designer API (owner only, 404 otherwise): the builder data
 * of a story, the server-rendered live preview and the saved designs
 * ("personalizaciones") that can then be ordered from the store. Every
 * response is zod-parsed (src/schemas/portrait.ts).
 */

import type { z } from 'zod';

import { apiClient } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import { t } from '@/i18n';
import { portraitBuilderSchema, portraitDesignSchema, type PortraitBuilder, type PortraitDesign, type PortraitDraft } from '@/schemas/portrait';

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError({ kind: 'server', message: t('Respuesta inesperada del servidor.') });
  }
  return result.data;
}

/** Empty strings travel as null so the server treats them as "not printed". */
function body(draft: PortraitDraft) {
  const fields = Object.fromEntries(Object.entries(draft.fields).map(([key, value]) => [key, value && value.trim() !== '' ? value.trim() : null]));
  return { title: draft.title?.trim() || null, template: draft.template, photo_uuid: draft.photo_uuid, fields };
}

const storyPath = (publicId: string) => `me/stories/${encodeURIComponent(publicId)}`;

/** `GET /me/stories/{publicId}/portrait` — photos, templates, defaults, product and saved designs. */
export async function getPortraitBuilder(publicId: string): Promise<PortraitBuilder> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>(`${storyPath(publicId)}/portrait`);
    return parsed(portraitBuilderSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * `POST /me/stories/{publicId}/portrait/preview` → a JPEG data URI drawn by
 * the same composer as the print. `signal` drops a preview the user has
 * already moved past.
 */
export async function renderPortraitPreview(publicId: string, draft: PortraitDraft, width: number, signal?: AbortSignal): Promise<string> {
  try {
    const { data } = await apiClient.post<{ data?: { image?: unknown } }>(
      `${storyPath(publicId)}/portrait/preview`,
      { ...body(draft), width: Math.round(Math.min(1000, Math.max(160, width))) },
      { signal, timeout: 60_000 },
    );
    const image = data?.data?.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      throw new AppError({ kind: 'server', message: t('Respuesta inesperada del servidor.') });
    }
    return image;
  } catch (error) {
    throw toAppError(error);
  }
}

/** `POST /me/stories/{publicId}/portrait-designs` → 201 with the saved design. */
export async function createPortraitDesign(publicId: string, draft: PortraitDraft): Promise<PortraitDesign> {
  try {
    const { data } = await apiClient.post<{ data: unknown }>(`${storyPath(publicId)}/portrait-designs`, body(draft));
    return parsed(portraitDesignSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `PATCH /me/portrait-designs/{uuid}` → the updated design. An order already placed keeps its own copy. */
export async function updatePortraitDesign(uuid: string, draft: PortraitDraft): Promise<PortraitDesign> {
  try {
    const { data } = await apiClient.patch<{ data: unknown }>(`me/portrait-designs/${encodeURIComponent(uuid)}`, body(draft));
    return parsed(portraitDesignSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `DELETE /me/portrait-designs/{uuid}` → 204. */
export async function deletePortraitDesign(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`me/portrait-designs/${encodeURIComponent(uuid)}`);
  } catch (error) {
    throw toAppError(error);
  }
}
