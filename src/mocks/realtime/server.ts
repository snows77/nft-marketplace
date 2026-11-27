import { ws } from 'msw'
import { decodePacket, encodePacket, type Packet } from 'engine.io-parser'
import { Decoder, Encoder, PacketType } from 'socket.io-parser'
import type { NftUpdatedEvent, RealtimeEventName, RealtimeEventPayload } from '@/contracts/events'
import { getDb, saveDb } from '../db'
import type { NftPatch } from '../scenario'

// Servidor Socket.IO simulado sobre o handler `ws` do MSW (camada de rede).
// Fala o protocolo de verdade com o socket.io-client: handshake Engine.IO v4 ("0{...}"),
// ping/pong, CONNECT do namespace "/" com auth ("40{token}") e eventos ("42[...]").
// Só o transporte websocket é suportado (sem long-polling) — ver docs/realtime.md.

const PING_INTERVAL = 25_000
const PING_TIMEOUT = 20_000

type Client = Parameters<Parameters<ReturnType<typeof ws.link>['addEventListener']>[1]>[0]['client']

interface Connection {
  client: Client
  sid: string
  joined: boolean // CONNECT do namespace "/" concluído
  userId: string | null // dono do token enviado em auth (null = visitante)
}

const connections = new Map<string, Connection>()
let offline = false // "queda" simulada: recusa conexões até reconectar
const encoder = new Encoder()

// Caminho próprio (/tempo-real/) em vez do padrão /socket.io/: o MSW remove o prefixo
// /socket.io/ da URL antes de comparar, e a URL sem caminho colidiria com o WebSocket
// do HMR do Vite. O cliente usa o mesmo caminho (src/features/realtime/client.ts).
export const SOCKET_PATH = '/tempo-real/'
export const socketLink = ws.link(`*${SOCKET_PATH}*`)

function sendEngine(client: Client, packet: Packet) {
  encodePacket(packet, false, (encoded) => client.send(encoded as string))
}

function sendSocketIo(client: Client, packet: Parameters<Encoder['encode']>[0]) {
  for (const data of encoder.encode(packet)) sendEngine(client, { type: 'message', data })
}

// Token do auth → usuário, com a mesma regra da API REST (sessão existente e não expirada)
function userFromToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token) return null
  const session = getDb().sessions.find((s) => s.token === token)
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null
  return session.userId
}

export const realtimeHandler = socketLink.addEventListener('connection', ({ client }) => {
  if (offline) {
    client.close(4001, 'indisponivel')
    return
  }
  const conn: Connection = { client, sid: crypto.randomUUID(), joined: false, userId: null }
  connections.set(client.id, conn)

  const decoder = new Decoder()
  decoder.on('decoded', (packet: { type: PacketType; nsp: string; data?: unknown }) => {
    if (packet.type === PacketType.CONNECT) {
      const auth = packet.data as { token?: unknown } | undefined
      conn.userId = userFromToken(auth?.token)
      conn.joined = true
      sendSocketIo(client, { type: PacketType.CONNECT, nsp: '/', data: { sid: conn.sid } })
    } else if (packet.type === PacketType.DISCONNECT) {
      conn.joined = false
    }
    // O cliente não emite eventos de negócio: tudo nasce no servidor
  })

  client.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return
    const packet = decodePacket(event.data)
    if (packet.type === 'message' && typeof packet.data === 'string') decoder.add(packet.data)
    else if (packet.type === 'close') client.close()
    // 'pong' só confirma que o cliente está vivo
  })

  const ping = setInterval(() => sendEngine(client, { type: 'ping' }), PING_INTERVAL)
  client.addEventListener('close', () => {
    clearInterval(ping)
    decoder.destroy()
    connections.delete(client.id)
  })

  // Handshake Engine.IO: o cliente espera o "open" antes de pedir o namespace
  queueMicrotask(() =>
    sendEngine(client, {
      type: 'open',
      data: JSON.stringify({
        sid: conn.sid,
        upgrades: [],
        pingInterval: PING_INTERVAL,
        pingTimeout: PING_TIMEOUT,
        maxPayload: 1_000_000,
      }),
    }),
  )
})

function emitTo(targets: Connection[], event: string, payload: unknown): number {
  for (const conn of targets) {
    sendSocketIo(conn.client, { type: PacketType.EVENT, nsp: '/', data: [event, payload] })
  }
  return targets.length
}

const joined = () => [...connections.values()].filter((c) => c.joined)

// Evento público (todos os sockets conectados). Devolve quantos receberam.
export function emitToAll<E extends RealtimeEventName>(event: E, payload: RealtimeEventPayload<E>): number {
  return emitTo(joined(), event, payload)
}

// Evento de um usuário: só os sockets autenticados como ele recebem
export function emitToUser<E extends RealtimeEventName>(
  userId: string,
  event: E,
  payload: RealtimeEventPayload<E>,
): number {
  return emitTo(
    joined().filter((c) => c.userId === userId),
    event,
    payload,
  )
}

// Envio cru (testes/demo): duplicatas, versões antigas, payloads de outro usuário
export function emitRaw(event: string, payload: unknown): number {
  return emitTo(joined(), event, payload)
}

export const newEventId = () => `evt-${crypto.randomUUID()}`

// Estado atual do NFT no banco → evento nft.updated (snapshot completo, não delta)
export function emitNftSnapshot(nftId: string): NftUpdatedEvent {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  if (!nft) throw new Error(`NFT ${nftId} não existe`)
  const event: NftUpdatedEvent = {
    eventId: newEventId(),
    nftId: nft.id,
    version: nft.version,
    priceEth: nft.priceEth,
    editions: nft.editions.map((e) => ({ id: e.id, available: e.available })),
    occurredAt: new Date().toISOString(),
  }
  emitToAll('nft.updated', event)
  return event
}

// Muda o NFT no banco (fonte da verdade) e avisa os sockets: REST e eventos sempre batem
export function updateNft(nftId: string, patch: NftPatch): NftUpdatedEvent {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  if (!nft) throw new Error(`NFT ${nftId} não existe`)
  if (patch.priceEth !== undefined) nft.priceEth = patch.priceEth
  for (const change of patch.editions ?? []) {
    const edition = nft.editions.find((e) => e.id === change.id)
    if (edition) edition.available = Math.max(0, change.available)
  }
  nft.version += 1
  saveDb()
  return emitNftSnapshot(nftId)
}

// Queda simulada: fecha os sockets e recusa novas conexões (o banco continua mudando)
export function disconnectSockets(): void {
  offline = true
  for (const conn of connections.values()) conn.client.close(4001, 'queda simulada')
  connections.clear()
}

// Volta a aceitar conexões; o socket.io-client reconecta sozinho (backoff)
export function reconnectSockets(): void {
  offline = false
}

export function isSocketServerOnline(): boolean {
  return !offline
}
