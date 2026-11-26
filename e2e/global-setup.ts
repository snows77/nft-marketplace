import { chromium, type FullConfig } from '@playwright/test'

// Aquece o dev server antes dos testes: na primeira visita o Vite pré-empacota as
// dependências e transforma os módulos, o que pode levar vários segundos. Sem isso,
// o primeiro teste de cada worker pagava esse custo e estourava os timeouts.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Guarda os erros da página para explicar a falha, se o app não carregar
  const problems: string[] = []
  page.on('pageerror', (err) => problems.push(`[erro na página] ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`[console] ${msg.text()}`)
  })
  page.on('requestfailed', (req) => problems.push(`[requisição falhou] ${req.url()} — ${req.failure()?.errorText}`))

  try {
    await page.goto(baseURL)
    await page.getByRole('link', { name: 'Pular para o conteúdo' }).waitFor({ state: 'attached', timeout: 60_000 })
  } catch (err) {
    const hints = [
      `O app em ${baseURL} não carregou. Erros capturados no navegador:`,
      ...(problems.length ? problems.map((p) => `  ${p}`) : ['  (nenhum erro capturado)']),
      '',
      'Causas comuns:',
      '  1. Dependências desatualizadas → rode: npm install',
      '  2. Servidor antigo ocupando a porta 5174 (o Playwright reaproveita) → feche-o',
      '     (PowerShell: netstat -ano | findstr ":5174"  e depois  taskkill /PID <pid> /F)',
      '  3. Cache do Vite corrompido → apague a pasta node_modules/.vite',
    ]
    throw new Error(`${hints.join('\n')}\n\n${(err as Error).message}`, { cause: err })
  } finally {
    await browser.close()
  }
}
