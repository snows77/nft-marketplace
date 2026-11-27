import { http, HttpResponse } from 'msw'
import { changePasswordInputSchema, profilePatchSchema, type Profile } from '@/contracts/auth'
import { getDb, saveDb } from '../db'
import { hashPassword, newSalt } from '../db/crypto'
import type { DbUser } from '../db/fixtures/users'
import { apiError, requireSession, validationError } from './auth'

function toProfile(user: DbUser): Profile {
  const { id, username, email, avatarUrl, displayName, ensName, walletNickname } = user
  return { id, username, email, avatarUrl, displayName, ensName, walletNickname }
}

export const profileHandlers = [
  http.get('/api/profile', ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    return HttpResponse.json(toProfile(result.user))
  }),

  // Atualização parcial: dados do perfil e/ou avatar (avatarUrl: null remove)
  http.patch('/api/profile', async ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const parsed = profilePatchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { user } = result
    const patch = parsed.data
    const others = getDb().users.filter((u) => u.id !== user.id)
    const fieldErrors: Record<string, string[]> = {}
    if (patch.username !== undefined && others.some((u) => u.username === patch.username)) {
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    }
    if (patch.email !== undefined && others.some((u) => u.email.toLowerCase() === patch.email!.toLowerCase())) {
      fieldErrors.email = ['Este e-mail já está cadastrado.']
    }
    if (Object.keys(fieldErrors).length > 0) {
      return apiError(409, { code: 'CONFLICT', message: 'Esses dados já pertencem a outra conta.', fieldErrors })
    }

    if (patch.displayName !== undefined) user.displayName = patch.displayName
    if (patch.username !== undefined) user.username = patch.username
    if (patch.email !== undefined) user.email = patch.email
    if (patch.ensName !== undefined) user.ensName = patch.ensName || null
    if (patch.walletNickname !== undefined) user.walletNickname = patch.walletNickname
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl
    saveDb()
    return HttpResponse.json(toProfile(user))
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const parsed = changePasswordInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { user } = result
    const { currentPassword, newPassword } = parsed.data
    if ((await hashPassword(user.salt, currentPassword)) !== user.passwordHash) {
      return apiError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos destacados.',
        fieldErrors: { currentPassword: ['Senha atual incorreta.'] },
      })
    }
    if (currentPassword === newPassword) {
      return apiError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos destacados.',
        fieldErrors: { newPassword: ['A nova senha deve ser diferente da atual.'] },
      })
    }
    // Só o hash é guardado; um salt novo a cada troca
    user.salt = newSalt()
    user.passwordHash = await hashPassword(user.salt, newPassword)
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
