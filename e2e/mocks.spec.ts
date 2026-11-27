import { expect, test } from '@playwright/test'
import { withScenario } from './support/mocks.ts'

const firstCard = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Catálogo' }).getByRole('listitem').first()

test('catálogo lento mostra skeleton e depois os NFTs', async ({ page }) => {
  await withScenario(page, { latency: 'slow' })
  await page.goto('/')
  const skeleton = page.getByRole('status', { name: 'Carregando NFTs' })
  await expect(skeleton).toBeVisible()
  // Sem lentidão a resposta chega em milissegundos; com "slow" o skeleton ainda está lá
  await page.waitForTimeout(1000)
  await expect(skeleton).toBeVisible()
  await expect(firstCard(page)).toBeVisible({ timeout: 10_000 })
})

test('falha 500 mostra erro e recupera ao tentar de novo', async ({ page }) => {
  // 3 = tentativa inicial + 2 retries automáticos
  await withScenario(page, {
    // '/api/nfts?' = só a listagem (não os destaques /api/nfts/featured)
    failures: [{ method: 'GET', path: '/api/nfts?', kind: 'http-500', times: 3 }],
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os NFTs.')
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(firstCard(page)).toBeVisible()
})

test('offline mostra erro', async ({ page }) => {
  await page.goto('/?cenario=offline')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os NFTs.')
})

test('painel indica cenário ativo', async ({ page }) => {
  await page.goto('/?cenario=lento')
  await expect(page.getByRole('button', { name: /Cenários.*lento/ })).toBeVisible()
})

test('reset restaura o cenário padrão', async ({ page }) => {
  await page.goto('/?cenario=lento')
  await page.getByRole('button', { name: /Cenários/ }).click()
  await page.getByRole('button', { name: 'Resetar dados da demo' }).click()
  await expect(page.getByRole('button', { name: 'Cenários' })).toBeVisible()
  await expect(firstCard(page)).toBeVisible()
})
