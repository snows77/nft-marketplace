import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})

export const sessionSchema = z.object({
  token: z.string(),
  user: userSchema,
  expiresAt: z.string(), // ISO
})

// As mesmas regras validam o formulário (cliente) e a requisição (API simulada)
export const loginInputSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

export const registerInputSchema = z
  .object({
    username: z
      .string()
      .regex(/^[a-z0-9_.]{3,20}$/, 'Use de 3 a 20 letras minúsculas, números, _ ou .'),
    email: z.email('Informe um e-mail válido.'),
    password: z
      .string()
      .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'A senha precisa de 8+ caracteres, com letras e números.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.confirmPassword === data.password, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

export type User = z.infer<typeof userSchema>
export type Session = z.infer<typeof sessionSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>

// Perfil do colecionador (GET /api/profile). Ganha mais campos no pedaço de Perfil.
export const profileSchema = userSchema
export type Profile = z.infer<typeof profileSchema>
