import axios from 'axios'
import { toApiError } from './errors'
import { apiReady } from './ready'
import { getGuestCartId, getToken } from './token'

// 8s: acima disso a requisição é cancelada e tratada como falha transitória
export const api = axios.create({ baseURL: '/api', timeout: 8000 })

// Toda requisição espera a API ficar pronta e leva o token da sessão, quando houver
api.interceptors.request.use(async (config) => {
  await apiReady
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Visitante: identifica o carrinho anônimo (logado, a API usa o do usuário)
  const cartId = getGuestCartId()
  if (!token && cartId) config.headers['X-Cart-Id'] = cartId
  return config
})

// Todo erro sai no formato ApiRequestError (código, status, erros por campo)
api.interceptors.response.use(undefined, (error) => Promise.reject(toApiError(error)))
