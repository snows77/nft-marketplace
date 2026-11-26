// Hash da senha no banco simulado: SHA-256 de "salt:senha" (Web Crypto).
// É uma simulação: num backend real usaríamos um algoritmo lento (bcrypt/argon2).
export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function newSalt(): string {
  return crypto.randomUUID()
}
