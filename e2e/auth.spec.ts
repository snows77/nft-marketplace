import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, authDialog, loginAs, submitLogin } from './support/auth.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

test('login com sucesso mostra o usuário', async ({ page }, testInfo) => {
  await loginAs(page, ANA)
  await expect(page).not.toHaveURL(/auth=/)
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('button', { name: 'ana', exact: true })).toBeVisible()
  }
})

test('credenciais erradas mostram erro', async ({ page }) => {
  await page.goto('/?auth=entrar')
  await submitLogin(page, ANA.email, 'errada123')
  await expect(authDialog(page).getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
})

test('validação associa erro ao campo', async ({ page }) => {
  await page.goto('/?auth=entrar')
  await authDialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
  const email = authDialog(page).getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
})

test('cadastro com e-mail existente mostra conflito', async ({ page }) => {
  await page.goto('/?auth=cadastro')
  const dialog = authDialog(page)
  await dialog.getByLabel('Nome de usuário').fill('outra')
  await dialog.getByLabel('E-mail').fill('ana@kurio.dev')
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@123')
  await dialog.getByLabel('Confirmar senha').fill('Kurio@123')
  await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription('Este e-mail já está cadastrado.')
})

test('cadastro novo entra na conta', async ({ page }) => {
  await page.goto('/?auth=cadastro')
  const dialog = authDialog(page)
  await dialog.getByLabel('Nome de usuário').fill('carla')
  await dialog.getByLabel('E-mail').fill('carla@kurio.dev')
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@123')
  await dialog.getByLabel('Confirmar senha').fill('Kurio@123')
  await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).click()
  await expect(page.getByText('Olá, carla!')).toBeVisible()
})

test('sessão sobrevive ao refresh', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'usuário aparece no cabeçalho do desktop')
  await loginAs(page, ANA)
  await page.reload()
  await expect(page.getByRole('button', { name: 'ana', exact: true })).toBeVisible()
})

test('redirect externo é ignorado', async ({ page, baseURL }) => {
  await page.goto('/?auth=entrar&redirect=//evil.com')
  await submitLogin(page, ANA.email, ANA.password)
  await expect(page.getByText('Olá, ana!')).toBeVisible()
  // Continua no próprio app (a porta vem de E2E_PORT)
  await expect(page).toHaveURL((url) => url.origin === new URL(baseURL!).origin)
})

test('abrir o modal coloca o foco no primeiro campo', async ({ page }) => {
  await page.goto('/?auth=entrar')
  await expect(authDialog(page).getByLabel('E-mail')).toBeFocused()
})

test('fechar o modal limpa a URL', async ({ page }) => {
  await page.goto('/?auth=entrar')
  await expect(authDialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(authDialog(page)).toBeHidden()
  await expect(page).not.toHaveURL(/auth=/)
})

test('login social avisa que não faz parte da demo', async ({ page }) => {
  await page.goto('/?auth=entrar')
  await authDialog(page).getByRole('button', { name: 'Continuar com Google' }).click()
  await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
})

test('alternar para criar conta muda o formulário', async ({ page }, testInfo) => {
  await page.goto('/?auth=entrar')
  const toRegister =
    testInfo.project.name === 'desktop'
      ? authDialog(page).getByRole('tab', { name: 'Criar conta' })
      : authDialog(page).getByRole('button', { name: 'Crie uma conta' })
  await toRegister.click()
  await expect(page).toHaveURL(/auth=cadastro/)
  await expect(authDialog(page).getByLabel('Confirmar senha')).toBeVisible()
})

test('Tab fica preso dentro do modal aberto', async ({ page }) => {
  await page.goto('/?auth=entrar')
  const dialog = authDialog(page)
  await expect(dialog.getByLabel('E-mail')).toBeFocused()
  // Dá a volta completa pelos controles do modal: o foco nunca sai dele
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Shift+Tab')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
})
