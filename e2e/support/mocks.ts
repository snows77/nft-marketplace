import type { Page } from '@playwright/test'
import type { Scenario } from '../../src/mocks/scenario.ts'

const SCENARIO_KEY = 'kurio:mock-scenario'

// Grava o cenário antes de a página carregar, para que já a primeira requisição o use
export async function withScenario(page: Page, partial: Partial<Scenario>) {
  await page.addInitScript(
    ([key, value]) => {
      // Só na primeira carga da aba; reloads do próprio teste mantêm o que o app salvou
      if (!sessionStorage.getItem('kurio:e2e-scenario-set')) {
        localStorage.setItem(key, value)
        sessionStorage.setItem('kurio:e2e-scenario-set', '1')
      }
    },
    [SCENARIO_KEY, JSON.stringify({ preset: 'padrao', latency: 'none', seed: 1, failures: [], ...partial })],
  )
}

// Acesso ao controle dos mocks exposto pelo app (window.__kurioMocks)
export function mocks(page: Page) {
  return {
    failNext: (method: string, path: string, kind: string, times = 1) =>
      page.evaluate(
        ([m, p, k, t]) => window.__kurioMocks!.failNext(m, p, k as never, t),
        [method, path, kind, times] as const,
      ),
    reset: () => page.evaluate(() => window.__kurioMocks!.reset()),
  }
}
