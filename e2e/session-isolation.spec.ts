import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, BRUNO, authDialog, loginAs } from './support/auth.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

// Chaves de query que ainda guardam dados (exposto só com os mocks ligados)
const cachedKeys = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__kurioDebug!.cachedQueryKeys())

test('expiração detectada pela checagem de sessão limpa os dados privados', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await expect(page.getByText(ANA.email)).toBeVisible()
  expect(JSON.stringify(await cachedKeys(page))).toContain('profile')

  await page.evaluate(() => window.__kurioMocks!.expireSession())
  // Navegação interna para rota privada: a checagem de sessão detecta a expiração
  await page.evaluate(() => {
    history.pushState({}, '', '/perfil?x=1')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(authDialog(page)).toBeVisible()
  expect(JSON.stringify(await cachedKeys(page))).not.toContain('profile')
})

test('logout em outra aba encerra a sessão nesta aba', async ({ page, context }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await expect(page.getByText(ANA.email)).toBeVisible()

  const other = await context.newPage()
  await other.goto('/perfil')
  await expect(other.getByText(ANA.email)).toBeVisible()
  await other.getByRole('main').getByRole('button', { name: 'Sair' }).click()

  // A primeira aba percebe e não mostra mais os dados da ana
  await expect(page.getByText(ANA.email)).toBeHidden()
  await expect(authDialog(page)).toBeVisible()
})

test('troca de usuário em outra aba atualiza esta aba', async ({ page, context }) => {
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await expect(page.getByText(ANA.email)).toBeVisible()

  const other = await context.newPage()
  await other.goto('/perfil')
  await other.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await loginAs(other, BRUNO)

  await page.goto('/perfil') // mesma aba, navegando de novo
  await expect(page.getByText(BRUNO.email)).toBeVisible()
  await expect(page.getByText(ANA.email)).toHaveCount(0)
})

test('selo do painel indica latência alterada', async ({ page }) => {
  await withScenario(page, { preset: 'padrao', latency: 'slow' })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Cenários.*personalizado/ })).toBeVisible()
})
