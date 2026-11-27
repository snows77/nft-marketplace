// Cenários de rede da API simulada: latência e falhas configuráveis e reproduzíveis.
// O estado fica no localStorage para sobreviver a refresh; ?cenario=<preset> na URL
// aplica um preset no carregamento (útil para demonstração e links compartilháveis).

export type LatencyMode = 'none' | 'normal' | 'slow' | 'variable'
// 'timeout-apos-criar': o servidor processa (ex.: cria o pedido) mas a resposta não chega
// a tempo — o cliente precisa recuperar pela chave de idempotência
export type FailureKind = 'http-500' | 'http-503' | 'network' | 'timeout' | 'timeout-apos-criar'
export type Outcome = 'aprovar' | 'recusar'
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
  walletOutcome?: Outcome // a carteira aceita ou recusa a conexão (padrão: aprovar)
  paymentOutcome?: Outcome // o pagamento é confirmado ou recusado (padrão: aprovar)
  paymentDelayMs?: number // quanto o pedido fica "pendente" antes do resultado (padrão: 2000)
}

// Contrato do controle exposto em window.__kurioMocks (demonstração e Playwright).
// Fica aqui, num arquivo sem imports, para os testes poderem usar o tipo.
export interface KurioMocks {
  getScenario: () => Scenario
  setScenario: (patch: Partial<Scenario>) => void
  applyPreset: (name: PresetName) => void
  failNext: (method: string, path: string, kind: FailureKind, times?: number) => void
  reset: () => void
  expireSession: () => void
  // Tempo real (servidor Socket.IO simulado): muda o banco e emite nft.updated
  updateNft: (nftId: string, patch: NftPatch) => NftUpdatedPayload
  // Envia um evento cru a todos os sockets, sem mexer no banco (duplicatas, versões antigas)
  emitRaw: (event: string, payload: unknown) => number
  // Envia um evento só aos sockets autenticados como o usuário; devolve quantos receberam
  emitToUser: (userId: string, event: string, payload: unknown) => number
  // Simula queda da conexão em tempo real (recusa novas conexões até reconectar)
  disconnectSockets: () => void
  reconnectSockets: () => void
}

// Alteração de um NFT no servidor simulado (editions: só as edições informadas mudam)
export interface NftPatch {
  priceEth?: string
  editions?: { id: string; available: number }[]
}

// Mesmo formato do contrato nft.updated (src/contracts/events.ts)
export interface NftUpdatedPayload {
  eventId: string
  nftId: string
  version: number
  priceEth: string
  editions: { id: string; available: number }[]
  occurredAt: string
}

export type RealtimeStatus = 'conectando' | 'conectado' | 'desconectado'

// Estatísticas do cliente de tempo real (o que chegou, o que foi aplicado e o que foi ignorado)
export interface RealtimeStats {
  status: RealtimeStatus
  userId: string | null // usuário da sessão com que o socket atual se conectou
  received: Record<string, number>
  applied: Record<string, number>
  ignored: { duplicate: number; stale: number; otherUser: number; invalid: number }
}

// Inspeção do cache do TanStack Query, usada nos testes de isolamento entre usuários
export interface KurioDebug {
  cachedQueryKeys: () => readonly (readonly unknown[])[]
  realtime: () => RealtimeStats
}

declare global {
  interface Window {
    __kurioMocks?: KurioMocks
    __kurioDebug?: KurioDebug
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

// Consome uma regra de falha que case com a requisição (se houver).
// O handler de rede trata as falhas "antes" do processamento; 'timeout-apos-criar' é
// tratado pelo próprio handler de negócio, depois de gravar (passe kinds para filtrar).
export function takeFailure(
  method: string,
  path: string,
  kinds: FailureKind[] = ['http-500', 'http-503', 'network', 'timeout'],
): FailureKind | null {
  const index = scenario.failures.findIndex(
    (rule) =>
      (rule.method === '*' || rule.method.toUpperCase() === method.toUpperCase()) &&
      path.startsWith(rule.path) &&
      rule.times !== 0 &&
      kinds.includes(rule.kind),
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
