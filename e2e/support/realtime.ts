import { expect, type Page } from '@playwright/test'
import type { NftPatch, RealtimeStats } from '../../src/mocks/scenario.ts'

// Controle do servidor Socket.IO simulado (window.__kurioMocks) e estatísticas do cliente
// (window.__kurioDebug.realtime). Os eventos sempre trafegam pelo socket.io-client.
export function realtime(page: Page) {
  return {
    updateNft: (nftId: string, patch: NftPatch) =>
      page.evaluate(([id, p]) => window.__kurioMocks!.updateNft(id, p), [nftId, patch] as const),
    emitRaw: (event: string, payload: unknown) =>
      page.evaluate(([e, p]) => window.__kurioMocks!.emitRaw(e, p), [event, payload] as const),
    emitToUser: (userId: string, event: string, payload: unknown) =>
      page.evaluate(([u, e, p]) => window.__kurioMocks!.emitToUser(u, e, p), [userId, event, payload] as const),
    disconnect: () => page.evaluate(() => window.__kurioMocks!.disconnectSockets()),
    reconnect: () => page.evaluate(() => window.__kurioMocks!.reconnectSockets()),
    stats: () => page.evaluate(() => window.__kurioDebug!.realtime()) as Promise<RealtimeStats>,
  }
}

// Espera o socket do cliente estar conectado (e, se informado, autenticado como o usuário)
export async function waitConnected(page: Page, userId: string | null = null) {
  await expect
    .poll(async () => {
      const stats = await page.evaluate(() => window.__kurioDebug?.realtime())
      return stats && { status: stats.status, userId: stats.userId }
    })
    .toEqual({ status: 'conectado', userId })
}
