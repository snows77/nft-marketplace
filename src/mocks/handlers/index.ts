import { authHandlers } from './auth'
import { networkHandler } from './network'
import { nftHandlers } from './nfts'
import { profileHandlers } from './profile'

// A ordem importa: o handler de rede roda primeiro em toda requisição
export const handlers = [networkHandler, ...authHandlers, ...profileHandlers, ...nftHandlers]
