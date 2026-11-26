import { http, HttpResponse } from 'msw'
import { requireSession } from './auth'

export const profileHandlers = [
  http.get('/api/profile', ({ request }) => {
    const result = requireSession(request)
    if (result instanceof Response) return result
    const { id, username, email, avatarUrl } = result.user
    return HttpResponse.json({ id, username, email, avatarUrl })
  }),
]
