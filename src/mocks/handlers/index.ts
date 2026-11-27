import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { networkHandler } from './network'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { realtimeHandler } from '../realtime/server'
import { walletHandlers } from './wallets'

// A ordem importa: o handler de rede roda primeiro em toda requisição
export const handlers = [
  networkHandler,
  ...authHandlers,
  ...profileHandlers,
  ...orderHandlers, // antes das carteiras: /api/wallets/connect
  ...walletHandlers,
  ...cartHandlers,
  ...favoriteHandlers,
  ...nftHandlers,
  // Servidor Socket.IO simulado (WebSocket em /socket.io/)
  realtimeHandler,
]
