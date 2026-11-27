import { expect, type Page } from '@playwright/test'

export const ANA = { email: 'ana@kurio.dev', password: 'Kurio@123', username: 'ana' }
export const BRUNO = { email: 'bruno@kurio.dev', password: 'Kurio@123', username: 'bruno' }

export function authDialog(page: Page) {
  return page.getByRole('dialog')
}

// Preenche e envia o formulário "Entrar" do modal (que já deve estar aberto)
export async function submitLogin(page: Page, email: string, password: string) {
  const dialog = authDialog(page)
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
}

// Abre o modal pela URL, entra e espera o modal fechar
export async function loginAs(page: Page, user: { email: string; password: string; username: string }) {
  await page.goto('/?auth=entrar')
  await submitLogin(page, user.email, user.password)
  await expect(page.getByText(`Olá, ${user.username}!`)).toBeVisible()
  await expect(authDialog(page)).toBeHidden()
}
