import { resetDb, STORAGE_KEY as MOCK_DB_KEY } from './db'
import { applyPreset, getScenario, resetScenario, setScenario } from './scenario'

// Volta tudo a um estado conhecido: dados da demo, cenário e qualquer dado local do app
export function resetDemo(): void {
  resetDb()
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('kurio:') && key !== MOCK_DB_KEY) localStorage.removeItem(key)
    }
  } catch {
    // sem localStorage não há o que limpar
  }
  resetScenario()
  // Recarrega sem ?cenario= para o preset da URL não ser reaplicado
  const url = new URL(window.location.href)
  url.searchParams.delete('cenario')
  window.location.replace(url.toString())
}

// Controle dos mocks para demonstração e testes (Playwright usa window.__kurioMocks)
export function installMockControl(): void {
  window.__kurioMocks = {
    getScenario,
    setScenario,
    applyPreset,
    failNext: (method, path, kind, times = 1) =>
      setScenario({ failures: [...getScenario().failures, { method, path, kind, times }] }),
    reset: resetDemo,
  }
}
