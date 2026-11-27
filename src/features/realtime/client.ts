import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { getToken } from '@/api/token'
import type { Session } from '@/contracts/auth'
import {
  realtimeEventSchemas,
  type RealtimeEventName,
  type RealtimeEventPayload,
} from '@/contracts/events'
import type { RealtimeStats, RealtimeStatus } from '@/mocks/scenario'
import { sessionKey } from '@/features/auth/session'

// Cliente de tempo real: UM socket por sessão. Quando a identidade muda (login, logout,
// troca de usuário, expiração), o socket antigo é descartado com seus listeners e um novo
// conecta com o token da sessão nova. Todo evento passa por aqui antes de chegar a quem
// assinou: validação (Zod), deduplicação por eventId, descarte de versões antigas e,
// em eventos de usuário, conferência de que o dono é o usuário atual.

type Handler<E extends RealtimeEventName> = (payload: RealtimeEventPayload<E>) => void
type AnyHandler = (payload: unknown) => void

// Versão mais recente conhecida de um recurso no cache (semeia o controle de ordem)
type VersionLookup = (resourceId: string) => number | undefined

const RESOURCE_ID: { [E in RealtimeEventName]: (payload: RealtimeEventPayload<E>) => string } = {
  'nft.updated': (p) => p.nftId,
  'order.updated': (p) => p.orderId,
}

const MAX_SEEN = 500

let socket: Socket | null = null
let io: typeof import('socket.io-client').io | null = null
let socketToken: string | null = null
let queryClient: QueryClient | null = null
const handlers = new Map<RealtimeEventName, Set<AnyHandler>>()
const versionLookups = new Map<RealtimeEventName, VersionLookup>()
const seen = new Set<string>() // eventIds já processados (limitado, os mais antigos saem)
const versions = new Map<string, number>() // "evento:recurso" -> última versão aplicada
const reconnectListeners = new Set<() => void>()
const statusListeners = new Set<() => void>()

let stats: RealtimeStats = emptyStats()

function emptyStats(): RealtimeStats {
  return {
    status: 'desconectado',
    userId: null,
    received: {},
    applied: {},
    ignored: { duplicate: 0, stale: 0, otherUser: 0, invalid: 0 },
  }
}

function setStats(patch: Partial<RealtimeStats>) {
  stats = { ...stats, ...patch }
  statusListeners.forEach((listener) => listener())
}

const bump = (record: Record<string, number>, key: string) => ({ ...record, [key]: (record[key] ?? 0) + 1 })
const ignore = (reason: keyof RealtimeStats['ignored']) =>
  setStats({ ignored: { ...stats.ignored, [reason]: stats.ignored[reason] + 1 } })

export function getRealtimeStats(): RealtimeStats {
  return stats
}

export function subscribeRealtimeStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

export function getRealtimeStatus(): RealtimeStatus {
  return stats.status
}

function currentUserId(): string | null {
  return queryClient?.getQueryData<Session | null>(sessionKey)?.user.id ?? null
}

function remember(eventId: string) {
  seen.add(eventId)
  if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value!)
}

// Porta de entrada de todo evento recebido pelo socket
function dispatch(event: string, raw: unknown) {
  if (!(event in realtimeEventSchemas)) return
  const name = event as RealtimeEventName
  setStats({ received: bump(stats.received, name) })

  const parsed = realtimeEventSchemas[name].safeParse(raw)
  if (!parsed.success) return ignore('invalid')
  const payload = parsed.data

  if (seen.has(payload.eventId)) return ignore('duplicate')
  remember(payload.eventId)

  // Evento de usuário: só vale para o dono da sessão atual
  if ('userId' in payload && payload.userId !== currentUserId()) return ignore('otherUser')

  const resourceId = (RESOURCE_ID[name] as (p: typeof payload) => string)(payload)
  const key = `${name}:${resourceId}`
  const known = Math.max(versions.get(key) ?? -Infinity, versionLookups.get(name)?.(resourceId) ?? -Infinity)
  if (payload.version <= known) return ignore('stale')
  versions.set(key, payload.version)

  setStats({ applied: bump(stats.applied, name) })
  handlers.get(name)?.forEach((handler) => handler(payload))
}

// Assina um evento. Devolve a função que libera o listener.
export function subscribeEvent<E extends RealtimeEventName>(event: E, handler: Handler<E>): () => void {
  const set = handlers.get(event) ?? new Set()
  handlers.set(event, set)
  set.add(handler as AnyHandler)
  return () => set.delete(handler as AnyHandler)
}

// Informa como achar no cache a versão atual de um recurso (para ignorar eventos velhos
// mesmo antes do primeiro evento: a versão que veio do REST já conta)
export function registerVersionLookup(event: RealtimeEventName, lookup: VersionLookup): void {
  versionLookups.set(event, lookup)
}

// Chamado a cada reconexão (não na primeira conexão): hora de reconciliar com o REST
export function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener)
  return () => reconnectListeners.delete(listener)
}

function openSocket(token: string | null) {
  closeSocket()
  socketToken = token
  setStats({ status: 'conectando', userId: null })

  const next = io!({
    path: '/tempo-real/', // o mesmo do servidor simulado (src/mocks/realtime/server.ts)
    transports: ['websocket'], // único transporte simulado (ver docs/realtime.md)
    forceNew: true, // conexão própria por sessão (nada reaproveitado da anterior)
    auth: token ? { token } : {},
    reconnectionDelay: 300,
    reconnectionDelayMax: 2000,
    // Tentativa recusada antes do handshake não gera "error" no Manager: sem um timeout
    // curto, a próxima tentativa só sairia depois de 20 s (padrão)
    timeout: 2500,
  })
  let connectedBefore = false

  next.on('connect', () => {
    setStats({ status: 'conectado', userId: currentUserId() })
    if (connectedBefore) reconnectListeners.forEach((listener) => listener())
    connectedBefore = true
  })
  next.on('disconnect', () => setStats({ status: 'desconectado' }))
  next.on('connect_error', () => setStats({ status: 'desconectado' }))
  next.onAny((event: string, payload: unknown) => {
    if (socket === next) dispatch(event, payload) // nunca de um socket já descartado
  })
  socket = next
}

function closeSocket() {
  if (!socket) return
  socket.offAny()
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}

// Liga o tempo real: conecta com o token atual e acompanha a identidade da sessão
// O socket.io-client é carregado só aqui, DEPOIS de o MSW estar ativo: o engine.io-client
// guarda o construtor WebSocket global ao ser importado, e precisa pegar o já interceptado.
export async function installRealtime(client: QueryClient): Promise<() => void> {
  io = (await import('socket.io-client')).io
  queryClient = client
  openSocket(getToken())

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== sessionKey[0]) return
    if (event.query.state.data === undefined) return // sessão ainda carregando
    const token = getToken()
    if (token !== socketToken) {
      openSocket(token) // outra identidade: socket novo, com o token novo
    } else if (stats.status === 'conectado') {
      setStats({ userId: currentUserId() })
    }
  })

  return () => {
    unsubscribe()
    closeSocket()
  }
}
