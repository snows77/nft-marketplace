import { isAxiosError, isCancel } from 'axios'
import { apiErrorSchema, type ApiError } from '@/contracts/common'

export type ApiErrorCode = ApiError['code'] | 'NETWORK_ERROR' | 'TIMEOUT'

// Todo erro de requisição vira este formato, para a interface tratar sem conhecer o Axios
export class ApiRequestError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fieldErrors?: Record<string, string[]>
  readonly requestUrl?: string // ex.: "/auth/session" (relativo a /api)

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number | null,
    fieldErrors?: Record<string, string[]>,
    requestUrl?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
    this.requestUrl = requestUrl
  }
}

export function toApiError(err: unknown): unknown {
  if (err instanceof ApiRequestError || isCancel(err) || !isAxiosError(err)) return err

  const url = err.config?.url
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return new ApiRequestError('TIMEOUT', 'A requisição demorou demais. Tente novamente.', null, undefined, url)
  }
  if (!err.response) {
    return new ApiRequestError('NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet.', null, undefined, url)
  }

  const parsed = apiErrorSchema.safeParse(err.response.data)
  if (parsed.success) {
    const { code, message, fieldErrors } = parsed.data
    return new ApiRequestError(code, message, err.response.status, fieldErrors, url)
  }
  return new ApiRequestError('TRANSIENT_ERROR', 'Algo deu errado. Tente novamente.', err.response.status, undefined, url)
}

// Falha transitória: vale tentar de novo (sem resposta, timeout ou erro 5xx).
// Erros 4xx (validação, sessão, permissão, conflito) nunca são repetidos.
export function isTransient(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    return err.status === null || err.status >= 500 || err.code === 'TRANSIENT_ERROR'
  }
  if (isAxiosError(err)) return !err.response || err.response.status >= 500
  return false
}
