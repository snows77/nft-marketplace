import type { Nft } from '@/contracts/nft'
import { buildNfts } from './fixtures/nfts'
import { buildUsers, type DbUser } from './fixtures/users'

// Troque o número da versão sempre que mudar as fixtures,
// senão o navegador continua usando os dados antigos salvos.
export const STORAGE_KEY = 'kurio:mock-db:v2'

export interface DbSession {
  token: string
  userId: string
  expiresAt: string // ISO
}

interface MockDbState {
  nfts: Nft[]
  users: DbUser[]
  sessions: DbSession[]
}

function seed(): MockDbState {
  return { nfts: buildNfts(), users: buildUsers(), sessions: [] }
}

function load(): MockDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockDbState
  } catch {
    // localStorage indisponível ou JSON corrompido: recomeça do cenário padrão
  }
  return seed()
}

let state: MockDbState = load()

// Cada aba tem sua cópia em memória; quando outra aba grava o banco (ex.: login),
// esta recarrega, como se todas falassem com o mesmo servidor
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) state = load()
})

export function getDb(): MockDbState {
  return state
}

export function saveDb(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sem persistência, o mock continua funcionando em memória
  }
}

export function resetDb(): void {
  state = seed()
  saveDb()
}

// Simula o fim do prazo de todas as sessões abertas (cenário de expiração)
export function expireAllSessions(): void {
  const past = new Date(Date.now() - 1000).toISOString()
  state.sessions = state.sessions.map((session) => ({ ...session, expiresAt: past }))
  saveDb()
}