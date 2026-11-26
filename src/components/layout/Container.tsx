import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Largura útil do Figma: 1200px centralizados (margens de 120px em 1440)
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-300 px-4 md:px-6 xl:px-0', className)} {...props} />
}
