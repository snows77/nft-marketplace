// Token da sessão guardado no navegador para a sessão sobreviver ao refresh
const TOKEN_KEY = 'kurio:session-token'

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
