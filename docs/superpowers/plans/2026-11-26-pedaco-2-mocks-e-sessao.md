# Pedaço 2 — API simulada, login e sessão: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cenários de rede configuráveis e reproduzíveis no MSW, contas fictícias com cadastro/login/sessão/expiração/logout, modal de autenticação do Figma e proteção das rotas privadas.

**Architecture:** Um handler MSW "de rede" na frente de todos aplica latência e falhas a `/api/*` e passa adiante (fallthrough). O estado dos mocks (usuários com senha em hash, sessões) vive no banco simulado em localStorage, restaurável por reset. No cliente, um token de sessão vai no header `Authorization`; a sessão é uma query do TanStack Query; um interceptor Axios trata `SESSION_EXPIRED`. O modal de login/cadastro abre por parâmetro de busca na raiz (`?auth=entrar|cadastro&redirect=...`), sobre a página atual — como no Figma, e preservando o contexto. Rotas privadas ficam sob um layout `_privado` com `beforeLoad`.

**Tech Stack:** MSW 3 (`http`, `HttpResponse`, `delay`), Axios, TanStack Query/Router, Zod 4, shadcn/ui (dialog, input, label, dropdown-menu), react-hook-form + @hookform/resolvers, Playwright.

**Spec:** [design](../specs/2026-11-26-nft-marketplace-design.md) e [Desafio.md](../../../Desafio.md) §3 Conta e sessão, §5, §6.

## Global Constraints

- Mocks só na camada de rede: componentes, hooks e cliente Axios não contêm respostas fictícias.
- Senhas nunca em claro: o banco simulado guarda `sha256(salt + ':' + senha)` (Web Crypto).
- Erros seguem `apiErrorSchema` (`src/contracts/common.ts`): `{ code, message, fieldErrors? }`.
- Credenciais fictícias: `ana@kurio.dev` / `Kurio@123` (nome "ana") e `bruno@kurio.dev` / `Kurio@123` (nome "bruno").
- Login social e "Esqueceu a senha?" → `notifyUnavailable()`.
- Logout e troca de usuário limpam todo o cache do TanStack Query.
- Textos em português.

## Review Focus

- Duplo clique em "Entrar"/"Criar conta" → botão desabilitado enquanto envia; uma só requisição (Task 3).
- `redirect` malicioso (`?redirect=https://evil.com`) → só aceita caminhos internos começando com `/` e sem `//` (Task 3).
- Token no localStorage de uma sessão que o "servidor" não conhece mais (após reset) → sessão tratada como deslogada, sem loop de redirecionamento (Task 4).
- Expiração durante uma requisição em andamento numa página pública → aviso, mas a página pública continua utilizável (Task 4).
- Cenário salvo no localStorage esquecido ligado → painel mostra claramente o cenário ativo diferente de "padrão" (Task 1).

---

### Task 1: Cenários de rede e painel de controle

**Files:**
- Create: `src/mocks/scenario.ts`, `src/mocks/handlers/network.ts`, `src/mocks/control.ts`, `src/mocks/MockPanel.tsx`, `src/api/errors.ts` (só `isTransient` aqui), `e2e/support/mocks.ts`, `e2e/mocks.spec.ts`
- Modify: `src/mocks/handlers/index.ts` (network primeiro), `src/mocks/db/index.ts` (STORAGE_KEY `kurio:mock-db:v2`), `src/main.tsx` (instala controle e painel quando mocks ativos), `src/api/client.ts` (`timeout: 8000`)

**Interfaces:**
- Produces `src/mocks/scenario.ts`:
  - `type LatencyMode = 'none' | 'normal' | 'slow' | 'variable'` — atrasos: none 0; normal 150ms; slow 2500ms; variable 100–1500ms por PRNG `mulberry32(seed + contadorDeRequisicoes)`.
  - `type FailureKind = 'http-500' | 'http-503' | 'network' | 'timeout'`
  - `interface FailureRule { method: string; path: string; kind: FailureKind; times: number }` — `path` casa por prefixo (`/api/nfts` casa `/api/nfts?page=2` e `/api/nfts/nft-001`); `times` decrementa a cada uso e a regra some no zero.
  - `interface Scenario { preset: PresetName; latency: LatencyMode; seed: number; failures: FailureRule[] }`
  - `type PresetName = 'padrao' | 'lento' | 'instavel' | 'offline'` (offline = falha `network` em `/api/` com `times: Infinity`, serializado como `-1`)
  - `getScenario(): Scenario`, `setScenario(patch: Partial<Scenario>): void`, `applyPreset(name: PresetName): void`, `nextDelay(): number`, `takeFailure(method: string, path: string): FailureKind | null`
  - Persistência em `localStorage['kurio:mock-scenario']`; `?cenario=<preset>` na URL aplica o preset no carregamento.
