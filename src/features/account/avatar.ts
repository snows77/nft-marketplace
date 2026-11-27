import { AVATAR_MAX_DATA_URL_LENGTH, AVATAR_MAX_FILE_BYTES, AVATAR_TYPES } from '@/contracts/auth'

const AVATAR_SIZE = 256

// Validação antes do envio: formato e tamanho do arquivo escolhido
export function checkAvatarFile(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem PNG, JPG ou WebP.'
  if (file.size > AVATAR_MAX_FILE_BYTES) return 'A imagem deve ter até 2 MB.'
  return null
}

// Recorta o centro em quadrado e reduz para 256 px, devolvendo uma data URL leve
export async function resizeAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const out = Math.min(AVATAR_SIZE, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)

    // WebP quando o navegador gera (senão ele devolve PNG); JPEG como último recurso
    let dataUrl = canvas.toDataURL('image/webp', 0.85)
    if (dataUrl.length > AVATAR_MAX_DATA_URL_LENGTH) dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    return dataUrl
  } finally {
    bitmap.close()
  }
}
