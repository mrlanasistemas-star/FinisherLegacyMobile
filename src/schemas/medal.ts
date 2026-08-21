import { z } from 'zod';

export const manualMedalSchema = z.object({
  event_name_manual: z.string().min(1, 'Ingresa el nombre del evento.').max(255),
  event_date: z.string().optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  distance_label: z.string().max(50).optional().or(z.literal('')),
  official_time: z.string().max(20).optional().or(z.literal('')),
  pace: z.string().max(20).optional().or(z.literal('')),
  story: z.string().max(2000).optional().or(z.literal('')),
  visibility: z.enum(['public', 'private']),
});

export type ManualMedalFormValues = z.infer<typeof manualMedalSchema>;