- Produces `src/mocks/handlers/network.ts`: `networkHandler = http.all('/api/*', ...)` — aguarda `nextDelay()`; se `takeFailure` → `http-500`/`http-503` devolvem `{ code: 'TRANSIENT_ERROR', message: 'Serviço temporariamente indisponível.' }`; `network` → `HttpResponse.error()`; `timeout` → `delay(15_000)` e depois 503. Sem falha: não retorna nada (fallthrough).
- Produces `src/mocks/control.ts`: `installMockControl()` define `window.__kurioMocks = { getScenario, setScenario, applyPreset, failNext(method, path, kind, times = 1), reset(), expireSession() }`. `reset()` = `resetDb()` + apaga toda chave `kurio:*` do localStorage + volta o cenário ao padrão + `location.reload()`. `expireSession()` só entra no objeto na Task 2.
- Produces `src/mocks/MockPanel.tsx`: botão flutuante "Cenários" (canto inferior esquerdo, acima da barra mobile) que abre um painel (shadcn `sheet` ou `dialog`) com: select de preset, select de latência, botão "Falhar próxima requisição do catálogo (500)", "Resetar dados da demo". Badge "cenário: <preset>" visível quando ≠ padrão.
- Produces `e2e/support/mocks.ts`: `withScenario(page, partial: Partial<Scenario>)` (via `page.addInitScript` gravando `kurio:mock-scenario`) e `mocks(page)` → `page.evaluate` em `window.__kurioMocks`.

- [ ] **Step 1: Testes** `e2e/mocks.spec.ts`:
  - `'catálogo lento mostra skeleton e depois os NFTs'`: `withScenario({ latency: 'slow' })`; `goto('/')`; `getByRole('status', { name: 'Carregando NFTs' })` visível; depois primeiro card visível.
  - `'falha 500 mostra erro e recupera ao tentar de novo'`: `withScenario({ failures: [{ method: 'GET', path: '/api/nfts', kind: 'http-500', times: 3 }] })` (3 = tentativa inicial + 2 retries automáticos); erro `role=alert` "Não foi possível carregar os NFTs." visível; clicar "Tentar de novo" → cards visíveis.
  - `'offline mostra erro'`: `?cenario=offline` → alerta de erro visível.
  - `'painel indica cenário ativo'`: `?cenario=lento` → botão "Cenários" mostra "lento".
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar. QueryClient do `main.tsx`: `retry: (count, err) => isTransient(err) && count < 2` (transitória = sem resposta HTTP ou status ≥ 500; `isTransient` nasce aqui em `src/api/errors.ts` e a Task 3 a reaproveita), `retryDelay` 300 ms; mutations sem retry.
- [ ] **Step 4:** `npm run test:e2e` → tudo passa; `npm run typecheck && npm run lint` limpos.
- [ ] **Step 5:** Commit `feat: cenários de rede configuráveis no msw`.

### Task 2: Contratos e API simulada de autenticação

**Files:**
- Create: `src/contracts/auth.ts`, `src/mocks/db/fixtures/users.ts`, `src/mocks/db/crypto.ts`, `src/mocks/handlers/auth.ts`, `e2e/auth-api.spec.ts`
- Modify: `src/mocks/db/index.ts` (estado ganha `users` e `sessions`), `src/mocks/handlers/index.ts`, `src/mocks/control.ts` (`expireSession`)

**Interfaces:**
- Produces `src/contracts/auth.ts`:
  - `userSchema = { id: string, username: string, email: string, avatarUrl: string | null }`
  - `sessionSchema = { token: string, user: userSchema, expiresAt: string }`
  - `loginInputSchema = { email: z.email('Informe um e-mail válido.'), password: z.string().min(1, 'Informe sua senha.') }`
  - `registerInputSchema = { username: 3–20 chars `[a-z0-9_.]` msg 'Use de 3 a 20 letras minúsculas, números, _ ou .', email, password: ≥ 8 com letra e número msg 'A senha precisa de 8+ caracteres, com letras e números.', confirmPassword }` com refine `confirmPassword === password` → path `confirmPassword`, msg 'As senhas não conferem.'
  - Tipos `User`, `Session`, `LoginInput`, `RegisterInput`.
