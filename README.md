# Kurio — Marketplace de NFTs

Solução do desafio frontend ([Desafio.md](Desafio.md)): descoberta, compra e conta do colecionador, em desktop e mobile, seguindo o [Figma](docs/figma/). Toda a API (REST e tempo real) é simulada com **MSW** na camada de rede, inclusive na versão publicada.

**Demo pública:** https://nft-marketplace-two-zeta.vercel.app (deploy da Vercel a cada push na branch de produção; a API simulada roda no navegador)

**Stack:** React 19 · TypeScript · Vite 8 · TanStack Router · TanStack Query · Axios · Zod · Socket.IO (client) · Tailwind CSS 4 · shadcn/ui · MSW 3 · Playwright · Lighthouse.

Detalhes de arquitetura, contratos, cache, sessão, carrinho, tempo real, limitações e desvios do Figma: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Como rodar

Requisitos: **Node 22+** e npm.

```bash
npm install
npm run dev            # http://localhost:5173 — com a API simulada ligada
```

Depois de cada `git pull` que mudar `package.json`/`package-lock.json`, rode `npm install` de novo.

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks (MSW) |
| `npm run build` | Verificação de tipos + build de produção (`dist/`) |
| `npm run preview` | Serve o build de produção (porta 4173) |
| `npm run typecheck` | Verificação de tipos (`tsc -b`) |
| `npm run lint` | ESLint |
| `npx playwright install chromium` | Baixa o navegador dos testes (uma vez) |
| `npm run test:e2e` | Testes E2E Playwright (sobe o app sozinho na porta 5174) |
| `npm run test:e2e:ui` | Testes no modo interativo |
| `npx playwright show-report` | Relatório HTML do último teste (traces das falhas incluídos) |
| `npm run lighthouse` | Auditoria Lighthouse do build (rode `npm run build` antes); resultado em [reports/lighthouse/summary.md](reports/lighthouse/summary.md) |
| `npm run assets:figma` | Regera as imagens `.webp` a partir do SVG exportado do Figma |

Testes contra outro endereço (build local ou a URL publicada): `E2E_BASE_URL=http://localhost:4173 npm run test:e2e`.
Duas cópias do projeto em paralelo: `E2E_PORT=5184 npm run test:e2e`.

## Variáveis de ambiente

| Variável | Onde | Valor |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `.env.development` e `.env.production` (versionados) | `true` liga a API simulada (MSW). A demo publicada usa `true`, como o desafio exige. |
| `E2E_PORT` / `E2E_BASE_URL` | linha de comando, só para testes | ver acima |

Não há segredos nem serviços externos: o projeto roda de um checkout limpo.

## Credenciais fictícias

| Usuário | E-mail | Senha | Estado inicial |
|---|---|---|---|
| ana | `ana@kurio.dev` | `Kurio@123` | 3 itens no carrinho, 2 carteiras cadastradas |
| bruno | `bruno@kurio.dev` | `Kurio@123` | carrinho vazio, sem carteiras |

Cadastros novos funcionam normalmente (senhas guardadas só como hash). Cupons: `LANCAMENTO` (5%), `KURIO10` (10%), `GENESIS2025` (expirado).

## Cenários da API simulada

Botão **Cenários** (canto inferior esquerdo da tela) ou parâmetro na URL:

| Como | Efeito |
|---|---|
| `?cenario=padrao` | latência de 150 ms (padrão) |
| `?cenario=lento` | 2,5 s por requisição (skeletons) |
| `?cenario=instavel` | latência variável 0,1–1,5 s com semente fixa (respostas fora de ordem, reproduzíveis) |
| `?cenario=offline` | toda chamada à API falha como queda de rede |
| Painel → "Falhar próxima carga do catálogo (500)" | 3 respostas 500 seguidas (esgota os retries) |
| Painel → "Expirar sessão agora" | sessão expira; a próxima chamada privada devolve `SESSION_EXPIRED` |
| Painel → **"Resetar dados da demo"** | restaura integralmente o cenário conhecido (dados, cenário e dados locais do app) |

Nos testes, o mesmo controle está em `window.__kurioMocks` (`setScenario`, `applyPreset`, `failNext`, `reset`, `expireSession`, ...). O cenário também aceita `walletOutcome: 'recusar'`, `paymentOutcome: 'recusar'`, `paymentDelayMs` e a falha `timeout-apos-criar` (o servidor cria o pedido mas a resposta não chega).

## Reproduzindo os fluxos de falha

| Fluxo | Como reproduzir |
|---|---|
| Skeleton / carregamento lento | `/?cenario=lento` |
| Erro e "Tentar de novo" | Painel → "Falhar próxima carga do catálogo"; troque um filtro |
| Sem conexão | `/?cenario=offline` |
| Respostas fora de ordem | `/?cenario=instavel` e buscas seguidas: a lista sempre mostra a última busca |
| Sessão expirada | entre, abra `/perfil`, Painel → "Expirar sessão agora", recarregue: aviso + login + volta ao perfil |
| Acesso não autorizado | deslogado, abra `/perfil`, `/carteiras`, `/favoritos` ou `/checkout` |
| Conflito de cadastro | "Criar conta" com `ana@kurio.dev` |
| Cupom inválido / expirado | no carrinho: `NAOEXISTE` / `GENESIS2025` |
| Edição esgotada / limite de quantidade | detalhe do NFT: edição "1/1" do Emerald Ape; botão "+" até o limite |
| Preço alterado durante a compra | ver "Tempo real" no [ARCHITECTURE.md](ARCHITECTURE.md) (alteração de preço via painel) |
| Carteira recusa conexão | `__kurioMocks.setScenario({ walletOutcome: 'recusar' })` |
| Pagamento recusado | `__kurioMocks.setScenario({ paymentOutcome: 'recusar' })` |
| Timeout após criar o pedido | `__kurioMocks.failNext('POST', '/api/orders', 'timeout-apos-criar')` e confirme a compra: após ~8 s o app reenvia com a mesma chave e recupera o **mesmo** pedido |
| Clique repetido | duplo clique em "Confirmar compra": um único pedido |
| Pedido pendente após refresh | `__kurioMocks.setScenario({ paymentDelayMs: 8000 })`, confirme e recarregue a página |
| Rota inexistente | `/qualquer-coisa` |

## Estrutura

```
src/
  api/          cliente Axios, chamadas REST, chaves do TanStack Query, erros tipados
  contracts/    contratos Zod compartilhados por cliente e API simulada
  features/     telas e hooks por domínio (auth, catalog, home, detail, favorites,
                cart, checkout, account, realtime)
  routes/       rotas do TanStack Router (arquivo = rota; _privado = exige login)
  mocks/        MSW: handlers REST, tempo real, banco simulado, cenários, painel
  components/   layout (cabeçalho, rodapé, barra mobile) e componentes shadcn/ui
e2e/            testes Playwright (+ support/ com helpers)
scripts/        geração de imagens do Figma e auditoria Lighthouse
docs/           Figma exportado, design e planos de implementação
reports/        resumo da auditoria Lighthouse
```
