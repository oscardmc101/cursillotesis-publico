import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z
  .object({
    nombres: z
      .string()
      .min(1, 'El nombre es requerido')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    apellidos: z
      .string()
      .min(1, 'El apellido es requerido')
      .max(100, 'El apellido no puede exceder 100 caracteres'),
    email: z
      .string()
      .min(1, 'El correo electrónico es requerido')
      .email('Ingresa un correo electrónico válido'),
    telefono: z
      .string()
      .trim()
      .max(20, 'El teléfono no puede exceder 20 caracteres')
      .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
      .optional()
      .or(z.literal('')),
    telefonoVisible: z.boolean().default(true),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
    tipoRegistro: z.enum(['ESTUDIANTE', 'DOCENTE'], {
      required_error: 'Selecciona un tipo de cuenta',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
