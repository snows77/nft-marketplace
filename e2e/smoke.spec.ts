import { expect, test } from '@playwright/test'

test('a home lista NFTs', async ({ page }) => {
  await page.goto('/')
  const catalog = page.getByRole('region', { name: 'Catálogo' })
  const firstItem = catalog.getByRole('list').first().getByRole('listitem').first()
  await expect(firstItem).toBeVisible()
})
