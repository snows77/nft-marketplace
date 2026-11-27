import { expect, type Page } from '@playwright/test'

export const cartRegion = (page: Page) => page.getByRole('region', { name: 'Itens do carrinho' })
export const summary = (page: Page) => page.getByRole('complementary', { name: 'Resumo da carteira' })

// Adiciona um item ao carrinho do visitante pela API (o botão de compra vive no detalhe)
export async function addAsGuest(page: Page, item: { nftId: string; editionId: string; quantity: number }) {
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: /Carrinho/ }).first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio:cart-id'))).not.toBeNull()
  const status = await page.evaluate(async (body) => {
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cart-Id': localStorage.getItem('kurio:cart-id')! },
      body: JSON.stringify(body),
    })
    return res.status
  }, item)
  expect(status).toBe(200)
  await page.reload()
}

export const EMERALD_50 = { nftId: 'nft-001', editionId: 'nft-001-1of50' }
