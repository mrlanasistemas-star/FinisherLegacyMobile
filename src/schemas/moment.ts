import { z } from 'zod';

import { parseDuration } from '@/features/social/moment-state';

/**
 * Client-side mirror of StoreMomentRequest's user-facing rules, so the
 * composer can explain problems before a round trip. The server stays the
 * authority.
 */
export const momentMetricsSchema = z
  .object({
    title: z.string().max(80, 'Máximo 80 caracteres.').optional(),
    distance: z
      .string()
      .optional()
      .refine((value) => !value || (!Number.isNaN(Number(value.replace(',', '.'))) && Number(value.replace(',', '.')) > 0 && Number(value.replace(',', '.')) <= 1000), {
        message: 'Escribe la distancia en kilómetros, por ejemplo 10 o 21.1.',
      }),
    duration: z
      .string()
      .optional()
      .refine((value) => !value || parseDuration(value) !== null, { message: 'Usa el formato h:mm:ss o mm:ss.' }),
  })
  .optional();

export const momentSchema = z.object({
  caption: z.string().max(1000, 'Tu texto es demasiado largo (máximo 1000 caracteres).').optional(),
  visibility: z.enum(['public', 'followers', 'private']),
  photosCount: z.number().max(4, 'Puedes agregar hasta 4 fotos.'),
  metrics: momentMetricsSchema,
});

export type MomentFormValues = z.infer<typeof momentSchema>;
