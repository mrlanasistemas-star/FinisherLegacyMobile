import { z } from 'zod';

import { parseDuration } from '@/features/social/moment-state';
import { t } from '@/i18n';

/**
 * Client-side mirror of StoreMomentRequest's user-facing rules, so the
 * composer can explain problems before a round trip. The server stays the
 * authority.
 */
export const momentMetricsSchema = z
  .object({
    title: z.string().max(80, { error: () => t('Máximo 80 caracteres.') }).optional(),
    distance: z
      .string()
      .optional()
      .refine((value) => !value || (!Number.isNaN(Number(value.replace(',', '.'))) && Number(value.replace(',', '.')) > 0 && Number(value.replace(',', '.')) <= 1000), {
        error: () => t('Escribe la distancia en kilómetros, por ejemplo 10 o 21.1.'),
      }),
    duration: z
      .string()
      .optional()
      .refine((value) => !value || parseDuration(value) !== null, { error: () => t('Usa el formato h:mm:ss o mm:ss.') }),
  })
  .optional();

export const momentSchema = z.object({
  caption: z.string().max(1000, { error: () => t('Tu texto es demasiado largo (máximo 1000 caracteres).') }).optional(),
  visibility: z.enum(['public', 'followers', 'private']),
  photosCount: z.number().max(4, { error: () => t('Puedes agregar hasta 4 fotos.') }),
  metrics: momentMetricsSchema,
});

export type MomentFormValues = z.infer<typeof momentSchema>;
