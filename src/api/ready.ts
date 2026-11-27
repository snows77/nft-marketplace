// A interface desenha imediatamente; só as requisições esperam a API ficar pronta.
// Com os mocks ligados, "pronta" = Service Worker do MSW ativo. Sem mocks, na hora.
let markReady: () => void = () => {}
export const apiReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function setApiReady(): void {
  markReady()
}
