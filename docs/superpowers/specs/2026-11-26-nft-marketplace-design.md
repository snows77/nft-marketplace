# NFT Marketplace (Kurio) — Design

Data: 2026-11-26 · Prazo de entrega: sexta-feira 2026-11-27 à noite

## Intenção

Completar o desafio descrito em [Desafio.md](../../../Desafio.md): marketplace de NFTs em React + TypeScript,
com descoberta, compra e conta do colecionador, desktop e mobile, tudo sobre API simulada (MSW) e
tempo real (Socket.IO simulado), com testes Playwright, auditoria Lighthouse, deploy público e documentação.

O trabalho é feito em pedaços pequenos, cada um explicado, executado e verificado pela pessoa
antes do commit — o objetivo também é aprender com o processo.

## Objetivos

- Atender todos os itens obrigatórios e, sobretudo, nenhum item **eliminatório**
  (stack efetiva, fluxos reais, compra só com resposta da simulação, isolamento entre usuários,
  eventos via socket e não via UI, testes E2E executáveis).
- Seguir o Figma (exportado em `docs/figma/`) o mais fielmente que o prazo permitir.
- Deploy público funcionando (Vercel), com mocks e tempo real ativos.

## Não-objetivos

- Integração real com blockchain, carteiras, gateways de pagamento ou login social.
- Páginas editoriais, suporte, atividade, ofertas, downloads.

## Anti-objetivos (falha mesmo que "funcione")

- Ação fora do escopo que aparente sucesso (ex.: "Continuar com Google" logando de mentira).
- Respostas fictícias ou atalhos de negócio dentro de componentes, hooks ou cliente Axios.
- Dados de um usuário visíveis para outro (cache, socket, localStorage).

## Restrições

- Stack obrigatória: React, TypeScript, TanStack Router, TanStack Query, Axios, REST, Socket.IO,
  Tailwind, shadcn/ui, MSW, Playwright, Lighthouse.
- Base existente: Vite 8, React 19, Tailwind 4, Zod 4, tokens de cor/tipografia já em `src/index.css`.
- ETH sempre como string decimal; cálculos com `decimal.js`.
- Prazo de ~30 horas.

## Abordagens consideradas

- **A) Fluxos completos primeiro, acabamento visual depois — escolhida.** Garante os itens
  eliminatórios e a maior parte da nota; fidelidade visual pode ficar abaixo do perfeito.
- **B) Tela por tela, cada uma perfeita.** Visual melhor no que fica pronto, mas alto risco de
  faltar checkout, conta, testes ou deploy — vários deles eliminatórios.

A pessoa delegou a escolha; A foi escolhida pelo risco do prazo.

## Fonte visual

- `docs/figma/Frontend Challenge.svg`: canvas completo. 9 frames desktop (Início, Detalhe,
  Carrinho, Pagamento, Confirmação, Login, Cadastro, Perfil, Carteiras) e 6 mobile (Início,
  Detalhe, Carrinho, Pagamento, Login, Cadastro). Perfil, Carteiras e Confirmação no mobile
  seguem o mesmo padrão visual, sem frame.
- As 4 artes originais (1254×1254) estão embutidas no SVG e serão convertidas para `.webp`
  em múltiplos tamanhos.

## Pedaços de entrega (em ordem)

Cada pedaço termina com: explicação → execução e verificação pela pessoa → commit.

1. **Assets e esqueleto** — imagens webp, layout (cabeçalho, rodapé, barra inferior mobile), 404.
2. **Base da API simulada** — cenários configuráveis e reproduzíveis (latência, falhas, reset),
   2 usuários, cadastro/login/sessão/expiração, proteção de rotas.
3. **Início completo** fiel ao Figma + primeiro deploy na Vercel.
4. **Detalhe** — galeria, edição, quantidade, favoritos (atualização otimista com rollback).
5. **Carrinho e cotação** — quantidades, remoção, cupom, persistência, merge do carrinho visitante.
6. **Socket.IO** — `nft.updated` via `socket.io-client` + `@mswjs/socket.io-binding`; versões,
   duplicatas, reconexão com reconciliação REST.
7. **Checkout, pedido e confirmação** — idempotência, pendente/confirmado/recusado,
   `order.updated`, recibo como snapshot.
8. **Perfil e Carteiras**.
9. **Playwright** — 12 cenários do desafio, desktop + mobile, regressão visual.
10. **Lighthouse e documentação** — README, ARCHITECTURE.md, relatórios.

Se o prazo apertar, corta-se primeiro: acabamento visual fino e seções editoriais (ficam estáticas).

## Decisões já tomadas

- Trabalho na branch `feature/v_mobile`; integração na `master` via Pull Request.
- Login social aparece como no Figma, mas informa que não está disponível na demo.

## Deixado para quem implementa

Estrutura de pastas por feature, detalhes dos contratos REST/eventos, política de cache e retries,
mecanismo de seleção de cenários — decididos e documentados em cada pedaço.
