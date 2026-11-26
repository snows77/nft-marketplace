import { delay, http, HttpResponse } from 'msw'
import { nextDelay, takeFailure } from '../scenario'

// Fica na frente de todos os handlers: aplica latência e falhas do cenário ativo.
// Quando não há falha, não retorna nada e o MSW segue para o handler de negócio.
export const networkHandler = http.all('/api/*', async ({ request }) => {
  const url = new URL(request.url)
  await delay(nextDelay())

  const failure = takeFailure(request.method, url.pathname + url.search)
  switch (failure) {
    case null:
      return
    case 'network':
      return HttpResponse.error()
    case 'timeout':
      // Mais que o timeout do Axios (8s): o cliente desiste antes da resposta
      await delay(15_000)
      return transientError(503)
    case 'http-500':
      return transientError(500)
    case 'http-503':
      return transientError(503)
  }
})

function transientError(status: number) {
  return HttpResponse.json(
    { code: 'TRANSIENT_ERROR', message: 'Serviço temporariamente indisponível.' },
    { status },
  )
}
