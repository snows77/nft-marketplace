import { api } from './client'
import { profileSchema, type ChangePasswordInput, type ProfilePatch } from '@/contracts/auth'

export async function fetchProfile(signal?: AbortSignal) {
  const res = await api.get('/profile', { signal })
  return profileSchema.parse(res.data)
}

// Atualização parcial: dados do perfil e/ou avatar
export async function updateProfile(patch: ProfilePatch) {
  const res = await api.patch('/profile', patch)
  return profileSchema.parse(res.data)
}

export async function changePassword(input: ChangePasswordInput) {
  await api.post('/profile/password', input)
}
