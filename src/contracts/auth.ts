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

// Regras compartilhadas entre cadastro, perfil e troca de senha
const usernameRule = z
  .string()
  .regex(/^[a-z0-9_.]{3,20}$/, 'Use de 3 a 20 letras minúsculas, números, _ ou .')
const passwordRule = z
  .string()
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'A senha precisa de 8+ caracteres, com letras e números.')

export const registerInputSchema = z
  .object({
    username: usernameRule,
    email: z.email('Informe um e-mail válido.'),
    password: passwordRule,
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

// Perfil do colecionador (GET /api/profile e resposta do PATCH)
export const profileSchema = userSchema.extend({
  displayName: z.string(),
  ensName: z.string().nullable(), // só o nome, sem o ".eth"
  walletNickname: z.string(),
})
export type Profile = z.infer<typeof profileSchema>

// Dados editáveis do perfil (formulário "Perfil do colecionador")
export const profileDataInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe seu nome de exibição.')
    .max(40, 'Use no máximo 40 caracteres.'),
  username: usernameRule,
  email: z.email('Informe um e-mail válido.'),
  // Vazio = sem ENS
  ensName: z
    .string()
    .trim()
    .regex(/^([a-z0-9-]{3,32})?$/, 'Use de 3 a 32 letras minúsculas, números ou hífen.'),
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe o apelido da carteira.')
    .max(30, 'Use no máximo 30 caracteres.'),
})
export type ProfileDataInput = z.infer<typeof profileDataInputSchema>

// Avatar: o cliente aceita PNG/JPG/WebP de até 2 MB, reduz para 256 px e envia como
// data URL. A API recusa outros formatos e data URLs acima de ~300 KB.
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024
export const AVATAR_MAX_DATA_URL_LENGTH = 400_000 // ~300 KB em base64
export const avatarDataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use uma imagem PNG, JPG ou WebP.')
  .max(AVATAR_MAX_DATA_URL_LENGTH, 'A imagem é grande demais.')

// PATCH /api/profile: atualização parcial; avatarUrl null remove o avatar
export const profilePatchSchema = profileDataInputSchema
  .partial()
  .extend({ avatarUrl: avatarDataUrlSchema.nullable().optional() })
export type ProfilePatch = z.infer<typeof profilePatchSchema>

// POST /api/profile/password
export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.confirmPassword === data.newPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>
