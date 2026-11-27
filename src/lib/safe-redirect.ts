// Só aceita caminhos internos ("/perfil"), nunca outro site ("//evil.com", "https://...")
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
