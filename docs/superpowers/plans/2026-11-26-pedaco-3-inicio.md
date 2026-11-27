# Pedaço 3 — Início completo: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela Início fiel ao Figma (desktop e mobile): destaques, catálogo com busca, filtros combináveis, ordenação, paginação e navegação para o NFT — tudo no estado da URL, com loading/vazio/erro e respostas fora de ordem tratadas.

**Architecture:** O catálogo continua dirigido pela URL (`validateSearch` com Zod) e por `useQuery` com chave = parâmetros (respostas obsoletas são descartadas pela chave e canceladas pelo `signal`). A página é dividida em seções em `src/features/home/` (hero, destaque, banners, diário, vantagens) e `src/features/catalog/` (barra lateral de filtros, gaveta mobile, barra de abas/ordenação, grade, card, paginação, busca). Conteúdo editorial é estático; ações fora do escopo usam `notifyUnavailable()`.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind 4, shadcn/ui (sheet, select, slider), Zod 4, MSW, Playwright.

**Spec:** [design](../specs/2026-11-26-nft-marketplace-design.md), [Desafio.md](../../../Desafio.md) §3 "Catálogo e detalhe", §8; Figma `docs/figma` (frames Início desktop e mobile).

## Global Constraints

- Busca, filtros (`category`, `network`, `minPrice`, `maxPrice`), aba, ordenação e página vivem na URL e sobrevivem a refresh e voltar/avançar.
- Qualquer mudança de filtro/busca/aba/ordenação volta para a página 1.
- Skeleton com shimmer preservando dimensões; respeitar `prefers-reduced-motion`.
- Sem overflow horizontal em 390/768/1440; foco visível; textos em português do Figma.
- ETH como string; comparação de preço via `decimal.js` (já no mock).

## Review Focus

- Digitar rápido na busca com latência variável → a lista final corresponde ao último termo (Task 1).
- `?minPrice=5&maxPrice=1` (faixa invertida) → tratada como vazia com mensagem, sem quebrar (Task 1).
- Página além do total (`?page=99`) → estado vazio com ação "Voltar à primeira página" (Task 1).
- Carrossel com teclado e leitor de tela → controles nomeados, sem autoplay com movimento reduzido (Task 2).
- Gaveta de filtros no mobile → foco preso, Esc fecha, aplicar fecha a gaveta (Task 1).

---

### Task 1: Catálogo — filtros, abas, ordenação, busca e paginação do Figma

**Files:**
- Create: `src/features/catalog/CatalogFilters.tsx` (conteúdo dos filtros), `src/features/catalog/FilterSidebar.tsx` (desktop), `src/features/catalog/FilterDrawer.tsx` (mobile, shadcn `sheet`), `src/features/catalog/CatalogToolbar.tsx` (abas + ordenar), `src/features/catalog/SearchBox.tsx`, `src/features/catalog/labels.ts`, `e2e/catalog.spec.ts`
- Modify: `src/routes/index.tsx`, `src/features/catalog/Pagination.tsx`, `src/components/layout/SiteHeader.tsx` (ícone de busca foca a busca do catálogo), `src/mocks/handlers/nfts.ts` (faixa invertida → vazio)

