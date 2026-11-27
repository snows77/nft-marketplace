import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, BRUNO, authDialog, loginAs, submitLogin } from './support/auth.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

const profileHeading = (page: import('@playwright/test').Page) =>
  page.getByRole('heading', { name: 'Meu perfil', level: 1 })

test('rota privada pede login e volta para ela', async ({ page }) => {
  await page.goto('/perfil')
  await expect(authDialog(page)).toBeVisible()
  await expect(page).toHaveURL(/redirect=%2Fperfil/)
  await submitLogin(page, ANA.email, ANA.password)
  await expect(profileHeading(page)).toBeVisible()
  await expect(page.getByText(ANA.email)).toBeVisible()
  await expect(page).toHaveURL(/\/perfil$/)
})

test('expiração durante a navegação preserva o destino', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await expect(profileHeading(page)).toBeVisible()

  await page.evaluate(() => window.__kurioMocks!.expireSession())
  await page.reload()

  await expect(page.getByText('Sua sessão expirou. Entre novamente.')).toBeVisible()
  await expect(authDialog(page)).toBeVisible()
  await submitLogin(page, ANA.email, ANA.password)
  await expect(profileHeading(page)).toBeVisible()
})

test('expiração ao navegar entre páginas sem recarregar', async ({ page }) => {
  await loginAs(page, ANA)
  await page.evaluate(() => window.__kurioMocks!.expireSession())
  // Navegação do próprio app (sem reload) para uma rota privada
  await page.evaluate(() => {
    history.pushState({}, '', '/perfil')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByText('Sua sessão expirou. Entre novamente.')).toBeVisible()
  await expect(authDialog(page)).toBeVisible()
  await expect(profileHeading(page)).toBeHidden()
})

test('logout limpa a sessão', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
  await page.goto('/perfil')
  await expect(authDialog(page)).toBeVisible()
})

test('logout pelo menu do cabeçalho', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'menu do usuário existe no cabeçalho desktop')
  await loginAs(page, ANA)
  await page.getByRole('button', { name: 'ana', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
})

test('troca de usuário não mostra dados do anterior', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await loginAs(page, BRUNO)
  await page.goto('/perfil')
  await expect(page.getByText(BRUNO.email)).toBeVisible()
  await expect(page.getByText(ANA.email)).toHaveCount(0)
})

test('token desconhecido não gera loop de redirecionamento', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('kurio:session-token', 'token-que-nao-existe'))
  await page.goto('/perfil')
  await expect(authDialog(page)).toBeVisible()
  await expect(page).toHaveURL(/auth=entrar/)
  // A página continua estável (sem redirecionar de novo)
  await page.waitForTimeout(500)
  await expect(authDialog(page)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()
})
