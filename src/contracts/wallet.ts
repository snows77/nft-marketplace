import { z } from 'zod'

// Carteiras do colecionador: uma principal e uma secundária.
// Usadas no perfil (cadastro/edição) e no pagamento (seleção de carteira e rede).
export const walletNetworkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export const walletSlotSchema = z.enum(['principal', 'secundaria'])

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  label: z.string(), // apelido, ex.: "Reserva"
  provider: walletProviderSchema,
  network: walletNetworkSchema,
  address: z.string(), // EVM: 0x + 40 hex; Solana: base58 com 32–44 caracteres
  updatedAt: z.string(), // ISO
})

// GET /api/wallets
export const walletsResponseSchema = z.object({
  principal: walletSchema.nullable(),
  secundaria: walletSchema.nullable(),
})

export type WalletNetwork = z.infer<typeof walletNetworkSchema>
export type WalletProvider = z.infer<typeof walletProviderSchema>
export type WalletSlot = z.infer<typeof walletSlotSchema>
export type Wallet = z.infer<typeof walletSchema>
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

// Nomes para exibição (perfil e pagamento)
export const NETWORK_LABELS: Record<WalletNetwork, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const SLOT_LABELS: Record<WalletSlot, string> = {
  principal: 'Carteira principal',
  secundaria: 'Carteira secundária',
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidAddress(network: WalletNetwork, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

// Mesma carteira? Endereços EVM não diferenciam maiúsculas; os de Solana sim.
export function sameAddress(a: string, b: string): boolean {
  return a.startsWith('0x') && b.startsWith('0x') ? a.toLowerCase() === b.toLowerCase() : a === b
}

// "0xA91F6b…E82C": encurta o endereço para caber em cartões e listas
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

// PUT /api/wallets/:slot (cria ou substitui). As mesmas regras valem no formulário e na API.
export const walletInputSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(2, 'Informe um apelido com pelo menos 2 caracteres.')
      .max(30, 'Use no máximo 30 caracteres.'),
    // Selects começam vazios no formulário: '' vira a mensagem de obrigatório
    provider: z.string().refine((v) => walletProviderSchema.safeParse(v).success, 'Selecione o tipo de carteira.'),
    network: z.string().refine((v) => walletNetworkSchema.safeParse(v).success, 'Selecione uma rede.'),
    address: z.string().trim().min(1, 'Informe o endereço da carteira.'),
  })
  .superRefine((data, ctx) => {
    const network = walletNetworkSchema.safeParse(data.network)
    if (!network.success || data.address === '') return
    if (!isValidAddress(network.data, data.address)) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message:
          network.data === 'solana'
            ? 'Endereço inválido para a rede Solana.'
            : `Endereço inválido para a rede ${NETWORK_LABELS[network.data]} (use 0x seguido de 40 caracteres hexadecimais).`,
      })
    }
  })
  .transform((data) => ({
    label: data.label,
    provider: data.provider as WalletProvider,
    network: data.network as WalletNetwork,
    address: data.address,
  }))

// Valores do formulário (selects começam vazios) e o que a API recebe
export type WalletFormValues = z.input<typeof walletInputSchema>
export type WalletInput = z.output<typeof walletInputSchema>
