# Auditoria Lighthouse

Gerado em 2026-11-27T19:00:39.890Z por `npm run lighthouse` (build de produção servido com `vite preview`, API simulada ligada).

Mediana de 3 medições por página e perfil (navegador novo a cada medição).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| inicio | mobile | 52 | 100 | 100 | 100 | 5.71 s | 0.021 | 765 ms |
| inicio | desktop | 98 | 100 | 100 | 100 | 1.08 s | 0.002 | 29 ms |
| detalhe | mobile | 66 | 100 | 100 | 100 | 4.71 s | 0.000 | 381 ms |
| detalhe | desktop | 97 | 100 | 100 | 100 | 1.16 s | 0.000 | 42 ms |

Metas do desafio: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Medições individuais (Perf / A11y / BP / SEO)
- inicio mobile: 52/100/100/100 · 51/100/100/100 · 57/100/100/100
- inicio desktop: 98/100/100/100 · 97/100/100/100 · 98/100/100/100
- detalhe mobile: 66/100/100/100 · 65/100/100/100 · 69/100/100/100
- detalhe desktop: 97/100/100/100 · 97/100/100/100 · 97/100/100/100

## Ambiente
- Lighthouse 12.8.2; chrome-launcher; Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36
- Node v22.15.1; Windows_NT 10.0.22631; CPU 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 núcleos); RAM 16 GB
- Perfis: mobile = padrão do Lighthouse (Moto G Power emulado, 4G lento, CPU 4x); desktop = `desktop-config` do Lighthouse

## Análise dos resultados

**Metas atingidas:** Accessibility, Best Practices e SEO em 100 nas duas páginas e nos dois perfis; Performance no desktop entre 97 e 98; CLS praticamente zero em todos os casos.

**Performance no mobile abaixo da meta (52–66).** Causas identificadas nos relatórios (perfil mobile do Lighthouse: CPU 4× mais lenta e 4G lento):

1. **LCP (~4,7–5,7 s) é dominado pelo "render delay"** (~5 s), não pelo download da imagem (~80 ms). O elemento de LCP é o primeiro card do catálogo, que depende da cadeia JS do app → Service Worker do MSW ativo → resposta da API simulada → render. Num app com backend real, a API não dependeria de JavaScript no próprio navegador.
2. **TBT (~380–770 ms):** tarefas longas na execução do bundle principal (~860 ms de script sob CPU 4×), da camada de mocks (MSW, handlers, servidor Socket.IO simulado e schemas Zod, ~400 ms) e dos ícones. O desafio exige os mocks ativos no build de demonstração, então esse custo está no caminho crítico da auditoria.
3. **FCP (~3,6 s):** aplicação 100% client-side (sem SSR/pré-renderização); nada é pintado até o JavaScript principal baixar e executar no 4G simulado.

**O que já foi feito:** imagens em WebP com versão de 480 px garantida no celular (`<picture>`), pré-carregamento da imagem do hero, code splitting por rota, render sem esperar o MSW (só as requisições aguardam), altura mínima do conteúdo (CLS), sem fontes ou scripts de terceiros.

**Tentado e descartado:** render inicial dentro de `startTransition` (fatiar o primeiro render) — sem ganho mensurável (59–63 vs 61–65), revertido.

**Próximos passos possíveis:** pré-renderizar o "esqueleto" da página no HTML (FCP/LCP sem depender do JS), carregar a camada de mocks e o servidor de tempo real depois da primeira interação útil, e separar dependências pesadas (Radix/Zod) do bundle inicial.
