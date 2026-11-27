import { expect, test } from '@playwright/test'

test.describe('layout', () => {
  test('cabeçalho marca a página atual', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'cabeçalho só existe no desktop')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })

  test('barra inferior aparece só no mobile', async ({ page }, testInfo) => {
    await page.goto('/')
    const tabBar = page.getByRole('navigation', { name: 'Navegação inferior' })
    if (testInfo.project.name === 'mobile') {
      await expect(tabBar).toBeVisible()
    } else {
      await expect(tabBar).toBeHidden()
    }
  })

  test('seção fora do escopo avisa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'item existe no cabeçalho desktop')
    await page.goto('/')
    await page.getByRole('button', { name: 'Criadores' }).click()
    await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
  })

  test('rota inexistente mostra 404', async ({ page }) => {
    await page.goto('/nft/abc/xyz')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('rodapé visível e sem overflow horizontal', async ({ page }) => {
    await page.goto('/')
    // Espera o catálogo carregar: antes disso a página ainda vai crescer
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
    const footer = page.getByRole('contentinfo')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()
    const copyright = footer.getByText('© 2026 Kurio. Propriedade digital para todos.')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect(copyright).toBeInViewport()
    // No mobile, a barra inferior fixa (e o botão central, com anel de 8px) não pode cobrir o texto
    const explore = page.getByRole('link', { name: 'Explorar catálogo' })
    if (await explore.isVisible()) {
      const text = (await copyright.boundingBox())!
      const button = (await explore.boundingBox())!
      expect(text.y + text.height).toBeLessThanOrEqual(button.y - 8)
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('primeiro Tab foca o pular conteúdo', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
    // O app só renderiza depois que o MSW liga; Tab antes disso não tem onde cair
    await expect(skipLink).toBeAttached()
    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()
  })
})

test.describe('acessibilidade da navegação', () => {
  test('só um link é a página atual em cada navegação', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
    for (const name of ['Navegação principal', 'Navegação inferior']) {
      const nav = page.getByRole('navigation', { name })
      if (await nav.isVisible()) {
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
      }
    }
  })

  test('aviso (toast) não cobre a barra inferior no mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'barra inferior só existe no mobile')
    await page.goto('/')
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
    await page.getByRole('button', { name: /Ler mais/ }).first().click()
    const toast = page.getByText('Esta seção não faz parte da demonstração.')
    await expect(toast).toBeVisible()
    const toastBox = (await toast.boundingBox())!
    const barBox = (await page.getByRole('navigation', { name: 'Navegação inferior' }).boundingBox())!
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(barBox.y)
  })
})
