import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, BRUNO, loginAs } from './support/auth.ts'

const ANA_PRINCIPAL = '0x5c3E9a7B1d2F4e6A8b0C9d1E3f5A7b9C2d4E6f80'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

const principal = (page: Page) => page.getByRole('region', { name: 'Carteira principal' })
const secundaria = (page: Page) => page.getByRole('region', { name: 'Carteira secundária' })

async function openWallets(page: Page, user: typeof ANA) {
  await loginAs(page, user)
  await page.goto('/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
}

test('ana vê as duas carteiras cadastradas', async ({ page }) => {
  await openWallets(page, ANA)
  await expect(principal(page)).toContainText('Reserva')
  await expect(principal(page)).toContainText('MetaMask')
  await expect(principal(page)).toContainText('Polygon')
  await expect(secundaria(page)).toContainText('Principal')
  await expect(secundaria(page)).toContainText('Coinbase Wallet')
  await expect(secundaria(page)).toContainText('Ethereum')
})

test('edita apelido e rede da principal e a alteração continua após recarregar', async ({ page }) => {
  await openWallets(page, ANA)
  await principal(page).getByRole('button', { name: 'Editar' }).click()
  const label = principal(page).getByLabel('Apelido da carteira', { exact: true })
  await expect(label).toHaveValue('Reserva')
  await expect(label).toBeFocused()
  await label.fill('Cofre')
  await principal(page).getByLabel('Rede', { exact: true }).selectOption('ethereum')
  await principal(page).getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal salva.')).toBeVisible()
  await expect(principal(page).getByRole('button', { name: 'Salvar carteira' })).toHaveCount(0)

  await page.reload()
  await expect(principal(page)).toContainText('Cofre')
  await expect(principal(page)).toContainText('Ethereum')
  await expect(principal(page)).not.toContainText('Polygon')
})

test('endereço inválido para a rede marca o campo', async ({ page }) => {
  await openWallets(page, ANA)
  await principal(page).getByRole('button', { name: 'Editar' }).click()
  await principal(page).getByLabel('Rede', { exact: true }).selectOption('solana')
  await principal(page).getByRole('button', { name: 'Salvar carteira' }).click()
  const address = principal(page).getByLabel('Endereço da carteira', { exact: true })
  await expect(address).toHaveAttribute('aria-invalid', 'true')
  await expect(address).toHaveAccessibleDescription('Endereço inválido para a rede Solana.')
})

test('mesmo endereço nas duas carteiras mostra o conflito da API', async ({ page }) => {
  await openWallets(page, ANA)
  await secundaria(page).getByRole('button', { name: 'Editar' }).click()
  const address = secundaria(page).getByLabel('Endereço da carteira', { exact: true })
  await address.fill(ANA_PRINCIPAL.toLowerCase())
  await address.press('Enter') // envio pelo teclado
  await expect(address).toHaveAttribute('aria-invalid', 'true')
  await expect(address).toHaveAccessibleDescription('Este endereço já está na sua carteira principal.')
})

test('cancelar a edição descarta as mudanças', async ({ page }) => {
  await openWallets(page, ANA)
  await principal(page).getByRole('button', { name: 'Editar' }).click()
  await principal(page).getByLabel('Apelido da carteira', { exact: true }).fill('Rascunho')
  await principal(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(principal(page)).toContainText('Reserva')
  await expect(principal(page)).not.toContainText('Rascunho')
})

test('bruno começa sem carteiras e cadastra a principal', async ({ page }) => {
  await openWallets(page, BRUNO)
  await expect(principal(page)).toContainText('Você ainda não adicionou uma carteira principal.')
  await expect(secundaria(page)).toContainText('Você ainda não adicionou uma carteira secundária.')

  await principal(page).getByRole('button', { name: 'Adicionar' }).click()
  await principal(page).getByRole('button', { name: 'Salvar carteira' }).click()
  // Campos obrigatórios vazios
  await expect(principal(page).getByLabel('Rede', { exact: true })).toHaveAccessibleDescription('Selecione uma rede.')
  await expect(principal(page).getByLabel('Tipo de carteira', { exact: true })).toHaveAccessibleDescription(
    'Selecione o tipo de carteira.',
  )

  await principal(page).getByLabel('Apelido da carteira', { exact: true }).fill('Do dia a dia')
  await principal(page).getByLabel('Rede', { exact: true }).selectOption('solana')
  await principal(page).getByLabel('Tipo de carteira', { exact: true }).selectOption('walletconnect')
  await principal(page)
    .getByLabel('Endereço da carteira', { exact: true })
    .fill('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')
  await principal(page).getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal salva.')).toBeVisible()

  await page.reload()
  await expect(principal(page)).toContainText('Do dia a dia')
  await expect(principal(page)).toContainText('WalletConnect')
  await expect(principal(page)).toContainText('Solana')
})

test('carteiras de um usuário não aparecem para outro', async ({ page }) => {
  await openWallets(page, ANA)
  await expect(principal(page)).toContainText('Reserva')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await openWallets(page, BRUNO)
  await expect(principal(page)).toContainText('Você ainda não adicionou uma carteira principal.')
  await expect(page.getByText('Reserva')).toHaveCount(0)
})
