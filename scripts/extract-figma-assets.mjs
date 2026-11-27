// Extrai as artes originais dos NFTs embutidas no SVG exportado do Figma
// e gera versões .webp em dois tamanhos para o catálogo.
//
// Uso: npm run assets:figma
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const svgPath = path.join(root, 'docs/figma/Frontend Challenge.svg')
const outDir = path.join(root, 'public/images/nfts')

// Ordem em que as imagens aparecem dentro do SVG
const KEYS = ['emerald-ape', 'sage-nomad', 'ivory-baron', 'golden-beat']
const SIZES = [
  { width: 960, suffix: '' },
  { width: 480, suffix: '-480' },
]

const svg = await readFile(svgPath, 'utf8')
const images = [...svg.matchAll(/xlink:href="data:image\/png;base64,([^"]+)"/g)].map((m) =>
  Buffer.from(m[1], 'base64'),
)

if (images.length !== KEYS.length) {
  throw new Error(`Esperava ${KEYS.length} imagens no SVG, encontrei ${images.length}`)
}

await mkdir(outDir, { recursive: true })

for (const [index, key] of KEYS.entries()) {
  for (const { width, suffix } of SIZES) {
    const file = path.join(outDir, `${key}${suffix}.webp`)
    const info = await sharp(images[index]).resize({ width }).webp({ quality: 80 }).toFile(file)
    console.log(`${path.relative(root, file)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`)
  }
}
