import { api } from './client'
import { sessionSchema, type LoginInput, type RegisterInput } from '@/contracts/auth'

export async function login(input: LoginInput) {
  const res = await api.post('/auth/login', input)
  return sessionSchema.parse(res.data)
}

export async function register(input: RegisterInput) {
  const res = await api.post('/auth/register', input)
  return sessionSchema.parse(res.data)
}

export async function fetchSession(signal?: AbortSignal) {
  const res = await api.get('/auth/session', { signal })
  return sessionSchema.parse(res.data)
}

export async function logout() {
  await api.post('/auth/logout')
}
