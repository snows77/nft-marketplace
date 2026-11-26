import axios from 'axios'
import { toApiError } from './errors'
import { getToken } from './token'

// 8s: acima disso a requisição é cancelada e tratada como falha transitória
export const api = axios.create({ baseURL: '/api', timeout: 8000 })

// Toda requisição leva o token da sessão, quando houver
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Todo erro sai no formato ApiRequestError (código, status, erros por campo)
api.interceptors.response.use(undefined, (error) => Promise.reject(toApiError(error)))
