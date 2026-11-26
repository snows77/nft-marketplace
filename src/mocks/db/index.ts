import type { Nft } from '@/contracts/nft'
import { buildNfts } from './fixtures/nfts'

// Troque o número da versão sempre que mudar as fixtures,
// senão o navegador continua usando os dados antigos salvos.
export const STORAGE_KEY = 'kurio:mock-db:v2'

interface MockDbState {
  nfts: Nft[]
}

function seed(): MockDbState {
  return { nfts: buildNfts() }
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