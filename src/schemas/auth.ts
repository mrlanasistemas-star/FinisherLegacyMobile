import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().min(1, 'Ingresa tu nombre.').max(255),
    last_name: z.string().min(1, 'Ingresa tu apellido.').max(255),
    email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
    password: z.string().min(8, 'Debe tener al menos 8 caracteres.'),
    password_confirmation: z.string().min(1, 'Confirma tu contraseña.'),
    // Explicit acceptance of the Terms (community rules included) — App
    // Store guideline 1.2 for apps with user-generated content. Client-side
    // only: register.tsx strips it before calling the API.
    accept_terms: z.boolean().refine((value) => value, 'Acepta los Términos y el Aviso de privacidad para continuar.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['password_confirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
