# Pedaço 1 — Assets e esqueleto: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Imagens nítidas e leves vindas do Figma, layout comum a todas as telas (cabeçalho, rodapé, barra inferior mobile), página 404 e a base de testes Playwright.

**Architecture:** As artes originais saem do SVG do Figma por um script reprodutível e viram `.webp` em dois tamanhos. O layout vive na rota raiz (`__root.tsx`) com componentes em `src/components/layout/`. Links fora do escopo disparam um aviso (toast) em vez de fingirem funcionar. Playwright roda contra o dev server com mocks, em dois projetos: desktop 1440 e mobile 390.

**Tech Stack:** Vite 8, React 19, TanStack Router, Tailwind 4, shadcn/ui (sonner), lucide-react, sharp (script de assets), @playwright/test.

**Spec:** [docs/superpowers/specs/2026-11-26-nft-marketplace-design.md](../specs/2026-11-26-nft-marketplace-design.md) e [Desafio.md](../../../Desafio.md)

## Global Constraints

- Textos da interface em português, como no Figma.
- Ação fora do escopo nunca aparenta sucesso: mostra "Esta seção não faz parte da demonstração."
- Sem overflow horizontal em 390, 768 e 1440 px.
- Foco visível em todo elemento interativo; imagens relevantes com `alt`.
- Cores e fontes só pelos tokens já existentes em `src/index.css`.

## Review Focus

- Largura 390 px: rodapé e cabeçalho não podem gerar rolagem horizontal → teste `no horizontal overflow` (Task 3).
- Barra inferior fixa cobrindo o fim da página no mobile → `main` com `pb-24` no mobile; verificado no teste do rodapé visível (Task 3).
- Acesso direto a rota inexistente (ex.: `/nft/abc/xyz`) → 404 dentro do layout (Task 3).
- Usuário de teclado: link "Pular para o conteúdo" é o primeiro foco (Task 3).
- Imagem pedida em tela pequena baixando a versão grande → `srcset`/`sizes` no card (Task 2).

---

### Task 1: Playwright e teste de fumaça

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts e devDependency), `.gitignore`, `vite.config.ts` (`__dirname` → `import.meta.dirname`)

