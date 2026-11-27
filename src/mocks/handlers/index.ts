import { authHandlers } from './auth'
import { favoriteHandlers } from './favorites'
import { networkHandler } from './network'
import { nftHandlers } from './nfts'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

// A ordem importa: o handler de rede roda primeiro em toda requisição
export const handlers = [networkHandler, ...authHandlers, ...profileHandlers, ...walletHandlers, ...favoriteHandlers, ...nftHandlers]
