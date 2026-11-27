import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, loginAs } from './support/auth.ts'
import { cartRegion, summary } from './support/cart.ts'
import { catalog } from './support/catalog.ts'
import { realtime, waitConnected } from './support/realtime.ts'

// Carrinho semeado da Ana: nft-005 (Violet Nomad), nft-006 (Ivory Baron, 2 × 1.79) e nft-007 (Golden Beat)
const IVORY = 'Ivory Baron #088'
const GOLDEN = 'Golden Beat #207'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

const row = (page: Page, title: string) => cartRegion(page).getByRole('listitem').filter({ hasText: title })
const toasts = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text })

async function openCartAsAna(page: Page) {
  await loginAs(page, ANA)
  await page.goto('/carrinho')
  await expect(row(page, IVORY)).toBeVisible()
  await waitConnected(page, 'user-ana')
}

test('preço alterado de um item do carrinho chega pelo socket e atualiza o resumo', async ({ page }) => {
  await openCartAsAna(page)
  const total = summary(page).getByTestId('total')
  const before = await total.textContent()

  await realtime(page).updateNft('nft-006', { priceEth: '1.99' })

  await expect(row(page, IVORY)).toContainText('Preço atualizado: de 1.79 ETH para 1.99 ETH')
  await expect(total).not.toHaveText(before!)
  // 2 × 0.20 a mais no subtotal
  await expect(summary(page).getByTestId('subtotal')).toHaveText(/ETH/)
  await expect(toasts(page, 'Ivory Baron')).toHaveCount(1)
})

test('preço no detalhe e no catálogo acompanha o evento', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await expect(page.getByTestId('detail-price')).toHaveText('1.19 ETH')
  await waitConnected(page)
  await realtime(page).updateNft('nft-001', { priceEth: '1.55' })
  await expect(page.getByTestId('detail-price')).toHaveText('1.55 ETH')

  await page.goto('/')
  const firstCard = catalog(page).getByRole('list', { name: 'NFTs' }).getByRole('listitem').first()
  await expect(firstCard).toBeVisible()
  const href = await firstCard.getByRole('link').first().getAttribute('href')
  const nftId = href!.split('/').pop()!
  await waitConnected(page)
  await realtime(page).updateNft(nftId, { priceEth: '7.77' })
  await expect(firstCard.getByTestId('nft-price')).toHaveText('7.77 ETH')
})

test('edição esgotada bloqueia a finalização com a cotação desatualizada', async ({ page }) => {
  await openCartAsAna(page)
  const checkout = summary(page).getByRole('link', { name: 'Conectar e finalizar' })
  await expect(checkout).not.toHaveAttribute('aria-disabled', 'true')

  await realtime(page).updateNft('nft-007', { editions: [{ id: 'nft-007-1of50', available: 0 }] })

  await expect(row(page, GOLDEN)).toContainText('Esta edição esgotou')
  await expect(checkout).toHaveAttribute('aria-disabled', 'true')
  await expect(toasts(page, 'Golden Beat')).toHaveCount(1)
})

test('evento duplicado é aplicado uma vez e evento antigo não regride o preço', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/nft/nft-006')
  await expect(page.getByTestId('detail-price')).toHaveText('1.79 ETH')
  await waitConnected(page, 'user-ana')
  const rt = realtime(page)

  const event = await rt.updateNft('nft-006', { priceEth: '2.49' })
  await expect(page.getByTestId('detail-price')).toHaveText('2.49 ETH')

  // O mesmo evento de novo (mesmo eventId) e um evento mais antigo (versão anterior)
  await rt.emitRaw('nft.updated', event)
  await rt.emitRaw('nft.updated', {
    ...event,
    eventId: 'evt-antigo',
    version: event.version - 1,
    priceEth: '0.10',
  })
  await expect.poll(async () => (await rt.stats()).ignored).toMatchObject({ duplicate: 1, stale: 1 })

  await expect(page.getByTestId('detail-price')).toHaveText('2.49 ETH')
  await expect(toasts(page, 'Ivory Baron')).toHaveCount(1)
})

test('mudança durante a queda da conexão é reconciliada com a API ao reconectar', async ({ page }) => {
  await openCartAsAna(page)
  const rt = realtime(page)

  await rt.disconnect()
  await expect.poll(async () => (await rt.stats()).status).toBe('desconectado')
  await rt.updateNft('nft-006', { priceEth: '2.29' })
  // Sem conexão, nada chega
  await page.waitForTimeout(500)
  await expect(row(page, IVORY)).not.toContainText('Preço atualizado')

  await rt.reconnect()
  await waitConnected(page, 'user-ana')
  await expect(row(page, IVORY)).toContainText('Preço atualizado: de 1.79 ETH para 2.29 ETH')
})

