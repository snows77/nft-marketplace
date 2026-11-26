import { api } from './client'
import { profileSchema } from '@/contracts/auth'

export async function fetchProfile(signal?: AbortSignal) {
  const res = await api.get('/profile', { signal })
  return profileSchema.parse(res.data)
}
