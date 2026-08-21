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
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['password_confirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
