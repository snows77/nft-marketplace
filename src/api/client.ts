import axios from 'axios'

// 8s: acima disso a requisição é cancelada e tratada como falha transitória
export const api = axios.create({ baseURL: '/api', timeout: 8000 })
