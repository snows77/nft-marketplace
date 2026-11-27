import { useMediaQuery } from './use-media-query'

// true quando a pessoa pediu menos movimento ao sistema operacional
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
