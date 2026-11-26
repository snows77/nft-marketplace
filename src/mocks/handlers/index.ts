import { networkHandler } from './network'
import { nftHandlers } from './nfts'

// A ordem importa: o handler de rede roda primeiro em toda requisição
export const handlers = [networkHandler, ...nftHandlers]
