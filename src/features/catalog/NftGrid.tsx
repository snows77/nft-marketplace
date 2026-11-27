import type { NftSummary } from '@/contracts/nft'
import { NftCard, NftCardSkeleton } from './NftCard'

const PAGE_SIZE = 9
const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-8'

export function NftGrid({ items }: { items: NftSummary[] }) {
  return (
    <ul aria-label="NFTs" className={gridClass}>
      {items.map((nft, index) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={index < 2} />
        </li>
      ))}
    </ul>
  )
}

export function NftGridSkeleton({ label = 'Carregando NFTs', count = PAGE_SIZE }: { label?: string; count?: number }) {
  return (
    <div role="status" aria-label={label} className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <NftCardSkeleton key={i} />
      ))}
    </div>
  )
}
