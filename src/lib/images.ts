// "/images/nfts/x.webp" -> "/images/nfts/x-480.webp" (versão de 480px)
export function smallImage(image: string): string {
  return image.replace(/\.webp$/, '-480.webp')
}

// "/images/nfts/x.webp" -> "/images/nfts/x-480.webp 480w, /images/nfts/x.webp 960w"
// O navegador escolhe a menor versão que atende ao tamanho exibido na tela.
export function srcSetFor(image: string): string {
  return `${smallImage(image)} 480w, ${image} 960w`
}