- Produces `src/mocks/db/crypto.ts`: `hashPassword(salt: string, password: string): Promise<string>` (hex de SHA-256 de `${salt}:${password}`).
- Fixtures: ana (`user-ana`, salt `s4lt-ana-01`, hash `6dc229f0d749cf0821133058b238256f86b536ef4b5c18a7e9a7efe59439dd0e`), bruno (`user-bruno`, salt `s4lt-bruno-02`, hash `35bb74146abc4b980215fb9b943fc2a2db1d4b3a013b7022c717bdea45c4f2c2`).
- Produces db: `expireAllSessions(): void` (põe `expiresAt` no passado e salva).
- Endpoints (todos JSON, sessão TTL 30 min, token `crypto.randomUUID()`):
  - `POST /api/auth/register` → 201 `Session`; 400 `VALIDATION_ERROR` com `fieldErrors`; 409 `CONFLICT` com `fieldErrors.email = ['Este e-mail já está cadastrado.']` ou `fieldErrors.username = ['Este nome de usuário já está em uso.']`.
  - `POST /api/auth/login` → 200 `Session`; 400 `VALIDATION_ERROR`; 401 `UNAUTHENTICATED` 'E-mail ou senha incorretos.'
  - `GET /api/auth/session` → 200 `Session`; sem token/token desconhecido 401 `UNAUTHENTICATED`; expirado 401 `SESSION_EXPIRED` 'Sua sessão expirou. Entre novamente.'
  - `POST /api/auth/logout` → 204 (remove a sessão; idempotente).
  - Helper exportado `requireSession(request): { user } | Response` em `handlers/auth.ts`, reutilizado por todo handler privado dos próximos pedaços.

- [ ] **Step 1: Testes** `e2e/auth-api.spec.ts` (chamadas `fetch` dentro da página, passando pelo MSW): login ok devolve `user.username === 'ana'`; senha errada → 401 `UNAUTHENTICATED`; cadastro com `ana@kurio.dev` → 409 com `fieldErrors.email`; sessão após `expireSession()` → 401 `SESSION_EXPIRED`; o banco salvo no localStorage não contém a string `Kurio@123`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** tudo passa. **Step 5:** Commit `feat: api simulada de autenticação`.

### Task 3: Sessão no cliente e modal de login/cadastro

**Files:**
- Create: `src/api/auth.ts`, `src/features/auth/session.ts`, `src/features/auth/AuthDialog.tsx`, `src/features/auth/LoginForm.tsx`, `src/features/auth/RegisterForm.tsx`, `src/features/auth/PasswordInput.tsx`, `src/features/auth/UserMenu.tsx`, `src/lib/safe-redirect.ts`, `e2e/auth.spec.ts`; shadcn `dialog`, `input`, `label`, `dropdown-menu`
- Modify: `src/api/errors.ts` (ganha `ApiRequestError`/`toApiError`), `src/api/client.ts` (header `Authorization: Bearer <token>`), `src/routes/__root.tsx` (`validateSearch` com `auth`/`redirect`, renderiza `AuthDialog`), `src/components/layout/SiteHeader.tsx` ("Entrar" abre `?auth=entrar`; logado mostra `UserMenu`), `src/main.tsx` (router `context: { queryClient }`; root vira `createRootRouteWithContext`)

**Interfaces:**
- Produces `src/api/errors.ts`: `class ApiRequestError extends Error { code: ApiError['code'] | 'NETWORK_ERROR' | 'TIMEOUT'; status: number | null; fieldErrors?: Record<string, string[]> }`, `toApiError(err: unknown): ApiRequestError`, `isTransient(err: unknown): boolean` (NETWORK_ERROR, TIMEOUT, TRANSIENT_ERROR, status ≥ 500). Um interceptor de resposta do Axios converte todo erro em `ApiRequestError`.
- Produces `src/features/auth/session.ts`: `TOKEN_KEY = 'kurio:session-token'`; `sessionQueryOptions` (key `['session']`, `staleTime: Infinity`, `retry: false`, devolve `Session | null` — 401 vira `null`); `useSession(): { user: User | null; isPending: boolean }`; `useLogin()`, `useRegister()`, `useLogout()` (mutations). Login/cadastro: grava token, `queryClient.clear()`, `setQueryData(['session'], session)`. Logout: chama API, apaga token, `queryClient.clear()`, `setQueryData(['session'], null)`, toast "Você saiu da sua conta.", navega para `/`.
- Produces `src/lib/safe-redirect.ts`: `safeRedirect(value: unknown): string` — devolve o valor se começa com `/` e não com `//`; senão `'/'`.
- Root search: `{ auth?: 'entrar' | 'cadastro'; redirect?: string }` (Zod com `.catch(undefined)`), ambos removidos da URL ao fechar o modal.
- `AuthDialog`: abas "Entrar" | "Criar conta" (trocar aba troca `auth` na URL); texto de apoio do Figma ("Entre para gerenciar sua carteira, coleção e perfil criador." / "Crie seu perfil de colecionador e conecte uma carteira quando quiser."); campos com `label` (visualmente ocultos quando o Figma só tem placeholder), erro em `<p id>` ligado por `aria-describedby` + `aria-invalid`; erros da API em `fieldErrors` caem no campo, os demais num `role=alert` no topo do formulário; botão desabilitado e com texto "Entrando..."/"Criando conta..." durante o envio; "Ou continue com" + Google/Facebook → aviso. Sucesso: fecha e navega para `safeRedirect(redirect)` (ou fica na página atual sem os parâmetros), toast "Olá, <username>!". Mobile (< md): dialog em tela cheia com "KURIO" no topo, títulos "Entrar" / "Criar perfil de colecionador" e links "Novo na Kurio? Crie uma conta" / "Já tem uma conta? Entre".
- `UserMenu` (desktop): botão com o username → itens "Meu perfil" (`/perfil`) e "Sair".