**Interfaces:**
- `labels.ts`: `CATEGORY_LABEL: Record<Category, string>` (Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade), `NETWORK_LABEL` (Ethereum, Polygon, Solana), `TAB_LABEL` (Todos os NFTs, Novos lançamentos, Em alta), `SORT_LABEL` (recent "Listados recentemente", price-asc "Menor preço", price-desc "Maior preço").
- `CatalogFilters({ search, facets, onChange })`: lista "Coleções" (botões com `aria-pressed`, contagem `(n)` do facet; clicar na ativa remove), "Faixa de preço" (slider de dois polegares entre `facets.priceRange.min/max`, texto "Preço: 0,02 - 12,30 ETH", botão "Aplicar" grava `minPrice/maxPrice`), "Rede" (idem Coleções). Botão "Limpar filtros" quando houver filtro.
- Desktop (≥ lg): barra lateral 310px à esquerda + card "NFT em destaque" (Task 2). Mobile/tablet: campo "Explorar coleções" + botão de filtros (ícone, `aria-label="Filtros"`, badge com nº de filtros ativos) que abre a gaveta.
- Toolbar: abas com `role=tablist`? Não — são filtros de navegação: `nav aria-label="Seções do catálogo"` com links (`aria-current`), "Ordenar por:" com select (oculto nas abas Novos/Em alta, que têm ordem própria).
- Busca: mobile campo visível; desktop o ícone do cabeçalho leva a `/#catalogo` e foca o campo de busca (campo visível na toolbar do catálogo no desktop também, compacto). Enter ou botão aplica `q`; botão limpar.
- Resumo acessível `aria-live="polite"`: "N NFTs encontrados" + chips dos filtros ativos com botão remover.
- Estados: skeleton (já existe), vazio ("Nenhum NFT encontrado para estes filtros." + "Limpar filtros"), erro (já existe), página além do total ("Esta página não existe." + "Voltar à primeira página"), atualização em segundo plano (indicador discreto "Atualizando…").
- Paginação do Figma: números, atual destacado em `bg-primary`, setas anterior/próxima com `aria-label`; elipses quando > 7 páginas.

- [ ] **Step 1: Testes** `e2e/catalog.spec.ts`:
  - `'filtros combinados refletem na URL e na lista'`: Coleções "Música" + Rede "Polygon" → URL com `category=musica&network=polygon`, todos os cards da página atual pertencem ao filtro (via resumo "N NFTs" > 0 e chips "Música", "Polygon").
  - `'mudar filtro volta para a página 1'`: `?page=3` → clicar Rede → URL sem `page`.
  - `'voltar no histórico restaura filtros'`: aplicar categoria, depois rede, `goBack()` → chip de rede some, categoria continua.
  - `'refresh mantém busca e ordenação'`: buscar "golden", ordenar "Menor preço", `reload()` → campo com "golden", primeiro preço ≤ segundo.
  - `'busca sem resultado mostra vazio e limpa'`: buscar "zzzz" → "Nenhum NFT encontrado" → "Limpar filtros" → lista volta.
  - `'respostas fora de ordem mostram o último termo'`: `withScenario({ latency: 'variable', seed: 7 })`; buscar "cosmic" e logo "golden" → resultados contêm apenas nomes com "Golden".
  - `'página inexistente oferece voltar'`: `?page=99` → "Esta página não existe." → botão → página 1.
  - `'faixa de preço filtra'`: `?minPrice=1&maxPrice=2` → todos os preços visíveis entre 1 e 2.
  - mobile: `'gaveta de filtros abre, aplica e fecha'`: botão "Filtros" → dialog → "Arte 3D" → fechar → chip "Arte 3D".
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (adicionar `sheet`, `slider` do shadcn; `select` nativo estilizado é aceitável). **Step 4:** suíte verde + typecheck + lint. **Step 5:** Commit `feat: catálogo com filtros, ordenação e busca do figma`.

### Task 2: Destaques e seções do Início

**Files:**
- Create: `src/features/home/HeroCarousel.tsx`, `src/features/home/FeaturedNft.tsx`, `src/features/home/PromoBanners.tsx`, `src/features/home/MintJournal.tsx`, `src/features/home/BenefitsStrip.tsx`, `src/features/home/content.ts`, `e2e/home.spec.ts`
- Modify: `src/routes/index.tsx`, `src/mocks/handlers/nfts.ts` (`GET /api/nfts/featured`), `src/api/nfts.ts` (`fetchFeaturedNfts`), `src/api/queryKeys.ts` (`nftKeys.featured`), `src/contracts/nft.ts` (`featuredResponseSchema = z.array(nftSummarySchema)`)

