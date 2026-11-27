import type { Wallet } from '@/contracts/wallet'

// Carteira guardada no banco simulado: o contrato público + o dono
export interface DbWallet extends Wallet {
  userId: string
}

// A ana tem as duas carteiras (as mesmas do frame de pagamento mobile do Figma);
// o bruno não tem nenhuma, para exercitar o estado vazio.
export function buildWallets(): DbWallet[] {
  return [
    {
      id: 'wallet-ana-principal',
      userId: 'user-ana',
      slot: 'principal',
      label: 'Reserva',
      provider: 'metamask',
      network: 'polygon',
      address: '0x5c3E9a7B1d2F4e6A8b0C9d1E3f5A7b9C2d4E6f80',
      updatedAt: '2026-11-01T12:00:00.000Z',
    },
    {
      id: 'wallet-ana-secundaria',
      userId: 'user-ana',
      slot: 'secundaria',
      label: 'Principal',
      provider: 'coinbase',
      network: 'ethereum',
      address: '0xA91F6b2C3d4E5f60718293a4B5c6D7e8F9a0E82C',
      updatedAt: '2026-11-01T12:00:00.000Z',
    },
  ]
}
