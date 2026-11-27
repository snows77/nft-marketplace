import { useState } from 'react'
import { Search, X } from 'lucide-react'

export const SEARCH_INPUT_ID = 'busca-nfts'

interface Props {
  value: string | undefined
  onSearch: (q: string | undefined) => void
}

// Campo "Explorar coleções" (Figma mobile). Aplica ao pressionar Enter ou o botão.
export function SearchBox({ value, onSearch }: Props) {
  const [text, setText] = useState(value ?? '')
  // Quando a URL muda por fora (voltar no histórico, "Limpar tudo"), o texto acompanha.
  // Ajuste durante a renderização (padrão do React) em vez de recriar o campo, que
  // faria o foco do teclado se perder.
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value ?? '')
  }

  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim() || undefined)
      }}
    >
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        Buscar NFTs
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-tan" aria-hidden="true" />
      <input
        id={SEARCH_INPUT_ID}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explorar coleções"
        enterKeyHint="search"
        className="h-12 w-full rounded-xl border border-transparent bg-card pr-20 pl-12 text-body placeholder:text-tan focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            setText('')
            onSearch(undefined)
          }}
          className="absolute top-1/2 right-11 -translate-y-1/2 p-1 text-tan hover:text-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-primary hover:text-primary-light"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    </form>
  )
}