**Interfaces:**
- `GET /api/nfts/featured` → até 3 NFTs com `featured: true` (ordem estável).
- Hero (Figma): "Bem-vindo à Kurio", título "SEJA DONO DO FUTURO / DA ARTE DIGITAL" (desktop) e "SEJA DONO DA CULTURA DIGITAL" (mobile), texto de apoio, botão "EXPLORAR" (→ `#catalogo`), imagem do NFT destacado, 3 bolinhas = 3 slides dos featured. Carrossel: `section aria-roledescription="carrossel" aria-label="Destaques"`, slides `role=group aria-roledescription="slide" aria-label="1 de 3"`, botões das bolinhas `aria-label="Ir para o destaque N"`, autoplay de 6s pausado em hover/foco e desligado com `prefers-reduced-motion`. Imagem do 1º slide `fetchpriority=high` (LCP).
- "NFT EM DESTAQUE / OFERTA LIMITADA" (sidebar desktop): card com imagem do 1º featured, link para o NFT.
- Banners: "Lançamentos gênesis de edição limitada" e "Arte digital selecionada e muito mais", botão "Explorar →" (→ `#catalogo` com aba Novos / Todos).
- Diário da Cunhagem: título, subtítulo e 4 cards estáticos (datas e textos do Figma), "Ler mais →" → `notifyUnavailable`.
- Vantagens: W "Segurança da carteira", C "Criadores em destaque", D "Alertas de lançamentos" + "Antecipe-se ao próximo lançamento" com campo de e-mail e "Enviar" → valida o e-mail e chama `notifyUnavailable` (não finge inscrever).
- Card do catálogo vira link para `/nft/$id` (rota do pedaço 4; até lá 404).

- [ ] **Step 1: Testes** `e2e/home.spec.ts`: hero mostra título e "EXPLORAR" leva ao catálogo; bolinha 2 troca o slide (`aria-label="2 de 3"` visível); com `reducedMotion: 'reduce'` o slide não troca sozinho em 7s; card do catálogo tem link `/nft/nft-001`; newsletter com e-mail inválido mostra erro no campo e com válido mostra o aviso de demo; "Ler mais" mostra o aviso.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** verde. **Step 5:** Commit `feat: destaques e seções editoriais do início`.

### Task 3: Fidelidade e pendências do pedaço 1

**Files:** Modify: `NftCard.tsx` (visual do Figma: fundo do card, selo "RARO" laranja colado à esquerda, nome `#042`, preço e preço riscado), `SiteHeader.tsx`/`MobileTabBar.tsx` (só "Início" com `aria-current` na home), `__root.tsx` (`Toaster mobileOffset` acima da barra inferior), `playwright.config.ts` (projeto `tablet` 768×1024), `e2e/visual.spec.ts`.

- [ ] **Step 1: Testes**: `'só um link é a página atual'` (um único `aria-current="page"` por navegação); `'toast não cobre a barra inferior'` (mobile: bounding box do toast acima da barra); projeto tablet roda a suíte de layout; `visual.spec.ts` com `toHaveScreenshot('inicio.png', { fullPage: true, mask: [carrossel] })` desktop e mobile (cenário `latency: 'none'`, animações desligadas).
- [ ] **Step 2–4:** FAIL → implementar → verde (`--update-snapshots` só para criar a baseline inicial). **Step 5:** Commit `feat: card do figma, ajustes de acessibilidade e baseline visual do início`.

### Task 4: Primeiro deploy (Vercel)

**Files:** Create: `vercel.json` (rewrite SPA `/(.*)` → `/index.html`, exceto arquivos estáticos), `.env.production` (`VITE_ENABLE_MOCKS=true` — o desafio exige os mocks na demo publicada).

- [ ] **Step 1:** `npm run build && npx vite preview --port 4173` e Playwright smoke contra o preview (`BASE_URL=http://localhost:4173`): home lista NFTs; `/perfil` direto abre login; `/qualquer` mostra 404 do app.
- [ ] **Step 2:** **Pedir confirmação à pessoa** e conduzir o deploy (conta Vercel dela/do amigo: `npx vercel` ou importação do repositório no painel). Registrar a URL pública no README.
- [ ] **Step 3:** Commit `chore: configuração de deploy na vercel`.
