import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/nfts', () =>
    HttpResponse.json([
      { id: '1', name: 'Cosmic Cat', price: '0.25' },
      { id: '2', name: 'Pixel Punk', price: '1.10' },
    ]),
  ),
]