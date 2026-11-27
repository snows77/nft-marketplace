import { http, HttpResponse } from 'msw'
import type { z } from 'zod'
import { loginInputSchema, registerInputSchema, type Session, type User } from '@/contracts/auth'
import type { ApiError } from '@/contracts/common'
import { getDb, saveDb, type DbSession } from '../db'
import { hashPassword, newSalt } from '../db/crypto'
import type { DbUser } from '../db/fixtures/users'

const SESSION_TTL_MS = 30 * 60 * 1000

export function apiError(status: number, error: ApiError) {
  return HttpResponse.json(error, { status })
}

export function validationError(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return apiError(400, { code: 'VALIDATION_ERROR', message: 'Verifique os campos destacados.', fieldErrors })
}

function toUser({ id, username, email, avatarUrl }: DbUser): User {
  return { id, username, email, avatarUrl }
}

function openSession(user: DbUser): Session {
  const session: DbSession = {
    token: crypto.randomUUID(),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  getDb().sessions.push(session)
  saveDb()
  return { token: session.token, user: toUser(user), expiresAt: session.expiresAt }
}

function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

// Usado por todo handler privado: devolve o usuário da sessão ou a resposta de erro
export function requireSession(request: Request): { user: DbUser; session: DbSession } | Response {
  const token = readToken(request)
  const db = getDb()
  const session = token ? db.sessions.find((s) => s.token === token) : undefined
  const user = session ? db.users.find((u) => u.id === session.userId) : undefined
  if (!session || !user) {
    return apiError(401, { code: 'UNAUTHENTICATED', message: 'Entre na sua conta para continuar.' })
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return apiError(401, { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente.' })
  }
  return { user, session }
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const parsed = registerInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { username, email, password } = parsed.data
    const db = getDb()
    const fieldErrors: Record<string, string[]> = {}
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      fieldErrors.email = ['Este e-mail já está cadastrado.']
    }
    if (db.users.some((u) => u.username === username)) {
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    }
    if (Object.keys(fieldErrors).length > 0) {
      return apiError(409, { code: 'CONFLICT', message: 'Já existe uma conta com esses dados.', fieldErrors })
    }

    const salt = newSalt()
    const user: DbUser = {
      id: `user-${crypto.randomUUID()}`,
      username,
      email,
      avatarUrl: null,
      displayName: username,
      ensName: null,
      walletNickname: 'Minha carteira',
      salt,
      passwordHash: await hashPassword(salt, password),
    }
    db.users.push(user)
    return HttpResponse.json(openSession(user), { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const parsed = loginInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { email, password } = parsed.data
    const user = getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    const valid = user && (await hashPassword(user.salt, password)) === user.passwordHash
    if (!user || !valid) {
      return apiError(401, { code: 'UNAUTHENTICATED', message: 'E-mail ou senha incorretos.' })
    }
    return HttpResponse.json(openSession(user))
  }),

  http.get('/api/auth/session', ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const { user, session } = result
    return HttpResponse.json({ token: session.token, user: toUser(user), expiresAt: session.expiresAt })
  }),

  // Idempotente: sair duas vezes (ou com token já inválido) também responde 204
  http.post('/api/auth/logout', ({ request }) => {
    const token = readToken(request)
    const db = getDb()
    db.sessions = db.sessions.filter((s) => s.token !== token)
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
