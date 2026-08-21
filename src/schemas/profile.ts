import { z } from 'zod';

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(30, 'Debe tener máximo 30 caracteres.')
    .regex(/^[a-z0-9_.]+$/i, 'Solo letras, números, guiones bajos y puntos.'),
  bio: z.string().max(500, 'Máximo 500 caracteres.').optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  profile_visibility: z.enum(['public', 'private']),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
