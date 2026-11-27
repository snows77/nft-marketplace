import { Link } from '@tanstack/react-router'
import { Container } from './Container'

export function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-display font-bold text-primary" aria-hidden="true">
        404
      </p>
      <h1 className="text-heading font-bold">Página não encontrada</h1>
      <p className="max-w-md text-body text-muted-foreground">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        to="/"
        className="rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground hover:bg-primary-light"
      >
        Voltar ao início
      </Link>
    </Container>
  )
}
