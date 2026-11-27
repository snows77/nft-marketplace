# Arquitetura

Visão das decisões técnicas da solução. Para rodar o projeto, ver o [README](README.md).

## Camadas

```
Tela (routes/, features/)  →  hooks TanStack Query  →  api/ (Axios)  →  rede
                                                                          │
                                         MSW (Service Worker) ◄───────────┘
                                         handlers REST + tempo real + banco simulado (localStorage)
```

- **Contratos** (`src/contracts/*.ts`, Zod) são a fonte única de tipos e validação: o cliente valida toda resposta (`schema.parse`) e a API simulada valida toda requisição com os mesmos schemas. Os formulários usam os mesmos schemas (react-hook-form + zodResolver).
- **Mocks só na camada de rede.** Componentes, hooks e o cliente Axios não conhecem respostas fictícias: o MSW intercepta as requisições reais. A camada é ligada por `VITE_ENABLE_MOCKS` e carregada por import dinâmico (não entra no bundle quando desligada).
- **A interface desenha antes do MSW ligar**; só as requisições esperam (`src/api/ready.ts`), o que adianta a primeira pintura.
- **Valores em ETH trafegam como string decimal** e são calculados com `decimal.js` (nunca `number`). Quantidades são inteiros.

## Contratos REST

Erro padrão (`src/contracts/common.ts`): `{ code, message, fieldErrors? }`. Códigos: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `SESSION_EXPIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `OUT_OF_STOCK` (409), `PRICE_CHANGED` (409), `IDEMPOTENCY_CONFLICT` (409), `TRANSIENT_ERROR` (5xx). No cliente todo erro vira `ApiRequestError` (`src/api/errors.ts`), com `NETWORK_ERROR` e `TIMEOUT` para falhas sem resposta.

| Recurso | Endpoints | Observações |
|---|---|---|
| Sessão e conta | `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/session` · `POST /api/auth/logout` | token no header `Authorization: Bearer`; sessão de 30 min; 409 com `fieldErrors` em conflito de e-mail/usuário; senha só como hash SHA-256 com salt |
| NFTs | `GET /api/nfts?q&tab&category&network&minPrice&maxPrice&sort&page` · `GET /api/nfts/featured` · `GET /api/nfts/:id` · `GET /api/nfts/:id/related` | listagem paginada (9) com `facets` (contagens por categoria/rede e faixa de preço) |
| Favoritos | `GET /api/favorites` · `PUT /api/favorites/:nftId` · `DELETE /api/favorites/:nftId` | privados; PUT/DELETE idempotentes |
| Carrinho | `GET /api/cart` · `POST /api/cart/items` · `PATCH /api/cart/items/:id` · `DELETE /api/cart/items/:id` · `PUT /api/cart/coupon` · `DELETE /api/cart/coupon` · `POST /api/cart/merge` | visitante identificado por `X-Cart-Id`; logado pelo token; toda resposta traz a cotação (subtotal, desconto, taxa de rede 0.016, total) |
| Cotação | `POST /api/checkout/quote` | "congela" itens, preços, cupom e taxas; expira em 10 min |
| Pedidos | `POST /api/orders` (header `Idempotency-Key`) · `GET /api/orders` · `GET /api/orders/:id` | criação idempotente; 409 `PRICE_CHANGED`/`OUT_OF_STOCK` com a nova cotação; recibo = snapshot |
| Perfil | `GET /api/profile` · `PATCH /api/profile` · `POST /api/profile/password` | avatar como data URL (≤ 2 MB antes de redimensionar para 256 px) |
| Carteiras | `GET /api/wallets` · `PUT /api/wallets/:slot` · `POST /api/wallets/connect` | slots `principal` e `secundaria`; endereço validado por rede; mesmo endereço nos dois slots = 409 |

### Idempotência dos pedidos

A chave identifica a **tentativa** de compra (uma por cotação confirmada) e fica no `sessionStorage` com o id do pedido criado (`src/features/checkout/attempt.ts`):

- mesma chave + mesmo corpo → a API devolve o **mesmo pedido** (clique repetido, reenvio);
- mesma chave + corpo diferente → `409 IDEMPOTENCY_CONFLICT`;
- se a resposta se perde (timeout/queda), o cliente reenvia **uma vez com a mesma chave** e recupera o pedido já criado;
- o pedido fica `pendente` até o "pagamento" terminar e vira `confirmado` ou `recusado` (terminais). O resultado é calculado pelo servidor quando o prazo vence, em qualquer leitura — por isso sobrevive a refresh. Ao confirmar, só os itens e quantidades comprados saem do carrinho e a disponibilidade das edições diminui.

## Sessão

- Token em `localStorage` (`kurio:session-token`); a sessão (`GET /api/auth/session`) é uma query (`['session']`) com `staleTime: Infinity`.
- Rotas privadas ficam sob `src/routes/_privado.tsx`: o `beforeLoad` revalida a sessão **a cada navegação privada** (detecta expiração sem recarregar) e, sem sessão, abre o login com `?auth=entrar&redirect=<destino>`.
- O login/cadastro é um modal aberto por parâmetro de busca sobre a página atual, para a pessoa voltar exatamente ao fluxo em que estava. `redirect` só aceita caminhos internos.
- `SESSION_EXPIRED` em qualquer chamada (interceptor em `src/features/auth/expiration.ts`): aviso único, sessão local encerrada e login aberto preservando o destino.
- **Isolamento entre usuários** (`src/features/auth/guards.ts`): qualquer mudança de identidade (logout, expiração, troca de usuário — inclusive feita em outra aba, via evento `storage`) descarta todo o cache exceto a sessão. Além disso, toda chave de dado privado inclui o id do usuário (`src/api/queryKeys.ts`).

## Carrinho

- Regra e cálculo ficam **na API**: o cliente nunca soma preços. Cada mutation devolve o carrinho inteiro (itens + cotação), que vai direto para o cache.
- Visitante: o navegador guarda só o id do carrinho anônimo (`kurio:cart-id`). Ao entrar, `POST /api/cart/merge` soma os itens do visitante ao carrinho da conta (respeitando a disponibilidade) e o carrinho anônimo deixa de existir.
- Cada linha traz `available`, `unavailable` e `previousUnitPriceEth` (preço quando foi adicionado), para a tela avisar sobre preço alterado e quantidade indisponível; com item indisponível o checkout fica bloqueado.

## Cache, retries e sincronização (TanStack Query)

| Dado | Chave | Política |
|---|---|---|
| Sessão | `['session']` | `staleTime: Infinity`, sem retry; revalidada nas navegações privadas |
| Catálogo | `['nfts','list', params]` | cada combinação de filtros tem seu cache; `keepPreviousData` durante trocas |
| Destaques | `['nfts','featured']` | `staleTime` 5 min |
| Detalhe / relacionados | `['nfts','detail',id]`, `['nfts','related',id]` | padrão |
| Favoritos | `['favorites', userId]` | **atualização otimista com rollback** (ver abaixo) |
| Carrinho | `['cart', userId \| 'visitante']` | resposta da mutation vai para o cache (`setQueryData`) |
| Perfil / carteiras | `['profile', userId]`, `['wallets', userId]` | invalidados/atualizados após mutations |
| Pedido | `['order', orderId]` | `refetchInterval` de 1 s enquanto `pendente` (além do evento em tempo real) |

- **Retry:** só falhas transitórias (sem resposta, timeout, 5xx), no máximo 2 vezes com 300 ms; erros 4xx nunca são repetidos; mutations não têm retry automático (o pedido tem reenvio próprio, idempotente).
- **Respostas obsoletas:** a chave inclui todos os parâmetros e o `signal` do Query cancela a requisição anterior; uma resposta atrasada nunca aparece numa busca mais nova.
- **Atualização otimista (favoritos):** cancela buscas em andamento, aplica a mudança no cache, e em caso de erro desfaz **só aquele NFT** e avisa; ao terminar, invalida a lista.

## Tempo real (Socket.IO)

O app usa `socket.io-client` (transporte websocket, caminho `/tempo-real/`) contra um servidor Socket.IO simulado na camada de rede pelo MSW (`ws.link`, em `src/mocks/realtime/server.ts`), que fala o protocolo real: handshake Engine.IO v4, ping/pong, CONNECT com `auth: { token }` e eventos `42[...]`. Detalhes do transporte em [docs/realtime.md](docs/realtime.md).

- **Fonte da verdade:** o banco simulado. `updateNft` e a liquidação de pedidos gravam e **então** emitem, então REST e eventos sempre concordam.
- **Eventos** (`src/contracts/events.ts`, Zod): `nft.updated` (preço e disponibilidade das edições, para todos) e `order.updated` (estado do pedido, só para os sockets do dono). Todo evento tem `eventId`, id do recurso e `version`.
- **Duplicatas e eventos antigos:** o cliente descarta `eventId` já visto (conjunto limitado) e versões ≤ à última conhecida, inclusive a que veio do REST — o estado nunca regride nem reaplica efeitos.
- **Efeitos:** `nft.updated` atualiza detalhe, catálogo, destaques, relacionados e favoritos no cache e invalida o carrinho (a API recalcula a cotação; a tela avisa e bloqueia a finalização com item indisponível). No checkout, a API recusa a cotação antiga com `PRICE_CHANGED` e a pessoa confirma de novo. `order.updated` atualiza o pedido (`['order', id]`) na hora; o polling de 1 s fica como reserva.
- **Sessão:** um socket por sessão. Ao trocar de identidade (login, logout, troca de usuário, expiração), o socket antigo e seus listeners são descartados e outro conecta com o novo token; eventos com `userId` diferente do usuário atual são ignorados. O hook `useSocketEvent` libera o listener ao desmontar.
- **Reconexão:** a cada reconexão, as queries ativas de NFTs, carrinho e pedidos são invalidadas e reconciliadas com o REST. Pedido pendente durante uma queda ou refresh é retomado pelo id guardado na tentativa, sem criar outra compra.
- **Demo/testes:** painel de cenários com "Alterar preço de um NFT do carrinho", "Esgotar edição de um NFT do carrinho", "Derrubar conexão" e "Reconectar"; em `window.__kurioMocks`: `updateNft`, `emitRaw`, `emitToUser`, `disconnectSockets`, `reconnectSockets`.
- **Limitações:** só websocket (sem long-polling); um servidor simulado por aba (eventos só chegam aos sockets da aba onde a mudança aconteceu); sem rooms, acks ou recuperação de estado nativa do Socket.IO — a recuperação é a reconciliação via REST. A biblioteca `@mswjs/socket.io-binding` não foi usada porque só aceita MSW 2 (o projeto usa MSW 3), ignora o token de `auth` e não envia ping.

## API simulada (MSW)

- **Banco simulado** em `localStorage` (`src/mocks/db`), versionado pela chave (`kurio:mock-db:vN`); cada aba tem sua cópia e recarrega quando outra aba grava (evento `storage`). Leituras não gravam, para não sobrescrever o que outra aba acabou de salvar.
- **Cenários** (`src/mocks/scenario.ts`): latência (nenhuma, normal, lenta, variável com semente), falhas (500, 503, rede, timeout, timeout após criar), recusa de carteira e de pagamento. Um handler "de rede" na frente de todos aplica latência e falhas e passa adiante.
- **Reset** restaura dados, cenário e dados locais do app.
- Fixtures: 60 NFTs com todas as combinações categoria × rede, 2 usuários, carteiras, carrinho inicial da ana, cupons.

## Acessibilidade

Navegação por teclado com foco visível (contorno de 2 px), link "Pular para o conteúdo", modais e gavetas com foco preso (Radix), rótulos e erros ligados aos campos (`aria-describedby`/`aria-invalid`), feedback de mutations por toast e `role=status`, carrossel com pausa (WCAG 2.2.2) e sem autoplay com movimento reduzido, skeletons que respeitam `prefers-reduced-motion`, sem overflow horizontal em 390/768/1440.

## Decisões de UX e desvios do Figma

- **Login/cadastro** abre como modal sobre a página atual (o Figma mostra sobre o Início); no mobile ocupa a tela inteira, como no frame. O fundo é escurecido sem desfoque (o Figma mostra a página nítida).
- **Login social, "Esqueceu a senha?", Criadores, Aprenda, links de ajuda, "Ler mais" do Diário e newsletter** são fora do escopo: avisam "Esta seção não faz parte da demonstração." em vez de fingir sucesso. A newsletter valida o e-mail antes do aviso.
- **Busca no desktop:** o Figma não tem campo visível; o catálogo ganhou o campo "Explorar coleções" (do frame mobile) e o ícone do cabeçalho leva até ele. No mobile a busca fica logo abaixo do hero.
- **Botão central da barra mobile** (sem função clara no Figma) leva ao catálogo ("Explorar").
- **Checkout:** os campos do Figma que não têm papel na simulação (endereço/tipo de carteira digitados, "Nome do perfil", "Nome ENS") foram substituídos pela escolha das **carteiras cadastradas** (exigência do desafio), com seleção de rede e conexão simulada. "Código de indicação" ficou opcional.
- **Carteiras:** o formulário tem apelido, rede, endereço e tipo; "Igual à carteira principal" foi omitido (contradiz a regra de endereço único). "Nome ENS" do perfil é opcional.
- **Recibo** é uma página (acesso direto e refresh funcionam), com o visual do modal de confirmação do Figma. Referência de transação e link do explorador são simulados (avisado na tela).
- **Imagens:** as 4 artes originais (1254 px) foram extraídas do SVG do Figma e convertidas para `.webp` em 960 e 480 px; os cards usam `<picture>` para garantir a versão pequena no celular.
- **Ícones de redes sociais** são desenhos simples (o lucide-react 1.x não tem marcas).

## Limitações conhecidas

- O banco simulado vive no navegador: cada visitante da demo tem seus próprios dados (e o reset os restaura).
- O "pagamento" é sempre simulado; não há blockchain, extensão de carteira nem gateway.
- Ícones de compartilhar e a lupa de zoom da galeria (Figma do detalhe) não foram implementados.
