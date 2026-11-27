import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, BRUNO, authDialog, loginAs, submitLogin } from './support/auth.ts'

// ana começa com 3 itens no carrinho (Violet Nomad 1/1, Ivory Baron 1/10 x2, Golden Beat 1/50 x2)
const checkout = (page: Page) => page.getByRole('main')

async function goToReview(page: Page) {
  await page.goto('/checkout')
  await expect(checkout(page).getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await checkout(page).getByRole('radio', { name: /Reserva/ }).check()
  await checkout(page).getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(checkout(page).getByText('Carteira conectada')).toBeVisible()
  await checkout(page).getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(checkout(page).getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
}

async function ordersCount(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}` } })
    return (await res.json()).items.length as number
  })
}

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none', paymentDelayMs: 800 })
})

test('checkout exige login e volta para ele', async ({ page }) => {
  await page.goto('/checkout')
  await expect(authDialog(page)).toBeVisible()
  await submitLogin(page, ANA.email, ANA.password)
  await expect(checkout(page).getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
})

test('compra completa até o recibo confirmado', async ({ page }) => {
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(checkout(page).getByText('Aguardando confirmação na rede')).toBeVisible()
  await expect(page).toHaveURL(/\/pedidos\/pedido-/, { timeout: 15_000 })
  const receipt = checkout(page)
  await expect(receipt.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
  await expect(receipt.getByText('Violet Nomad #314')).toBeVisible()
  await expect(receipt.getByTestId('recibo-total')).toHaveText('6.966 ETH')
  await expect(receipt.getByRole('link', { name: /Ver no/ })).toHaveAttribute('href', /polygonscan\.com\/tx\/0x/)
  // Itens comprados saem do carrinho
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('validação dos dados do colecionador', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/checkout')
  // "Revisar pedido" só habilita com a carteira conectada
  await checkout(page).getByRole('radio', { name: /Reserva/ }).check()
  await checkout(page).getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(checkout(page).getByText('Carteira conectada')).toBeVisible()
  const email = checkout(page).getByLabel('E-mail')
  await email.fill('nao-e-email')
  await checkout(page).getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
})

test('carteira recusa a conexão', async ({ page }) => {
  await withScenario(page, { latency: 'none', walletOutcome: 'recusar' })
  await loginAs(page, ANA)
  await page.goto('/checkout')
  await checkout(page).getByRole('radio', { name: /Reserva/ }).check()
  await checkout(page).getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(checkout(page).getByRole('alert')).toContainText('A carteira recusou a conexão')
  await expect(checkout(page).getByRole('button', { name: 'Revisar pedido' })).toBeDisabled()
})

test('pagamento recusado preserva o carrinho', async ({ page }) => {
  await withScenario(page, { latency: 'none', paymentDelayMs: 500, paymentOutcome: 'recusar' })
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(checkout(page).getByRole('alert')).toContainText('O pagamento foi recusado', { timeout: 15_000 })
  await page.goto('/carrinho')
  await expect(page.getByText('Violet Nomad #314')).toBeVisible()
})

test('clique repetido cria um único pedido', async ({ page }) => {
  await loginAs(page, ANA)
  await goToReview(page)
  const confirm = checkout(page).getByRole('button', { name: 'Confirmar compra' })
  await confirm.dblclick()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
  expect(await ordersCount(page)).toBe(1)
})

test('timeout após criar o pedido recupera o mesmo pedido', async ({ page }) => {
  test.setTimeout(60_000)
  await withScenario(page, {
    latency: 'none',
    paymentDelayMs: 500,
    failures: [{ method: 'POST', path: '/api/orders', kind: 'timeout-apos-criar', times: 1 }],
  })
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 30_000 })
  expect(await ordersCount(page)).toBe(1)
})

test('mudança no carrinho depois da revisão exige nova confirmação', async ({ page }) => {
  await loginAs(page, ANA)
  await goToReview(page)
  // Outro dispositivo/aba muda o carrinho depois da revisão
  await page.evaluate(async () => {
    const token = localStorage.getItem('kurio:session-token')
    await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nftId: 'nft-001', editionId: 'nft-001-1of50', quantity: 1 }),
    })
  })
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(checkout(page).getByRole('alert')).toContainText('Revise e confirme novamente')
  await expect(checkout(page).getByText('Emerald Ape #042')).toBeVisible()
  expect(await ordersCount(page)).toBe(0)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
})

test('pedido pendente é recuperado após recarregar', async ({ page }) => {
  test.setTimeout(60_000)
  // 8 s pendente: com a suíte inteira rodando, o recarregamento às vezes passava de 4 s
  await withScenario(page, { latency: 'none', paymentDelayMs: 8000 })
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(checkout(page).getByText('Aguardando confirmação na rede')).toBeVisible()
  await page.reload()
  await expect(checkout(page).getByText('Aguardando confirmação na rede')).toBeVisible()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 30_000 })
  expect(await ordersCount(page)).toBe(1)
})

test('recibo de outro usuário não é exibido', async ({ page }) => {
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
  const receiptUrl = page.url()
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).first().click()
  await loginAs(page, BRUNO)
  await page.goto(receiptUrl)
  await expect(page.getByText('Pedido não encontrado.')).toBeVisible()
})

test('mesma chave com outro conteúdo é recusada (409 IDEMPOTENCY_CONFLICT)', async ({ page }) => {
  await loginAs(page, ANA)
  await expect(page.locator('html[data-mocks="ready"]')).toBeAttached()
  const result = await page.evaluate(async () => {
    const headers = (key: string) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
      'Idempotency-Key': key,
    })
    const quote = await (await fetch('/api/checkout/quote', { method: 'POST', headers: headers('-') })).json()
    const body = (note: string) =>
      JSON.stringify({
        quoteId: quote.id,
        buyer: { displayName: 'Ana', username: 'ana', email: 'ana@kurio.dev', note },
        payment: { walletSlot: 'principal', network: 'polygon', provider: 'metamask' },
      })
    const first = await fetch('/api/orders', { method: 'POST', headers: headers('chave-1'), body: body('a') })
    const again = await fetch('/api/orders', { method: 'POST', headers: headers('chave-1'), body: body('a') })
    const other = await fetch('/api/orders', { method: 'POST', headers: headers('chave-1'), body: body('b') })
    return {
      first: first.status,
      sameId: (await first.clone().json()).id === (await again.json()).id,
      other: other.status,
      otherCode: (await other.json()).code,
    }
  })
  expect(result.first).toBe(201)
  expect(result.sameId).toBe(true)
  expect(result.other).toBe(409)
  expect(result.otherCode).toBe('IDEMPOTENCY_CONFLICT')
})

test('com um pedido pendente, outra aba retoma o mesmo pedido em vez de criar outro', async ({ page, context }) => {
  // Pagamento longo: a segunda aba precisa encontrar o pedido ainda pendente
  await withScenario(page, { latency: 'none', paymentDelayMs: 30_000 })
  await loginAs(page, ANA)
  await goToReview(page)
  await checkout(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(checkout(page).getByText('Aguardando confirmação na rede')).toBeVisible()

  // Outra aba (sessionStorage vazio): tenta revisar de novo
  const other = await context.newPage()
  await goToReviewOrPending(other)
  await expect(checkout(other).getByText('Aguardando confirmação na rede')).toBeVisible()
  expect(await ordersCount(other)).toBe(1)
})

async function goToReviewOrPending(page: Page) {
  await page.goto('/checkout')
  await expect(checkout(page).getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await checkout(page).getByRole('radio', { name: /Reserva/ }).check()
  await checkout(page).getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(checkout(page).getByText('Carteira conectada')).toBeVisible()
  await checkout(page).getByRole('button', { name: 'Revisar pedido' }).click()
}
