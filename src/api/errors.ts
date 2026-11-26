import { isAxiosError } from 'axios'

// Falha transitória: vale tentar de novo (sem resposta, timeout ou erro 5xx).
// Erros 4xx (validação, sessão, permissão, conflito) nunca são repetidos.
export function isTransient(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  if (!err.response) return true
  return err.response.status >= 500
}
