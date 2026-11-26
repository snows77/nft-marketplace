// "/images/nfts/x.webp" -> "/images/nfts/x-480.webp 480w, /images/nfts/x.webp 960w"
// O navegador escolhe a menor versão que atende ao tamanho exibido na tela.
export function srcSetFor(image: string): string {
  const small = image.replace(/\.webp$/, '-480.webp')
  return `${small} 480w, ${image} 960w`
}
