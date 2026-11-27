import { expect, test, type Page } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { ANA, loginAs } from './support/auth.ts'

// Regressão visual das telas principais com dados estáveis: cenário sem latência, sem
// animações e sem movimento (carrossel parado). Os prints de referência ficam versionados
// em e2e/visual.spec.ts-snapshots/. Para atualizar após uma mudança visual intencional:
//   npx playwright test e2e/visual.spec.ts --update-snapshots
test.describe('regressão visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'tablet', 'baselines em desktop e mobile')
    await withScenario(page, { latency: 'none' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  // Elementos que variam entre execuções ou são ferramentas da demo
  const volatile = (page: Page) => [page.getByRole('button', { name: /^Cenários/ })]

  async function settle(page: Page) {
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('img:visible').first()).toBeVisible()
    // Rola a página inteira para as imagens "lazy" abaixo da dobra carregarem e volta ao topo
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
    })
    // Espera as imagens visíveis terminarem de carregar
    await page.waitForFunction(() =>
      [...document.images].filter((i) => i.getBoundingClientRect().height > 0).every((i) => i.complete),
    )
  }

  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: volatile(page), animations: 'disabled' })
  })

  test('detalhe', async ({ page }) => {
    await page.goto('/nft/nft-001')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, mask: volatile(page), animations: 'disabled' })
  })

  test('carrinho', async ({ page }) => {
    await loginAs(page, ANA)
    await page.goto('/carrinho')
    await expect(page.getByRole('region', { name: 'Itens do carrinho' })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: volatile(page), animations: 'disabled' })
  })

  test('pagamento', async ({ page }) => {
    await loginAs(page, ANA)
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: volatile(page), animations: 'disabled' })
  })
})
