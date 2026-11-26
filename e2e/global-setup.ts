import { chromium, type FullConfig } from '@playwright/test'

// Aquece o dev server antes dos testes: na primeira visita o Vite pré-empacota as
// dependências e transforma os módulos, o que pode levar vários segundos. Sem isso,
// o primeiro teste de cada worker pagava esse custo e estourava os timeouts.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(baseURL)
  await page.getByRole('link', { name: 'Pular para o conteúdo' }).waitFor({
    state: 'attached',
    timeout: 60_000,
  })
  await browser.close()
}
