import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/contracts/auth'
import { useLogout } from './session'

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded border border-primary px-2.5 py-1.5 text-body font-bold text-primary hover:bg-primary hover:text-primary-foreground">
        <UserRound className="size-5" aria-hidden="true" />
        {user.username}
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem asChild>
          {/* Rota criada na próxima tarefa; até lá cai na página 404 */}
          <a href="/perfil">
            <UserRound aria-hidden="true" />
            Meu perfil
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
