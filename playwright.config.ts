import { defineConfig, devices } from '@playwright/test'

// E2E_PORT permite rodar duas cópias do projeto em paralelo (ex.: worktrees)
const PORT = Number(process.env.E2E_PORT ?? 5174)
// E2E_BASE_URL testa um app já no ar (build local com preview ou a URL publicada);
// nesse caso o Playwright não sobe o servidor de desenvolvimento
const EXTERNAL_URL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // 10s (padrão 5s): com a máquina ocupada (dois servidores/navegadores) a primeira
  // renderização às vezes passava de 5s; em condição normal nada fica mais lento
  expect: { timeout: 10_000 },
  use: {
    baseURL: EXTERNAL_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // 768px: ponto em que o cabeçalho aparece e a barra inferior some
      name: 'tablet',
      testMatch: /(layout|catalog|home)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  // Sobe o app com os mocks (MSW) ligados, numa porta só dos testes
  webServer: EXTERNAL_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
      },
})
