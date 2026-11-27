import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, BRUNO, loginAs } from './support/auth.ts'
import { addAsGuest, cartRegion, EMERALD_50, summary } from './support/cart.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

test('carrinho vazio orienta a explorar', async ({ page }) => {
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar NFTs' })).toHaveAttribute('href', '/')
})

test('mostra itens e o resumo calculado pela API', async ({ page }) => {
  await addAsGuest(page, { ...EMERALD_50, quantity: 2 })
  const item = cartRegion(page).getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })
  await expect(item).toContainText('2.38 ETH')
  await expect(summary(page).getByTestId('subtotal')).toHaveText('2.38 ETH')
  await expect(summary(page).getByTestId('taxa')).toHaveText('0.016 ETH')
  await expect(summary(page).getByTestId('total')).toHaveText('2.396 ETH')
})

test('quantidade aumenta até o limite e diminui', async ({ page }) => {
  await addAsGuest(page, { ...EMERALD_50, quantity: 4 })
  const item = cartRegion(page).getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })
  await item.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).click()
  await expect(item.getByTestId('quantidade')).toHaveText('5')
  // 5 é o disponível da edição 1/50: o botão trava
  await expect(item.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' })).toBeDisabled()
  await item.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' }).click()
  await expect(item.getByTestId('quantidade')).toHaveText('4')
  await expect(summary(page).getByTestId('subtotal')).toHaveText('4.76 ETH')
})

test('remover item atualiza o resumo', async ({ page }) => {
  await addAsGuest(page, { ...EMERALD_50, quantity: 1 })
  await cartRegion(page).getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('cupom válido, inválido, expirado e remoção', async ({ page }) => {
  await addAsGuest(page, { ...EMERALD_50, quantity: 2 })
  const coupon = summary(page).getByRole('textbox', { name: 'Código promocional' })

  await coupon.fill('NAOEXISTE')
  await summary(page).getByRole('button', { name: 'Aplicar' }).click()
  await expect(coupon).toHaveAccessibleDescription('Cupom inválido.')

  await coupon.fill('GENESIS2025')
  await summary(page).getByRole('button', { name: 'Aplicar' }).click()
  await expect(coupon).toHaveAccessibleDescription('Cupom expirado.')

  await coupon.fill('kurio10')
  await summary(page).getByRole('button', { name: 'Aplicar' }).click()
  await expect(summary(page).getByTestId('desconto')).toHaveText('(-) 0.238 ETH')
  await expect(summary(page).getByTestId('total')).toHaveText('2.158 ETH')

  await summary(page).getByRole('button', { name: 'Remover cupom KURIO10' }).click()
  await expect(summary(page).getByTestId('total')).toHaveText('2.396 ETH')
})

test('carrinho do visitante sobrevive ao refresh e vai para a conta ao entrar', async ({ page }) => {
  await addAsGuest(page, { ...EMERALD_50, quantity: 1 })
  await page.reload()
  await expect(cartRegion(page).getByText('Emerald Ape #042')).toBeVisible()

  await loginAs(page, ANA)
  await page.goto('/carrinho')
  await expect(cartRegion(page).getByText('Emerald Ape #042')).toBeVisible()
  // Itens que a ana já tinha continuam lá
  await expect(cartRegion(page).getByText('Violet Nomad #314')).toBeVisible()
})

test('carrinho é isolado por usuário', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/carrinho')
  await expect(cartRegion(page).getByText('Violet Nomad #314')).toBeVisible()
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).first().click()
  await loginAs(page, BRUNO)
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('contador do carrinho no cabeçalho e na barra inferior', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/')
  // ana começa com 5 unidades (1 + 2 + 2)
  await expect(page.getByRole('link', { name: 'Carrinho, 5 itens' }).first()).toBeVisible()
})
