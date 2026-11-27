import { expect, type Page, type TestInfo } from '@playwright/test'

export const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo' })

export const resultSummary = (page: Page) => catalog(page).getByRole('status').filter({ hasText: /NFTs? encontrados?/ })

export const cardLinks = (page: Page) => catalog(page).getByRole('list', { name: 'NFTs' }).getByRole('link')

// No mobile os filtros ficam numa gaveta; no desktop, na barra lateral
export async function withFilters(page: Page, testInfo: TestInfo, action: (filters: ReturnType<Page['getByRole']>) => Promise<void>) {
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    await action(drawer)
    await drawer.getByRole('button', { name: /^Ver \d+ resultados?$/ }).click()
    await expect(drawer).toBeHidden()
  } else {
    await action(page.getByRole('complementary', { name: 'Filtros' }))
  }
}

export async function prices(page: Page): Promise<number[]> {
  const texts = await catalog(page).getByTestId('nft-price').allTextContents()
  return texts.map((text) => Number.parseFloat(text))
}
