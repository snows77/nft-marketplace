import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
type Nft = { id: string; name: string; price: string }

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nfts'],
    queryFn: async ({ signal }) => {
      const res = await api.get<Nft[]>('/nfts', { signal })
      return res.data
    },
  })

  if (isLoading) return <p className="p-4">Carregando...</p>
  if (isError) return <p className="p-4">Erro ao carregar.</p>

  return (
    <ul className="space-y-2 p-4">
      {data?.map((nft) => (
        <li key={nft.id}>
          {nft.name}: {nft.price} ETH
        </li>
      ))}
    </ul>
  )
}