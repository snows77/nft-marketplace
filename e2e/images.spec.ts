import { expect, test } from '@playwright/test'

test('as imagens dos cards carregam', async ({ page }) => {
  await page.goto('/')
  const img = page.getByRole('region', { name: 'Catálogo' }).getByRole('img').first()
  await expect(img).toBeVisible()

  // naturalWidth > 0 só acontece se o arquivo foi baixado e decodificado
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
    .toBeGreaterThan(0)

  await expect(img).toHaveAttribute('srcset', /-480\.webp 480w/)
})

test.describe('celular com tela de alta densidade', () => {
  test.use({ deviceScaleFactor: 3 })

  test('baixa a versão pequena da imagem', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'cenário de celular')
    await page.goto('/')
    const img = page.getByRole('region', { name: 'Catálogo' }).getByRole('img').first()
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc))
      .toMatch(/-480\.webp$/)
  })
})
