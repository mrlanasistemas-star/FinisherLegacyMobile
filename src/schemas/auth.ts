import { z } from 'zod';
import { t } from '@/i18n';

export const loginSchema = z.object({
  email: z.string().min(1, { error: () => t('Ingresa tu correo.') }).email({ error: () => t('Ingresa un correo válido.') }),
  password: z.string().min(1, { error: () => t('Ingresa tu contraseña.') }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().min(1, { error: () => t('Ingresa tu nombre.') }).max(255),
    last_name: z.string().min(1, { error: () => t('Ingresa tu apellido.') }).max(255),
    email: z.string().min(1, { error: () => t('Ingresa tu correo.') }).email({ error: () => t('Ingresa un correo válido.') }),
    password: z.string().min(8, { error: () => t('Debe tener al menos 8 caracteres.') }),
    password_confirmation: z.string().min(1, { error: () => t('Confirma tu contraseña.') }),
    // Explicit acceptance of the Terms (community rules included) — App
    // Store guideline 1.2 for apps with user-generated content. Client-side
    // only: register.tsx strips it before calling the API.
    accept_terms: z.boolean().refine((value) => value, { error: () => t('Acepta los Términos y el Aviso de privacidad para continuar.') }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    error: () => t('Las contraseñas no coinciden.'),
    path: ['password_confirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
