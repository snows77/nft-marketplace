import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiRequestError } from '@/api/errors'

// Erros por campo da API vão para o campo; o resto vira uma mensagem geral do formulário
export function applyApiError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (err instanceof ApiRequestError) {
    let placed = false
    for (const [field, messages] of Object.entries(err.fieldErrors ?? {})) {
      if ((fields as readonly string[]).includes(field)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] })
        placed = true
      }
    }
    if (!placed) setError('root.server' as Path<T>, { type: 'server', message: err.message })
    return
  }
  setError('root.server' as Path<T>, { type: 'server', message: 'Algo deu errado. Tente novamente.' })
}