test('evento de pedido de outro usuário é ignorado; após sair, o socket não recebe mais os da Ana', async ({ page }) => {
  await openCartAsAna(page)
  const rt = realtime(page)
  const order = (userId: string, eventId: string) => ({
    eventId,
    orderId: 'order-1',
    userId,
    version: 1,
    status: 'confirmado',
    occurredAt: new Date().toISOString(),
  })

  await rt.emitRaw('order.updated', order('user-bruno', 'evt-bruno'))
  await rt.emitRaw('order.updated', order('user-ana', 'evt-ana'))
  await expect.poll(async () => (await rt.stats()).ignored.otherUser).toBe(1)
  await expect.poll(async () => (await rt.stats()).applied['order.updated'] ?? 0).toBe(1)

  // O servidor entrega eventos do usuário só aos sockets dele
  expect(await rt.emitToUser('user-ana', 'order.updated', order('user-ana', 'evt-ana-2'))).toBe(1)

  // Sair troca o socket: o novo é anônimo e não recebe eventos da Ana
  await page.goto('/perfil')
  await waitConnected(page, 'user-ana')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await waitConnected(page, null)
  expect(await rt.emitToUser('user-ana', 'order.updated', order('user-ana', 'evt-ana-3'))).toBe(0)
})

// ---- Checkout (§7): cotação desatualizada e pedido pendente com queda de conexão ----

const main = (page: Page) => page.getByRole('main')

async function goToReview(page: Page) {
  await page.goto('/checkout')
  await expect(main(page).getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await waitConnected(page, 'user-ana')
  await main(page).getByRole('radio', { name: /Reserva/ }).check()
  await main(page).getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(main(page).getByText('Carteira conectada')).toBeVisible()
  await main(page).getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(main(page).getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
}

function ordersCount(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}` },
    })
    return (await res.json()).items.length as number
  })
}

test('carrinho → preço muda pelo socket → checkout recusa a cotação desatualizada', async ({ page }) => {
  await withScenario(page, { latency: 'none', paymentDelayMs: 500 })
  // 1–3: item no carrinho, preço muda durante a navegação, a interface avisa e o resumo muda
  await openCartAsAna(page)
  const total = summary(page).getByTestId('total')
  const before = await total.textContent()
  await realtime(page).updateNft('nft-006', { priceEth: '1.99' })
  await expect(row(page, IVORY)).toContainText('Preço atualizado: de 1.79 ETH para 1.99 ETH')
  await expect(total).not.toHaveText(before!)

  // 4: revisão feita, o preço muda de novo → aviso na hora e a confirmação é recusada
  await goToReview(page)
  await expect(main(page).getByText('Ivory Baron #088')).toBeVisible()
  await realtime(page).updateNft('nft-006', { priceEth: '2.09' })
  await expect(main(page).getByRole('alert')).toContainText('Ivory Baron mudou. Revise e confirme novamente')
  await main(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(main(page).getByRole('alert')).toContainText('Revise e confirme novamente')
  expect(await ordersCount(page)).toBe(0)

  // Com a cotação nova (devolvida pela API), a confirmação passa
  await main(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
  expect(await ordersCount(page)).toBe(1)
})

test('order.updated chega pelo socket e a liquidação emite a nova disponibilidade', async ({ page }) => {
  await withScenario(page, { latency: 'none', paymentDelayMs: 1500 })
  await loginAs(page, ANA)
  await goToReview(page)
  await main(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
  const stats = await realtime(page).stats()
  expect(stats.received['order.updated']).toBe(1)
  // Violet Nomad, Ivory Baron e Golden Beat tiveram a disponibilidade reduzida
  expect(stats.received['nft.updated']).toBe(3)
  // A queda de estoque causada pela própria compra não vira aviso de "esgotou"
  await expect(toasts(page, 'esgotou')).toHaveCount(0)
})

test('queda da conexão com pedido pendente: ao reconectar/recarregar recupera o mesmo pedido', async ({ page }) => {
  test.setTimeout(60_000)
  // Pendente por tempo suficiente para recarregar a página antes da liquidação, mesmo com a máquina ocupada
  await withScenario(page, { latency: 'none', paymentDelayMs: 8000 })
  await loginAs(page, ANA)
  await goToReview(page)
  await main(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(main(page).getByText('Aguardando confirmação na rede')).toBeVisible()

  await realtime(page).disconnect()
  await page.reload()
  await expect(main(page).getByText('Aguardando confirmação na rede')).toBeVisible()
  // O servidor simulado da nova página começa no ar: derruba de novo e religa
  await realtime(page).disconnect()
  await realtime(page).reconnect()
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 30_000 })
  await expect(main(page).getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
  expect(await ordersCount(page)).toBe(1)
})

test('painel de cenários: alterar preço, esgotar e derrubar/reconectar', async ({ page }) => {
  await openCartAsAna(page)
  await page.getByRole('button', { name: 'Cenários' }).click()
  const panel = page.getByRole('region', { name: 'Cenários da API simulada' })
  await expect(panel.getByText('Tempo real: conectado')).toBeVisible()

  await panel.getByRole('button', { name: 'Alterar preço de um NFT do carrinho' }).click()
  await expect(row(page, 'Violet Nomad #314')).toContainText('Preço atualizado: de 1.39 ETH para 1.529 ETH')

  await panel.getByRole('button', { name: 'Derrubar conexão em tempo real' }).click()
  await expect(panel.getByText('Tempo real: desconectado')).toBeVisible()
  await panel.getByRole('button', { name: 'Esgotar edição de um NFT do carrinho' }).click()
  await panel.getByRole('button', { name: 'Reconectar' }).click()
  await expect(panel.getByText('Tempo real: conectado')).toBeVisible()
  await expect(row(page, 'Violet Nomad #314')).toContainText('Esta edição esgotou')
})
