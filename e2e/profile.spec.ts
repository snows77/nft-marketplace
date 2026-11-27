import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, loginAs, submitLogin } from './support/auth.ts'

// PNG 1x1 válido, para o envio de avatar
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
  await loginAs(page, ANA)
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
})

const field = (page: Page, label: string) => page.getByRole('main').getByLabel(label, { exact: true })

test('mostra os dados atuais do perfil', async ({ page }) => {
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Kurio')
  await expect(field(page, 'Nome de usuário')).toHaveValue('ana')
  await expect(field(page, 'E-mail')).toHaveValue(ANA.email)
  await expect(field(page, 'Nome ENS')).toHaveValue('nova')
  await expect(field(page, 'Apelido da carteira')).toHaveValue('Reserva')
})

test('edita o perfil e as alterações continuam após recarregar', async ({ page }) => {
  await field(page, 'Nome de exibição').fill('Ana Colecionadora')
  await field(page, 'Apelido da carteira').fill('Cofre')
  await field(page, 'Nome de usuário').fill('ana.k')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()

  await page.reload()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Colecionadora')
  await expect(field(page, 'Apelido da carteira')).toHaveValue('Cofre')
  await expect(field(page, 'Nome de usuário')).toHaveValue('ana.k')
})

test('nome de usuário de outra pessoa mostra o erro da API no campo (envio com Enter)', async ({ page }) => {
  const username = field(page, 'Nome de usuário')
  await username.fill('bruno')
  await username.press('Enter')
  await expect(username).toHaveAttribute('aria-invalid', 'true')
  await expect(username).toHaveAccessibleDescription('Este nome de usuário já está em uso.')
})

test('validação local marca o campo e leva o foco até ele', async ({ page }) => {
  const name = field(page, 'Nome de exibição')
  await name.fill('')
  await field(page, 'E-mail').fill('sem-arroba')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAccessibleDescription('Informe seu nome de exibição.')
  await expect(name).toBeFocused()
  await expect(field(page, 'E-mail')).toHaveAccessibleDescription('Informe um e-mail válido.')
})

test('envia um avatar, que continua após recarregar, e remove', async ({ page }) => {
  await page.getByLabel('Escolher imagem do avatar').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  })
  await expect(page.getByText('Avatar atualizado.')).toBeVisible()
  const avatar = page.getByRole('main').getByRole('img', { name: 'Seu avatar' }).first()
  await expect(avatar).toHaveAttribute('src', /^data:image\//)

  await page.reload()
  await expect(page.getByRole('main').getByRole('img', { name: 'Seu avatar' }).first()).toHaveAttribute(
    'src',
    /^data:image\//,
  )

  await page.getByRole('button', { name: 'Remover avatar' }).click()
  await expect(page.getByText('Avatar removido.')).toBeVisible()
  await expect(page.getByRole('main').getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)
})

test('arquivo que não é imagem é recusado antes do envio', async ({ page }) => {
  let uploaded = false
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().includes('/api/profile')) uploaded = true
  })
  await page.getByLabel('Escolher imagem do avatar').setInputFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('não sou imagem'),
  })
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Use uma imagem PNG, JPG ou WebP.')
  expect(uploaded).toBe(false)
})

test('alteração de senha: senha atual errada, depois sucesso e login com a nova', async ({ page }) => {
  const current = field(page, 'Senha atual')
  await current.fill('Errada123')
  await field(page, 'Nova senha').fill('NovaSenha9')
  await field(page, 'Confirmar nova senha').fill('NovaSenha9')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(current).toHaveAttribute('aria-invalid', 'true')
  await expect(current).toHaveAccessibleDescription('Senha atual incorreta.')

  await current.fill(ANA.password)
  await current.press('Enter')
  await expect(page.getByText('Senha alterada.')).toBeVisible()
  await expect(current).toHaveValue('')

  // Sai e entra de novo com a nova senha
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await page.goto('/?auth=entrar')
  await submitLogin(page, ANA.email, 'NovaSenha9')
  await expect(page.getByText('Olá, ana!')).toBeVisible()
})

test('confirmação de senha diferente é avisada no campo', async ({ page }) => {
  await field(page, 'Senha atual').fill(ANA.password)
  await field(page, 'Nova senha').fill('NovaSenha9')
  await field(page, 'Confirmar nova senha').fill('OutraSenha9')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(field(page, 'Confirmar nova senha')).toHaveAccessibleDescription('As senhas não conferem.')
})

test('itens do menu fora da demonstração avisam em vez de navegar', async ({ page }) => {
  await page
    .getByRole('main')
    .getByRole('navigation', { name: 'Meu perfil' })
    .getByRole('button', { name: 'Atividade' })
    .click()
  await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
  await expect(page).toHaveURL(/\/perfil$/)
})
