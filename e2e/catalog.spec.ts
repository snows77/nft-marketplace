import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { cardLinks, catalog, prices, resultSummary, withFilters } from './support/catalog.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

test('filtros combinados refletem na URL e na lista', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(cardLinks(page).first()).toBeVisible()
  await withFilters(page, testInfo, async (filters) => {
    await filters.getByRole('button', { name: /^Música/ }).click()
    await filters.getByRole('button', { name: /^Polygon/ }).click()
  })
  await expect(page).toHaveURL(/category=musica/)
  await expect(page).toHaveURL(/network=polygon/)
  const active = catalog(page).getByRole('list', { name: 'Filtros ativos' })
  await expect(active.getByText('Música')).toBeVisible()
  await expect(active.getByText('Polygon')).toBeVisible()
  await expect(resultSummary(page)).toHaveText(/^[1-9]\d* NFTs? encontrados?$/)
})

test('mudar filtro volta para a página 1', async ({ page }, testInfo) => {
  await page.goto('/?page=3')
  await expect(cardLinks(page).first()).toBeVisible()
  await withFilters(page, testInfo, async (filters) => {
    await filters.getByRole('button', { name: /^Ethereum/ }).click()
  })
  await expect(page).toHaveURL(/network=ethereum/)
  await expect(page).not.toHaveURL(/page=/)
})

test('voltar no histórico restaura os filtros', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(cardLinks(page).first()).toBeVisible()
  await withFilters(page, testInfo, async (filters) => {
    await filters.getByRole('button', { name: /^Fotografia/ }).click()
  })
  await withFilters(page, testInfo, async (filters) => {
    await filters.getByRole('button', { name: /^Solana/ }).click()
  })
  await expect(page).toHaveURL(/network=solana/)
  await page.goBack()
  await expect(page).not.toHaveURL(/network=/)
  await expect(page).toHaveURL(/category=fotografia/)
  const active = catalog(page).getByRole('list', { name: 'Filtros ativos' })
  await expect(active.getByText('Fotografia')).toBeVisible()
  await expect(active.getByText('Solana')).toHaveCount(0)
})

test('refresh mantém busca e ordenação', async ({ page }) => {
  await page.goto('/')
  await catalog(page).getByRole('searchbox', { name: 'Buscar NFTs' }).fill('golden')
  await catalog(page).getByRole('searchbox', { name: 'Buscar NFTs' }).press('Enter')
  await catalog(page).getByRole('combobox', { name: 'Ordenar por' }).selectOption('price-asc')
  await expect(page).toHaveURL(/q=golden/)
  await expect(page).toHaveURL(/sort=price-asc/)
  await page.reload()
  await expect(catalog(page).getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('golden')
  await expect(cardLinks(page).first()).toBeVisible()
  const values = await prices(page)
  expect(values.length).toBeGreaterThan(1)
  expect(values).toEqual([...values].sort((a, b) => a - b))
})

test('busca sem resultado mostra vazio e limpa', async ({ page }) => {
  await page.goto('/?q=zzzz')
  await expect(catalog(page).getByText('Nenhum NFT encontrado para estes filtros.')).toBeVisible()
  await catalog(page).getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await expect(cardLinks(page).first()).toBeVisible()
})

test('respostas fora de ordem mostram o último termo', async ({ page }) => {
  await withScenario(page, { latency: 'variable', seed: 7 })
  await page.goto('/')
  const search = catalog(page).getByRole('searchbox', { name: 'Buscar NFTs' })
  await search.fill('cosmic')
  await search.press('Enter')
  await search.fill('golden')
  await search.press('Enter')
  await expect(page).toHaveURL(/q=golden/)
  await expect(cardLinks(page).first()).toContainText('Golden', { timeout: 10_000 })
  // Espera eventuais respostas atrasadas de "cosmic" e confere que não sobrescreveram
  await page.waitForTimeout(1600)
  const names = await cardLinks(page).allTextContents()
  expect(names.length).toBeGreaterThan(0)
  for (const name of names) expect(name).toContain('Golden')
})

test('página inexistente oferece voltar', async ({ page }) => {
  await page.goto('/?page=99')
  await expect(catalog(page).getByText('Esta página não existe.')).toBeVisible()
  await catalog(page).getByRole('button', { name: 'Voltar à primeira página' }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(cardLinks(page).first()).toBeVisible()
})

test('faixa de preço filtra', async ({ page }) => {
  await page.goto('/?minPrice=1&maxPrice=2')
  await expect(cardLinks(page).first()).toBeVisible()
  for (const value of await prices(page)) {
    expect(value).toBeGreaterThanOrEqual(1)
    expect(value).toBeLessThanOrEqual(2)
  }
})

test('abas mudam a seção e a URL', async ({ page }) => {
  await page.goto('/')
  await catalog(page).getByRole('link', { name: 'Em alta' }).click()
  await expect(page).toHaveURL(/tab=trending/)
  await expect(catalog(page).getByRole('link', { name: 'Em alta' })).toHaveAttribute('aria-current', 'page')
})

test('paginação avança e mantém filtros', async ({ page }) => {
  await page.goto('/?network=ethereum')
  await expect(cardLinks(page).first()).toBeVisible()
  await catalog(page).getByRole('button', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page).toHaveURL(/network=ethereum/)
})
