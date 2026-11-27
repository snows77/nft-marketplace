import { expect, type Page, type TestInfo } from '@playwright/test'

export const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo' })

export const resultSummary = (page: Page) => catalog(page).getByRole('status').filter({ hasText: /NFTs? encontrados?/ })

export const cardLinks = (page: Page) => catalog(page).getByRole('list', { name: 'NFTs' }).getByRole('link')

// Abaixo de 1024px (celular e tablet) os filtros ficam numa gaveta; acima, na barra lateral
export async function withFilters(page: Page, _testInfo: TestInfo, action: (filters: ReturnType<Page['getByRole']>) => Promise<void>) {
  const sidebar = page.getByRole('complementary', { name: 'Filtros' })
  if (!(await sidebar.isVisible())) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    await action(drawer)
    await drawer.getByRole('button', { name: /^Ver \d+ resultados?$/ }).click()
    await expect(drawer).toBeHidden()
  } else {
    await action(sidebar)
  }
}

export async function prices(page: Page): Promise<number[]> {
  const texts = await catalog(page).getByTestId('nft-price').allTextContents()
  return texts.map((text) => Number.parseFloat(text))
}
