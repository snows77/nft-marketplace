import { expect, test } from '@playwright/test'

test('foco do teclado é bem visível', async ({ page }) => {
  await page.goto('/')
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skipLink).toBeAttached()
  // Primeiro Tab cai no "pular conteúdo"; o segundo, no primeiro link da navegação
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!)
    return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor }
  })
  expect(outline.style).not.toBe('none')
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
  // Cor sólida (sem transparência): rgb(...) e não rgba(..., 0.5) / color-mix
  expect(outline.color).toMatch(/^rgb\(/)
})
