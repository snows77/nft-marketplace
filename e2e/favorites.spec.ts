import { expect, test, type Page } from '@playwright/test'
import { mocks, withScenario } from './support/mocks.ts'
import { ANA, BRUNO, authDialog, loginAs } from './support/auth.ts'
import { catalog } from './support/catalog.ts'

// Fluxos longos (login + várias navegações): com a máquina ocupada passavam de 30s
test.describe.configure({ timeout: 60_000 })

test.beforeEach(async ({ page }) => {
  await withScenario(page, { latency: 'none' })
})

// O detalhe (article) tem o seu coração; os cards de "Mais desta coleção" têm os deles
const detail = (page: Page) => page.getByRole('article', { name: 'Emerald Ape #042' })
const addButton = (page: Page) => detail(page).getByRole('button', { name: 'Adicionar aos favoritos' })
const removeButton = (page: Page) => detail(page).getByRole('button', { name: 'Remover dos favoritos' })
const favoritesList = (page: Page) => page.getByRole('list', { name: 'NFTs' })

async function openDetail(page: Page) {
  await page.goto('/nft/nft-001')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emerald Ape #042')
  await expect(addButton(page)).toBeEnabled()
}

test('visitante que clica no coração vê o login, sem favoritar', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await addButton(page).click()
  await expect(authDialog(page)).toBeVisible()
  await expect(page).toHaveURL(/\/nft\/nft-001\?.*auth=entrar/)
  await page.keyboard.press('Escape')
  await expect(authDialog(page)).toBeHidden()
  await expect(addButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('favorito persiste após recarregar e aparece em /favoritos', async ({ page }) => {
  await loginAs(page, ANA)
  await openDetail(page)
  await addButton(page).click()
  await expect(removeButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(removeButton(page)).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/favoritos')
  await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible()
  await expect(favoritesList(page).getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()

  // Desfavoritar pela própria lista remove o card
  await favoritesList(page).getByRole('button', { name: 'Remover dos favoritos' }).click()
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()
})

test('falha ao favoritar desfaz a mudança otimista e a nova tentativa funciona', async ({ page }) => {
  await loginAs(page, ANA)
  await openDetail(page)
  await mocks(page).failNext('PUT', '/api/favorites', 'http-500')
  await addButton(page).click()
  await expect(page.getByText('Não foi possível atualizar seus favoritos.')).toBeVisible()
  await expect(addButton(page)).toHaveAttribute('aria-pressed', 'false')

  await addButton(page).click()
  await expect(removeButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(removeButton(page)).toHaveAttribute('aria-pressed', 'true')
})

test('favoritos são de cada usuário', async ({ page }) => {
  await loginAs(page, ANA)
  await openDetail(page)
  await addButton(page).click()
  await expect(removeButton(page)).toBeVisible()

  await page.goto('/perfil')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
  await loginAs(page, BRUNO)
  await page.goto('/favoritos')
  await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible()
  await openDetail(page)
  await expect(addButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('coração do card no catálogo funciona pelo teclado', async ({ page }) => {
  await loginAs(page, ANA)
  await page.goto('/')
  const heart = catalog(page).getByRole('button', { name: 'Adicionar aos favoritos' }).first()
  await expect(heart).toBeEnabled()
  await heart.focus()
  await expect(heart).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(catalog(page).getByRole('button', { name: 'Remover dos favoritos' }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('/favoritos')
  await expect(favoritesList(page).getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
})

test('/favoritos exige login', async ({ page }) => {
  await page.goto('/favoritos')
  await expect(authDialog(page)).toBeVisible()
})
