import type { NftSummary } from '@/contracts/nft'
import { NftCard, NftCardSkeleton } from './NftCard'

const PAGE_SIZE = 9

export function NftGrid({ items }: { items: NftSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {items.map((nft, index) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={index < 3} />
        </li>
      ))}
    </ul>
  )
}

export function NftGridSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando NFTs"
      className="grid grid-cols-2 gap-4 lg:grid-cols-3"
    >
      {Array.from({ length: PAGE_SIZE }, (_, i) => (
        <NftCardSkeleton key={i} />
      ))}
    </div>
  )
}