- [ ] **Step 1: Testes** `e2e/auth.spec.ts` (estado isolado: cada teste começa com `localStorage` limpo — o contexto do Playwright já é novo por teste):
  - `'login com sucesso mostra o usuário'`: abrir `/?auth=entrar`, preencher ana, Entrar → toast "Olá, ana!"; desktop: botão "ana" no cabeçalho; dialog fechado; URL sem `auth`.
  - `'credenciais erradas mostram erro'`: senha `errada123` → alerta "E-mail ou senha incorretos."
  - `'validação associa erro ao campo'`: enviar vazio → campo "E-mail" com `aria-invalid="true"` e descrição "Informe um e-mail válido."
  - `'cadastro com e-mail existente mostra conflito'`: aba Criar conta, `ana@kurio.dev` → erro no campo e-mail "Este e-mail já está cadastrado."
  - `'cadastro novo entra na conta'`: `carla` / `carla@kurio.dev` / `Kurio@123` x2 → toast "Olá, carla!".
  - `'sessão sobrevive ao refresh'`: login → `reload()` → (desktop) botão "ana" visível.
  - `'redirect externo é ignorado'`: `/?auth=entrar&redirect=//evil.com` → login → URL continua em `localhost`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** tudo passa + typecheck + lint. **Step 5:** Commit `feat: login, cadastro e sessão no cliente`.

### Task 4: Rotas privadas, expiração e logout

**Files:**
- Create: `src/routes/_privado.tsx` (layout com `beforeLoad`), `src/routes/_privado/perfil.tsx` (página provisória "Meu perfil" com username e e-mail — substituída no pedaço 8), `src/features/auth/expiration.ts`, `e2e/session.spec.ts`
- Modify: `src/main.tsx` (instala interceptor de expiração), `src/components/layout/MobileTabBar.tsx` e `SiteFooter.tsx` (`/perfil` vira `<Link>`)

**Interfaces:**
- `_privado.beforeLoad({ context, location })`: `const session = await context.queryClient.ensureQueryData(sessionQueryOptions)`; sem sessão → `throw redirect({ to: '/', search: { auth: 'entrar', redirect: location.href } })`.
- `installSessionExpiryHandler({ router, queryClient })` em `expiration.ts`: interceptor Axios; resposta 401 `SESSION_EXPIRED` em qualquer chamada que **não** seja `/api/auth/*` (e também quando a própria query de sessão recebe `SESSION_EXPIRED`) → apaga token, `queryClient.clear()`, `setQueryData(['session'], null)`, toast "Sua sessão expirou. Entre novamente.", e se a rota atual for privada navega para `/?auth=entrar&redirect=<rota atual>`; se pública, só abre `?auth=entrar` na própria página. Disparo único por expiração (flag até o próximo login).

- [ ] **Step 1: Testes** `e2e/session.spec.ts`:
  - `'rota privada pede login e volta para ela'`: `goto('/perfil')` → dialog "Entrar" aberto e URL com `redirect=%2Fperfil`; login ana → heading "Meu perfil" e texto `ana@kurio.dev`.
  - `'expiração durante a navegação preserva o destino'`: login → `/perfil` → `mocks.expireSession()` → `reload()` → toast "Sua sessão expirou. Entre novamente." e dialog aberto; login → volta a "Meu perfil".
  - `'logout limpa a sessão'`: login → `/perfil` → (desktop: menu "ana" → "Sair"; mobile: botão "Sair" na página de perfil) → toast "Você saiu da sua conta."; `goto('/perfil')` pede login.
  - `'troca de usuário não mostra dados do anterior'`: login ana → logout → login bruno → `/perfil` mostra `bruno@kurio.dev` e não contém `ana@kurio.dev`.
  - `'token desconhecido após reset não gera loop'`: login → `mocks.reset()` → `/perfil` → dialog de login aberto (uma vez), página responsiva.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (página provisória tem botão "Sair" para o mobile). **Step 4:** tudo passa + typecheck + lint. **Step 5:** Commit `feat: rotas privadas, expiração e logout`.
