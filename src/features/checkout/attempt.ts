// Tentativa de compra em andamento, guardada por usuário no sessionStorage:
// - key: chave de idempotência da tentativa (reenvio após clique repetido/timeout
//   recupera o mesmo pedido);
// - quoteId: a cotação que a chave confirma (cotação nova = tentativa nova);
// - orderId: o pedido criado, para retomar o "pendente" depois de recarregar a página.
export interface CheckoutAttempt {
  key: string
  quoteId: string
  orderId?: string
}

const storageKey = (userId: string) => `kurio:checkout:${userId}`

export function loadAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as CheckoutAttempt) : null
  } catch {
    return null
  }
}

export function saveAttempt(userId: string, attempt: CheckoutAttempt | null): void {
  try {
    if (attempt) sessionStorage.setItem(storageKey(userId), JSON.stringify(attempt))
    else sessionStorage.removeItem(storageKey(userId))
  } catch {
    // sem sessionStorage a recuperação após refresh não acontece, mas a compra segue
  }
}

// Mesma cotação reaproveita a chave; cotação diferente é outra tentativa
export function attemptFor(userId: string, quoteId: string): CheckoutAttempt {
  const current = loadAttempt(userId)
  if (current && current.quoteId === quoteId && !current.orderId) return current
  const fresh = { key: crypto.randomUUID(), quoteId }
  saveAttempt(userId, fresh)
  return fresh
}
