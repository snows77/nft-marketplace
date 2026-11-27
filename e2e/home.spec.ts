import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'
import { cardLinks } from './support/catalog.ts'

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

const hero = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Destaques' })

test('hero mostra a chamada e EXPLORAR leva ao catálogo', async ({ page }) => {
  await page.goto('/')
  await expect(hero(page).getByRole('heading', { level: 1 })).toBeVisible()
  await hero(page).getByRole('link', { name: /EXPLORAR/ }).click()
  await expect(page).toHaveURL(/#catalogo$/)
})

test('bolinhas trocam o destaque', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(hero(page).getByRole('group', { name: '1 de 3' })).toBeVisible()
  await hero(page).getByRole('button', { name: 'Ir para o destaque 2' }).click()
  await expect(hero(page).getByRole('group', { name: '2 de 3' })).toBeVisible()
  await expect(hero(page).getByRole('button', { name: 'Ir para o destaque 2' })).toHaveAttribute('aria-current', 'true')
})

test('com movimento reduzido o carrossel não troca sozinho', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(hero(page).getByRole('group', { name: '1 de 3' })).toBeVisible()
  await page.waitForTimeout(7000)
  await expect(hero(page).getByRole('group', { name: '1 de 3' })).toBeVisible()
})

test('sem movimento reduzido o carrossel avança sozinho', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(hero(page).getByRole('group', { name: '1 de 3' })).toBeVisible()
  await expect(hero(page).getByRole('group', { name: '2 de 3' })).toBeVisible({ timeout: 9000 })
})

test('card do catálogo leva ao NFT', async ({ page }) => {
  await page.goto('/')
  await expect(cardLinks(page).first()).toHaveAttribute('href', '/nft/nft-001')
})

test('nft em destaque aparece no desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'card fica na barra lateral do desktop')
  await page.goto('/')
  const featured = page.getByRole('complementary', { name: 'NFT em destaque' })
  await expect(featured.getByText('OFERTA LIMITADA')).toBeVisible()
  await expect(featured.getByRole('link')).toHaveAttribute('href', /\/nft\/nft-\d+/)
})

test('newsletter valida o e-mail e não finge inscrever', async ({ page }) => {
  await page.goto('/')
  const form = page.getByRole('form', { name: 'Newsletter' })
  await form.getByRole('textbox', { name: 'E-mail para novidades' }).fill('nao-e-email')
  await form.getByRole('button', { name: 'Enviar' }).click()
  await expect(form.getByRole('textbox', { name: 'E-mail para novidades' })).toHaveAccessibleDescription(
    'Informe um e-mail válido.',
  )
  await form.getByRole('textbox', { name: 'E-mail para novidades' }).fill('eu@exemplo.com')
  await form.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
})

test('diário da cunhagem: ler mais avisa que é fora da demo', async ({ page }) => {
  await page.goto('/')
  const journal = page.getByRole('region', { name: 'Diário da Cunhagem' })
  await expect(journal.getByRole('article')).toHaveCount(4)
  await journal.getByRole('button', { name: /Ler mais/ }).first().click()
  await expect(page.getByText('Esta seção não faz parte da demonstração.')).toBeVisible()
})
