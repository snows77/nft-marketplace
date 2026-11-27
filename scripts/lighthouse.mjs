// Auditoria Lighthouse do build de produção (com a API simulada ligada, como na demo).
// 3 medições por página e perfil; o resumo usa a MEDIANA de cada categoria e métrica.
//
// Uso: npm run build && npm run lighthouse
// Saída: reports/lighthouse/*.html|json e reports/lighthouse/summary.md
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'reports/lighthouse')
const PORT = 4173
const BASE = `http://localhost:${PORT}`
const RUNS = Number(process.env.LH_RUNS ?? 3) // LH_RUNS=1 para uma rodada rápida exploratória
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nft/nft-001' },
]
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = {
  LCP: 'largest-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`O preview não respondeu em ${url}`)
}

await mkdir(outDir, { recursive: true })
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  shell: true,
  stdio: 'ignore',
})

const results = []
let chromeVersion = ''
try {
  await waitForServer(BASE)
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const runs = []
      for (let i = 1; i <= RUNS; i++) {
        // Navegador novo a cada medição (cache frio, sem interferência entre execuções)
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--disable-gpu'] })
        try {
          const config = profile === 'desktop' ? desktopConfig : undefined
          const result = await lighthouse(
            `${BASE}${page.path}`,
            { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
            config,
          )
          const base = path.join(outDir, `${page.name}-${profile}-${i}`)
          await writeFile(`${base}.html`, result.report[0])
          await writeFile(`${base}.json`, result.report[1])
          chromeVersion = result.lhr.environment.hostUserAgent
          runs.push(result.lhr)
          console.log(`✓ ${page.name} ${profile} #${i}`)
        } finally {
          await chrome.kill()
        }
      }
      const scores = Object.fromEntries(
        CATEGORIES.map((c) => [c, median(runs.map((r) => Math.round((r.categories[c]?.score ?? 0) * 100)))]),
      )
      const metrics = Object.fromEntries(
        Object.entries(METRICS).map(([label, id]) => [label, median(runs.map((r) => r.audits[id].numericValue))]),
      )
      results.push({ page: page.name, profile, scores, metrics, all: runs.map((r) => CATEGORIES.map((c) => Math.round(r.categories[c].score * 100))) })
    }
  }
} finally {
  preview.kill()
}

const lhVersion = (await import('lighthouse/package.json', { with: { type: 'json' } })).default.version
const rows = results.map(
  (r) =>
    `| ${r.page} | ${r.profile} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${(r.metrics.LCP / 1000).toFixed(2)} s | ${r.metrics.CLS.toFixed(3)} | ${Math.round(r.metrics.TBT)} ms |`,
)
const summary = `# Auditoria Lighthouse

Gerado em ${new Date().toISOString()} por \`npm run lighthouse\` (build de produção servido com \`vite preview\`, API simulada ligada).

Mediana de ${RUNS} medições por página e perfil (navegador novo a cada medição).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

Metas do desafio: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Medições individuais (Perf / A11y / BP / SEO)
${results.map((r) => `- ${r.page} ${r.profile}: ${r.all.map((a) => a.join('/')).join(' · ')}`).join('\n')}

## Ambiente
- Lighthouse ${lhVersion}; chrome-launcher; ${chromeVersion}
- Node ${process.version}; ${os.type()} ${os.release()}; CPU ${os.cpus()[0]?.model} (${os.cpus().length} núcleos); RAM ${Math.round(os.totalmem() / 1024 ** 3)} GB
- Perfis: mobile = padrão do Lighthouse (Moto G Power emulado, 4G lento, CPU 4x); desktop = \`desktop-config\` do Lighthouse
`
await writeFile(path.join(outDir, 'summary.md'), summary)
console.log(`\n${summary}`)
