// Token da sessão guardado no navegador para a sessão sobreviver ao refresh
export const TOKEN_KEY = 'kurio:session-token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // sem localStorage a sessão vale só enquanto a página estiver aberta
  }
}

// Carrinho do visitante: o navegador guarda só o id; itens e totais ficam na API
export const CART_ID_KEY = 'kurio:cart-id'

export function getGuestCartId(): string | null {
  try {
    return localStorage.getItem(CART_ID_KEY)
  } catch {
    return null
  }
}

export function setGuestCartId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id)
    else localStorage.removeItem(CART_ID_KEY)
  } catch {
    // sem localStorage o carrinho do visitante vale só nesta página
  }
}
