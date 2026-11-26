import { expect, test } from '@playwright/test'

test('a home lista NFTs', async ({ page }) => {
  await page.goto('/')
  const firstItem = page.getByRole('list').first().getByRole('listitem').first()
  await expect(firstItem).toBeVisible()
})
