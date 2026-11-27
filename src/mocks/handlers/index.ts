import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { networkHandler } from './network'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
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
]
