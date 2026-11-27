import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'

// Chamada feita de dentro da página para passar pelo MSW
function call(page: Page, method: string, path: string, opts: { body?: unknown; token?: string; cartId?: string } = {}) {
  return page.evaluate(
    async ({ method, path, opts }) => {
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
          ...(opts.cartId ? { 'X-Cart-Id': opts.cartId } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      })
      const text = await res.text()
      return { status: res.status, body: text ? JSON.parse(text) : null }
    },
    { method, path, opts },
  )
}

async function guestCart(page: Page) {
  const res = await call(page, 'GET', '/api/cart')
  expect(res.status).toBe(200)
  return res.body.id as string
}

// nft-001 = Emerald Ape #042, 1.19 ETH; edições: 1/1 (esgotada), 1/10 (0 disp.), 1/50 (5 disp.), ABERTA (99)
const EMERALD_50 = { nftId: 'nft-001', editionId: 'nft-001-1of50' }

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeAttached()
})

test('visitante adiciona, soma e calcula os totais', async ({ page }) => {
  const cartId = await guestCart(page)
  await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 1 } })
  const res = await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 2 } })
  expect(res.status).toBe(200)
  expect(res.body.items).toHaveLength(1)
  expect(res.body.items[0]).toMatchObject({ quantity: 3, unitPriceEth: '1.19', lineTotalEth: '3.57' })
  expect(res.body).toMatchObject({ subtotalEth: '3.57', discountEth: '0', networkFeeEth: '0.016', totalEth: '3.586', itemCount: 3 })
})

test('quantidade acima do disponível devolve 409 OUT_OF_STOCK', async ({ page }) => {
  const cartId = await guestCart(page)
  const res = await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 6 } })
  expect(res.status).toBe(409)
  expect(res.body).toMatchObject({ code: 'OUT_OF_STOCK', message: 'Só há 5 disponíveis desta edição.' })
})

test('edição esgotada não pode ser adicionada', async ({ page }) => {
  const cartId = await guestCart(page)
  const res = await call(page, 'POST', '/api/cart/items', {
    cartId,
    body: { nftId: 'nft-001', editionId: 'nft-001-1of1', quantity: 1 },
  })
  expect(res.status).toBe(409)
  expect(res.body.code).toBe('OUT_OF_STOCK')
})

test('alterar quantidade e remover item', async ({ page }) => {
  const cartId = await guestCart(page)
  const added = await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 1 } })
  const itemId = added.body.items[0].id
  const changed = await call(page, 'PATCH', `/api/cart/items/${itemId}`, { cartId, body: { quantity: 4 } })
  expect(changed.body.items[0].quantity).toBe(4)
  const removed = await call(page, 'DELETE', `/api/cart/items/${itemId}`, { cartId })
  expect(removed.body.items).toHaveLength(0)
  expect(removed.body).toMatchObject({ subtotalEth: '0', networkFeeEth: '0', totalEth: '0', itemCount: 0 })
})

test('cupons: válido, inválido, expirado e remoção', async ({ page }) => {
  const cartId = await guestCart(page)
  await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 2 } })
  const ok = await call(page, 'PUT', '/api/cart/coupon', { cartId, body: { code: 'kurio10' } })
  expect(ok.status).toBe(200)
  // 2.38 - 10% (0.238) + 0.016 = 2.158
  expect(ok.body).toMatchObject({ coupon: { code: 'KURIO10', discountPercent: 10 }, discountEth: '0.238', totalEth: '2.158' })

  const invalid = await call(page, 'PUT', '/api/cart/coupon', { cartId, body: { code: 'NAOEXISTE' } })
  expect(invalid.status).toBe(400)
  expect(invalid.body.fieldErrors.code).toEqual(['Cupom inválido.'])

  const expired = await call(page, 'PUT', '/api/cart/coupon', { cartId, body: { code: 'GENESIS2025' } })
  expect(expired.body.fieldErrors.code).toEqual(['Cupom expirado.'])

  const removed = await call(page, 'DELETE', '/api/cart/coupon', { cartId })
  expect(removed.body).toMatchObject({ coupon: null, discountEth: '0', totalEth: '2.396' })
})

test('login mescla o carrinho do visitante e isola por usuário', async ({ page }) => {
  const cartId = await guestCart(page)
  await call(page, 'POST', '/api/cart/items', { cartId, body: { ...EMERALD_50, quantity: 1 } })

  const ana = await call(page, 'POST', '/api/auth/login', { body: { email: 'ana@kurio.dev', password: 'Kurio@123' } })
  const before = await call(page, 'GET', '/api/cart', { token: ana.body.token })
  const merged = await call(page, 'POST', '/api/cart/merge', { token: ana.body.token, body: { guestCartId: cartId } })
  expect(merged.status).toBe(200)
  expect(merged.body.itemCount).toBe(before.body.itemCount + 1)

  const bruno = await call(page, 'POST', '/api/auth/login', { body: { email: 'bruno@kurio.dev', password: 'Kurio@123' } })
  const brunoCart = await call(page, 'GET', '/api/cart', { token: bruno.body.token })
  expect(brunoCart.body.id).not.toBe(merged.body.id)
  expect(brunoCart.body.items.some((i: { nftId: string }) => i.nftId === 'nft-001')).toBe(false)
})
