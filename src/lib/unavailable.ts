import { toast } from 'sonner'

// Ações fora do escopo do desafio avisam em vez de fingirem que funcionaram
export function notifyUnavailable(): void {
  toast('Esta seção não faz parte da demonstração.')
}
