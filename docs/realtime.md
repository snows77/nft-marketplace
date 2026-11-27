# Tempo real (Socket.IO)

## Transporte

- O app usa **`socket.io-client`** de verdade (`src/features/realtime/client.ts`), com `transports: ['websocket']` e `path: '/tempo-real/'`.
- O servidor é simulado na **camada de rede pelo MSW** (`ws.link` em `src/mocks/realtime/server.ts`), falando o protocolo real: handshake Engine.IO v4 (`0{sid,pingInterval,...}`), ping/pong, `CONNECT` do namespace `/` com `auth: { token }` (`40{...}`) e eventos (`42["evento",{...}]`), codificados com `engine.io-parser` e `socket.io-parser`.
- Nenhum componente recebe evento por atalho: tudo que muda vem do socket e passa pelo cache do TanStack Query.

### Por que não `@mswjs/socket.io-binding`

A versão 0.2.0 declara `peerDependencies: msw ^2.10.2` (o projeto usa msw 3, então a instalação exige `--legacy-peer-deps`, o que quebraria `npm ci` num checkout limpo). Além disso, ela responde ao `CONNECT` sem ler o `auth` (precisamos do token para separar usuários) e não envia `ping` (o cliente derruba a conexão a cada ~30 s). O servidor próprio tem ~150 linhas e cobre esses pontos.

### Limitações do ambiente de mocks

- **Só websocket**: não há long-polling nem upgrade; sem `WebSocket` no navegador não há tempo real (o REST continua funcionando).
- **Caminho `/tempo-real/`** em vez de `/socket.io/`: o MSW remove o prefixo `/socket.io/` antes de comparar a URL, e a URL sem caminho colidiria com o WebSocket do HMR do Vite.
- **Um "servidor" por aba**: cada aba tem seu MSW e seu banco em memória (sincronizado por `localStorage`). Uma mudança feita numa aba gera eventos só para os sockets dessa aba; as outras veem a mudança pelo REST.
- Sem binários, rooms, acks, namespaces além de `/` e sem recuperação de estado de conexão do Socket.IO: a recuperação é feita pela reconciliação com o REST.
- O `socket.io-client` é importado **depois** de o MSW iniciar (`import()` dinâmico): o `engine.io-client` guarda o construtor `WebSocket` global ao ser carregado.
- `timeout: 2500` no cliente: uma tentativa recusada antes do handshake não gera erro no Manager, e a próxima tentativa esperaria o timeout padrão (20 s).

## Eventos (`src/contracts/events.ts`)

Todo evento tem `eventId` (identidade estável), o id do recurso e `version` (versão do recurso após a mudança).

| Evento | Payload | Destino |
| --- | --- | --- |
| `nft.updated` | `eventId, nftId, version, priceEth, editions[{id, available}], occurredAt` (snapshot completo) | todos os sockets |
| `order.updated` | `eventId, orderId, userId, version, status (pendente/confirmado/recusado), occurredAt` | só os sockets do dono |

## Servidor simulado (`src/mocks/realtime/server.ts`)

- `updateNft(nftId, { priceEth?, editions? })`: muda o banco (fonte da verdade), incrementa `version`, grava e emite `nft.updated` — REST e eventos sempre batem.
- `emitToUser(userId, 'order.updated', payload)`: entrega só aos sockets autenticados como `userId` (token do `auth` → `sessions`). Devolve quantos receberam.
- `emitToAll(event, payload)`, `emitRaw(event, payload)` (testes: duplicatas/versões antigas), `disconnectSockets()` / `reconnectSockets()` (queda simulada: o banco continua mudando, as conexões são recusadas).
- Pedidos: ao criar, um timer até `settleAt` chama `settleDueOrders()`; cada pedido liquidado emite `order.updated` ao dono e `nft.updated` dos NFTs com disponibilidade reduzida. Leituras REST também liquidam e emitem (após refresh os timers são reagendados).
- Controle em `window.__kurioMocks` (`updateNft`, `emitRaw`, `emitToUser`, `disconnectSockets`, `reconnectSockets`) e botões no painel "Cenários".

## Cliente (`src/features/realtime/`)

- **Um socket por sessão**: criado na partida; quando o token da sessão muda (login, logout, troca de usuário, expiração), o socket antigo é descartado com todos os listeners e um novo conecta com o token novo.
- Todo evento passa por `dispatch`: validação Zod → deduplicação por `eventId` (conjunto limitado a 500) → em eventos com `userId`, descarte se não for o usuário atual → descarte se `version` ≤ última versão conhecida (aplicada por evento **ou** vinda do REST no cache).
- `nft.updated` (`sync.ts`): atualiza preço/disponibilidade em detalhe, catálogo, destaques, relacionados e favoritos; se o NFT está no carrinho, invalida o carrinho (a API devolve a cotação com "Preço atualizado"/indisponível) e mostra um aviso (toast, região `aria-live`). Na revisão do checkout, avisa que a cotação mudou; a API recusa a confirmação com `PRICE_CHANGED`.
- `order.updated`: atualiza `['order', orderId]` na hora (estado e versão) e busca o pedido completo; o polling de 1 s do checkout continua como reserva.
- **Reconexão**: a cada reconexão (não na primeira conexão) invalida NFTs, carrinho e pedidos — as queries ativas buscam o estado atual no REST.
- Componentes assinam com `useSocketEvent(evento, handler)`; o listener é liberado ao desmontar.

```ts
useSocketEvent('order.updated', (event) => {
  if (event.orderId === orderId) console.log(event.status)
})
```

- Estatísticas em `window.__kurioDebug.realtime()` (status, recebidos, aplicados, ignorados por motivo) — usadas nos testes.

## Testes

`e2e/realtime.spec.ts` (desktop e mobile): preço no carrinho/detalhe/catálogo, edição esgotada bloqueando a finalização, duplicata e evento antigo, queda e reconciliação, isolamento entre usuários, cenário completo do §7 com o checkout recusando a cotação desatualizada, `order.updated` na liquidação, queda com pedido pendente e painel de cenários.
