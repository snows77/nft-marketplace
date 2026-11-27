import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

// Até 7 páginas mostra todas; acima disso: 1 … vizinhas … última
function pageItems(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  if (start > 2) items.push('gap')
  for (let p = start; p <= end; p++) items.push(p)
  if (end < total - 1) items.push('gap')
  items.push(total)
  return items
}

const itemClass =
  'flex size-9 items-center justify-center rounded border border-border-soft text-body hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40'

// Paginação do Figma: números com a atual em laranja e setas
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className="flex justify-end">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className={itemClass}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
                className={cn(
                  itemClass,
                  item === page && 'border-primary bg-primary font-bold text-primary-foreground hover:text-primary-foreground',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            className={itemClass}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
