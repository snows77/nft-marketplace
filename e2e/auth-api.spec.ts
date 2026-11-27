import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'

// Faz a chamada de dentro da página, para passar pelo MSW (Service Worker)
function call(page: Page, method: string, path: string, body?: unknown, token?: string) {
  return page.evaluate(
    async ({ method, path, body, token }) => {
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      return { status: res.status, body: text ? JSON.parse(text) : null }
    },
    { method, path, body, token },
  )
}

const ana = { email: 'ana@kurio.dev', password: 'Kurio@123' }

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeAttached()
})

test('login com credenciais corretas devolve a sessão', async ({ page }) => {
  const res = await call(page, 'POST', '/api/auth/login', ana)
  expect(res.status).toBe(200)
  expect(res.body.user.username).toBe('ana')
  expect(res.body.token).toEqual(expect.any(String))

  const session = await call(page, 'GET', '/api/auth/session', undefined, res.body.token)
  expect(session.status).toBe(200)
  expect(session.body.user.email).toBe('ana@kurio.dev')
})

test('senha errada devolve 401 UNAUTHENTICATED', async ({ page }) => {
  const res = await call(page, 'POST', '/api/auth/login', { ...ana, password: 'errada123' })
  expect(res.status).toBe(401)
  expect(res.body).toMatchObject({ code: 'UNAUTHENTICATED', message: 'E-mail ou senha incorretos.' })
})

test('cadastro com e-mail existente devolve 409 com erro no campo', async ({ page }) => {
  const res = await call(page, 'POST', '/api/auth/register', {
    username: 'outra',
    email: 'ana@kurio.dev',
    password: 'Kurio@123',
    confirmPassword: 'Kurio@123',
  })
  expect(res.status).toBe(409)
  expect(res.body.code).toBe('CONFLICT')
  expect(res.body.fieldErrors.email).toEqual(['Este e-mail já está cadastrado.'])
})

test('cadastro inválido devolve 400 com os campos', async ({ page }) => {
  const res = await call(page, 'POST', '/api/auth/register', {
    username: 'X',
    email: 'nao-e-email',
    password: '123',
    confirmPassword: '456',
  })
  expect(res.status).toBe(400)
  expect(res.body.code).toBe('VALIDATION_ERROR')
  expect(Object.keys(res.body.fieldErrors)).toEqual(
    expect.arrayContaining(['username', 'email', 'password', 'confirmPassword']),
  )
})

test('cadastro novo cria a conta e já entra', async ({ page }) => {
  const res = await call(page, 'POST', '/api/auth/register', {
    username: 'carla',
    email: 'carla@kurio.dev',
    password: 'Kurio@123',
    confirmPassword: 'Kurio@123',
  })
  expect(res.status).toBe(201)
  expect(res.body.user.username).toBe('carla')
  const login = await call(page, 'POST', '/api/auth/login', { email: 'carla@kurio.dev', password: 'Kurio@123' })
  expect(login.status).toBe(200)
})

test('sessão expirada devolve 401 SESSION_EXPIRED', async ({ page }) => {
  const { body } = await call(page, 'POST', '/api/auth/login', ana)
  await page.evaluate(() => window.__kurioMocks!.expireSession())
  const res = await call(page, 'GET', '/api/auth/session', undefined, body.token)
  expect(res.status).toBe(401)
  expect(res.body.code).toBe('SESSION_EXPIRED')
})

test('sem token a sessão devolve 401 UNAUTHENTICATED', async ({ page }) => {
  const res = await call(page, 'GET', '/api/auth/session')
  expect(res.status).toBe(401)
  expect(res.body.code).toBe('UNAUTHENTICATED')
})

test('logout invalida o token', async ({ page }) => {
  const { body } = await call(page, 'POST', '/api/auth/login', ana)
  const out = await call(page, 'POST', '/api/auth/logout', undefined, body.token)
  expect(out.status).toBe(204)
  const res = await call(page, 'GET', '/api/auth/session', undefined, body.token)
  expect(res.status).toBe(401)
})

test('senhas nunca ficam em claro no banco simulado', async ({ page }) => {
  await call(page, 'POST', '/api/auth/register', {
    username: 'davi',
    email: 'davi@kurio.dev',
    password: 'Segredo123',
    confirmPassword: 'Segredo123',
  })
  // A versão da chave muda junto com as fixtures; lê qualquer versão do banco simulado
  const stored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('kurio:mock-db:'))
    return key ? (localStorage.getItem(key) ?? '') : ''
  })
  expect(stored).toContain('davi@kurio.dev')
  expect(stored).not.toContain('Segredo123')
  expect(stored).not.toContain('Kurio@123')
})
