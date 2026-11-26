// Cenários de rede da API simulada: latência e falhas configuráveis e reproduzíveis.
// O estado fica no localStorage para sobreviver a refresh; ?cenario=<preset> na URL
// aplica um preset no carregamento (útil para demonstração e links compartilháveis).

export type LatencyMode = 'none' | 'normal' | 'slow' | 'variable'
export type FailureKind = 'http-500' | 'http-503' | 'network' | 'timeout'
export type PresetName = 'padrao' | 'lento' | 'instavel' | 'offline'

export interface FailureRule {
  method: string // 'GET', 'POST'... ou '*'
  path: string // prefixo: '/api/nfts' casa '/api/nfts?page=2' e '/api/nfts/nft-001'
  kind: FailureKind
  times: number // quantas requisições ainda falham; -1 = sempre
}

export interface Scenario {
  preset: PresetName
  latency: LatencyMode
  seed: number
  failures: FailureRule[]
}

// Contrato do controle exposto em window.__kurioMocks (demonstração e Playwright).
// Fica aqui, num arquivo sem imports, para os testes poderem usar o tipo.
export interface KurioMocks {
  getScenario: () => Scenario
  setScenario: (patch: Partial<Scenario>) => void
  applyPreset: (name: PresetName) => void
  failNext: (method: string, path: string, kind: FailureKind, times?: number) => void
  reset: () => void
}

declare global {
  interface Window {
    __kurioMocks?: KurioMocks
  }
}

export const PRESETS: Record<PresetName, { label: string; scenario: Omit<Scenario, 'preset'> }> = {
  padrao: { label: 'Padrão', scenario: { latency: 'normal', seed: 1, failures: [] } },
  lento: { label: 'Lento', scenario: { latency: 'slow', seed: 1, failures: [] } },
  instavel: { label: 'Latência variável', scenario: { latency: 'variable', seed: 1, failures: [] } },
  offline: {
    label: 'Sem conexão',
    scenario: {
      latency: 'none',
      seed: 1,
      failures: [{ method: '*', path: '/api/', kind: 'network', times: -1 }],
    },
  },
}

const STORAGE_KEY = 'kurio:mock-scenario'
const DEFAULT: Scenario = { preset: 'padrao', ...PRESETS.padrao.scenario }

let scenario: Scenario = load()
let requestCount = 0
const listeners = new Set<() => void>()

function load(): Scenario {
  const fromUrl = new URLSearchParams(window.location.search).get('cenario')
  if (fromUrl && fromUrl in PRESETS) {
    const preset = fromUrl as PresetName
    const value = { preset, ...structuredClone(PRESETS[preset].scenario) }
    persist(value)
    return value
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Scenario>) }
  } catch {
    // localStorage indisponível ou corrompido: usa o padrão
  }
  return structuredClone(DEFAULT)
}

function persist(value: Scenario) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // sem persistência o cenário vale só para esta aba
  }
}

function update(next: Scenario) {
  scenario = next
  requestCount = 0
  persist(scenario)
  listeners.forEach((listener) => listener())
}

export function getScenario(): Scenario {
  return scenario
}

export function setScenario(patch: Partial<Scenario>): void {
  update({ ...scenario, ...patch })
}

export function applyPreset(name: PresetName): void {
  update({ preset: name, ...structuredClone(PRESETS[name].scenario) })
}

export function resetScenario(): void {
  applyPreset('padrao')
}

export function subscribeScenario(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// PRNG determinístico: a mesma semente gera a mesma sequência de atrasos
function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nextDelay(): number {
  requestCount += 1
  switch (scenario.latency) {
    case 'none':
      return 0
    case 'normal':
      return 150
    case 'slow':
      return 2500
    case 'variable':
      return 100 + Math.round(mulberry32(scenario.seed + requestCount) * 1400)
  }
}

// Consome uma regra de falha que case com a requisição (se houver)
export function takeFailure(method: string, path: string): FailureKind | null {
  const index = scenario.failures.findIndex(
    (rule) =>
      (rule.method === '*' || rule.method.toUpperCase() === method.toUpperCase()) &&
      path.startsWith(rule.path) &&
      rule.times !== 0,
  )
  if (index === -1) return null

  const rule = scenario.failures[index]
  if (rule.times > 0) {
    const failures = [...scenario.failures]
    const times = rule.times - 1
    if (times === 0) failures.splice(index, 1)
    else failures[index] = { ...rule, times }
    scenario = { ...scenario, failures }
    persist(scenario)
    listeners.forEach((listener) => listener())
  }
  return rule.kind
}
