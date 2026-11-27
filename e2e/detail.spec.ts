import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { cardLinks } from './support/catalog.ts'

// Cada teste define o próprio cenário: withScenario só vale na primeira chamada da aba
const fast = (page: Page) => withScenario(page, { latency: 'none' })

const title = (page: Page) => page.getByRole('heading', { level: 1 })
const editions = (page: Page) => page.getByRole('radiogroup', { name: 'Edição' })
const quantity = (page: Page) => page.getByTestId('detail-quantity')
const total = (page: Page) => page.getByTestId('detail-total')

test('acesso direto e refresh mostram o NFT', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  await expect(title(page)).toHaveText('Emerald Ape #042')
  await expect(page.getByText('Kurio Apes').first()).toBeVisible()
  await page.reload()
  await expect(title(page)).toHaveText('Emerald Ape #042')
  await expect(page).toHaveTitle(/Emerald Ape/)
})

test('clicar no card do catálogo abre o detalhe', async ({ page }) => {
  await fast(page)
  await page.goto('/')
  await cardLinks(page).first().click()
  await expect(page).toHaveURL(/\/nft\/nft-001$/)
  await expect(title(page)).toHaveText('Emerald Ape #042')
})

test('NFT inexistente mostra página amigável', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nao-existe')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page).toHaveURL(/\/(#catalogo)?$/)
})

test('edição esgotada fica desabilitada', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  const soldOut = editions(page).getByRole('radio', { name: '1/1, esgotada', exact: true })
  await expect(soldOut).toBeDisabled()
  await expect(editions(page)).toContainText('Esgotada')
  // A primeira edição disponível começa selecionada
  await expect(editions(page).getByRole('radio', { name: '1/50', exact: true })).toBeChecked()
})

test('quantidade respeita o disponível da edição e o preço acompanha', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  await expect(total(page)).toHaveText('1.19 ETH')
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  await plus.click()
  await plus.click()
  await expect(quantity(page)).toHaveText('3')
  await expect(total(page)).toHaveText('3.57 ETH') // 3 × 1.19 sem erro de ponto flutuante
  await plus.click()
  await plus.click()
  await expect(quantity(page)).toHaveText('5')
  await expect(plus).toBeDisabled() // 1/50 tem 5 disponíveis
  await expect(page.getByText('Máximo de 5 disponíveis nesta edição.')).toBeVisible()
  await page.getByRole('button', { name: 'Diminuir quantidade' }).click()
  await expect(quantity(page)).toHaveText('4')
  // Trocar de edição volta a quantidade para 1
  await editions(page).getByText('ABERTA').click()
  await expect(quantity(page)).toHaveText('1')
})

test('miniatura da galeria troca a imagem principal', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  const gallery = page.getByRole('region', { name: 'Galeria' })
  const main = gallery.getByTestId('gallery-main')
  const first = await main.getAttribute('src')
  const thumb = gallery.getByRole('button', { name: 'Ver imagem 2 de 4' })
  await thumb.click()
  await expect(thumb).toHaveAttribute('aria-pressed', 'true')
  await expect(main).not.toHaveAttribute('src', first!)
})

test('abas de detalhes e avaliações', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  await page.getByRole('tab', { name: /Avaliações de colecionadores/ }).click()
  await expect(page.getByRole('tabpanel')).toContainText('★')
  await page.getByRole('tab', { name: 'Detalhes do NFT' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('0x7A42...19E8')
})

test('mais desta coleção leva a outro NFT da mesma coleção', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  const more = page.getByRole('region', { name: 'Mais desta coleção' })
  const links = more.getByRole('link')
  await expect(links.first()).toBeVisible()
  expect(await links.count()).toBeGreaterThanOrEqual(4)
  await links.first().click()
  await expect(page).not.toHaveURL(/\/nft\/nft-001$/)
  await expect(page.getByText('Kurio Apes').first()).toBeVisible()
})

test('comprar leva ao carrinho com a edição e a quantidade escolhidas', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  await page.getByRole('radio', { name: '1/50' }).check()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  const item = page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })
  await expect(item).toContainText('Edição: 1/50')
  await expect(item.getByTestId('quantidade')).toHaveText('2')
})

test('ícone do carrinho adiciona e avisa; acima do estoque avisa o limite', async ({ page }) => {
  await fast(page)
  await page.goto('/nft/nft-001')
  await page.getByRole('radio', { name: '1/50' }).check()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()
  // As 5 unidades disponíveis já estão no carrinho: a próxima tentativa é recusada pela API
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Só há 5 disponíveis desta edição.')).toBeVisible()
})

test('falha ao carregar mostra erro e tentar de novo recupera', async ({ page }) => {
  await withScenario(page, {
    latency: 'none',
    failures: [{ method: 'GET', path: '/api/nfts/nft-001', kind: 'http-500', times: 3 }],
  })
  await page.goto('/nft/nft-001')
  await expect(page.getByText('Não foi possível carregar este NFT.')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(title(page)).toHaveText('Emerald Ape #042')
})

test('carregamento lento mostra skeleton do detalhe', async ({ page }) => {
  await withScenario(page, { latency: 'slow' })
  await page.goto('/nft/nft-001')
  await expect(page.getByRole('status', { name: 'Carregando NFT' })).toBeVisible()
  await expect(title(page)).toHaveText('Emerald Ape #042', { timeout: 15_000 })
})