**Interfaces:**
- Produces: projetos Playwright `desktop` (1440×900) e `mobile` (390×844, `isMobile`, `hasTouch`), ambos Chromium; `webServer` = `npm run dev -- --port 5174 --strictPort`, `baseURL` `http://localhost:5174`, `reuseExistingServer: !process.env.CI`; `trace: 'retain-on-failure'`, reporter `html` + `list`.
- Produces scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`, `"typecheck": "tsc -b"`.

- [ ] **Step 1:** `npm i -D @playwright/test` e `npx playwright install chromium`.
- [ ] **Step 2: Teste** `e2e/smoke.spec.ts` — `'a home lista NFTs'`: `goto('/')`; espera `page.getByRole('list').first().getByRole('listitem')` ter ao menos 1 item (`toHaveCount` não; usar `.first()` `toBeVisible()`).
- [ ] **Step 3:** Config e scripts conforme Interfaces; `.gitignore` ganha `playwright-report/`, `test-results/`, `blob-report/`.
- [ ] **Step 4:** `npm run test:e2e` → 2 passed (desktop e mobile).
- [ ] **Step 5:** Commit `test: playwright com projetos desktop e mobile`.

### Task 2: Artes do Figma em webp

**Files:**
- Create: `scripts/extract-figma-assets.mjs`, `public/images/nfts/{emerald-ape,sage-nomad,ivory-baron,golden-beat}.webp` e `-480.webp`, `src/lib/images.ts`, `e2e/images.spec.ts`
- Modify: `src/features/catalog/NftCard.tsx`, `package.json` (`"assets:figma": "node scripts/extract-figma-assets.mjs"`)
- Delete: `public/images/nfts/*.jpg`

**Interfaces:**
- Produces: `srcSetFor(image: string): string` em `src/lib/images.ts` — para `/images/nfts/x.webp` devolve `/images/nfts/x-480.webp 480w, /images/nfts/x.webp 960w`.
- O contrato `image` dos NFTs não muda (continua `/images/nfts/<key>.webp`).

- [ ] **Step 1: Teste** `e2e/images.spec.ts` — `'as imagens dos cards carregam'`: na home, a primeira `img` dentro da lista tem `naturalWidth > 0` (via `evaluate`) e atributo `srcset` contendo `-480.webp 480w`.
- [ ] **Step 2:** Rodar → FAIL (jpg/webp inexistente).
- [ ] **Step 3:** Script lê `docs/figma/Frontend Challenge.svg`, extrai os `data:image/png;base64` na ordem do arquivo e mapeia índice → chave: `0 emerald-ape, 1 sage-nomad, 2 ivory-baron, 3 golden-beat`; com `sharp` grava 960 px (`quality: 80`) e 480 px. `npm i -D sharp`. Rodar `npm run assets:figma`; apagar os `.jpg`.
- [ ] **Step 4:** `NftCard` usa `srcSet={srcSetFor(nft.image)}` e `sizes="(min-width: 1024px) 260px, 45vw"`.
- [ ] **Step 5:** `npm run test:e2e` → tudo passa.
- [ ] **Step 6:** Commit `feat: artes do figma em webp responsivo` (inclui `docs/figma/`, fonte dos assets).

### Task 3: Layout, avisos e 404

**Files:**
- Create: `src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx`, `MobileTabBar.tsx`, `NotFound.tsx`; `src/lib/unavailable.ts`; `src/components/ui/sonner.tsx` (via `npx shadcn@latest add sonner`); `public/favicon.svg`; `e2e/layout.spec.ts`
- Modify: `src/routes/__root.tsx`, `index.html`

**Interfaces:**
- Produces: `notifyUnavailable(): void` em `src/lib/unavailable.ts` — `toast('Esta seção não faz parte da demonstração.')`.
- Produces: `Route` raiz com `notFoundComponent: NotFound`; `<main id="conteudo">` envolve o `Outlet`.
- Rotas referenciadas antes de existirem (vão dar 404 até seus pedaços): `/entrar`, `/carrinho`, `/favoritos`, `/perfil`.

**Conteúdo fixado pelo Figma:**
- Cabeçalho (≥ md): "KURIO" (link `/`), nav "Início" `/`, "Mercado" `/` + `hash: 'catalogo'`, "Criadores" e "Aprenda" → `notifyUnavailable`; ícones Buscar (`/` `#catalogo`), Carrinho (`/carrinho`, `aria-label="Carrinho"`), botão "Entrar" (`/entrar`). Item ativo em `text-primary` com sublinhado de 2 px; linha inferior `border-border`. Largura útil 1200 px centralizada.
- Barra inferior (< md, `nav aria-label="Navegação inferior"`, fixa): Início `/`, Favoritos `/favoritos`, botão central redondo Explorar (`/#catalogo`), Carrinho `/carrinho`, Perfil `/perfil`; ícones lucide `House, Heart, ScanLine, ShoppingCart, User`.
- Rodapé: faixa marrom (`bg-surface-dark`) com "KURIO", "Feito para colecionadores, criadores e cultura", "contato@email.com" (`mailto:`), "+55 11 4002 8922" (`tel:`); colunas "Meu perfil" (Meu perfil → `/perfil`; demais → aviso), "Central de ajuda" (todos → aviso), "Coleções" (Arte digital, Fotografia, Música, Arte 3D, Utilidade → `/?category=<slug>`), "Redes sociais" (links externos `target="_blank" rel="noopener noreferrer"`), "Carteiras compatíveis" (selo METAMASK · WALLETCONNECT · COINBASE); linha "© 2026 Kurio. Propriedade digital para todos." Colunas empilham em 2 no mobile.
- 404: título "Página não encontrada", texto curto, link "Voltar ao início".
- `index.html`: `lang="pt-BR"`, `<title>Kurio — Marketplace de NFTs</title>`, `meta description`, `theme-color #140d0a`, favicon "K" em `#d28a4c`.
- Link "Pular para o conteúdo" (`sr-only focus:not-sr-only`) → `#conteudo`.

- [ ] **Step 1: Testes** `e2e/layout.spec.ts`:
  - `'cabeçalho marca a página atual'` (só desktop): link "Início" com `aria-current="page"`.
  - `'barra inferior aparece só no mobile'`: mobile → `navigation` "Navegação inferior" visível; desktop → oculta.
  - `'seção fora do escopo avisa'` (só desktop): clicar "Criadores" → texto "Esta seção não faz parte da demonstração." visível.
  - `'rota inexistente mostra 404'`: `goto('/nft/abc/xyz')` → heading "Página não encontrada"; link "Voltar ao início" leva a `/`.
  - `'rodapé visível e sem overflow horizontal'`: rolar até o fim, `contentinfo` visível e `document.documentElement.scrollWidth <= innerWidth`.
  - `'primeiro Tab foca o pular conteúdo'`: `keyboard.press('Tab')` → link "Pular para o conteúdo" focado.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar componentes, `__root.tsx` e `index.html`.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm run test:e2e` → tudo passa.
- [ ] **Step 5:** Verificação manual pela pessoa em 1440 e 390 px (DevTools) comparando com `docs/figma`.
- [ ] **Step 6:** Commit `feat: layout base, avisos de escopo e 404`.
