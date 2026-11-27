# Pedaço 5 — Carrinho e cotação: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Carrinho funcional (visitante e logado) com quantidades por edição respeitando disponibilidade, remoção, cupom, resumo de valores calculado pela API, persistência após refresh e junção do carrinho do visitante ao entrar.

**Architecture:** Todo cálculo e regra ficam na API simulada; o cliente só guarda o id do carrinho de visitante (`kurio:cart-id`, enviado em `X-Cart-Id`). Cada resposta de mutation devolve o carrinho inteiro (itens + cotação), que vai direto para o cache (`setQueryData`), sem refetch. Chave do cache: `cartKeys.detail(userId ?? 'visitante')`. Ao entrar, o carrinho do visitante é mesclado no do usuário (`POST /api/cart/merge`).

**Spec:** [Desafio.md](../../../Desafio.md) §3 "Carrinho", §5 "Carrinho" e "Cotação"; Figma frames Carrinho desktop/mobile.

## Contrato (`src/contracts/cart.ts`)
- `cartItemSchema`: `id, nftId, editionId, editionLabel, name, tokenNumber, image, quantity (int ≥1), available (int), unitPriceEth, lineTotalEth, previousUnitPriceEth (string|null — preço quando adicionado, se mudou), unavailable (bool — edição esgotada/insuficiente)`.
- `cartSchema`: `id, items, coupon ({ code, label, discountPercent } | null), subtotalEth, discountEth, networkFeeEth, totalEth, itemCount, version, updatedAt`.
- Taxa de rede fixa `0.016` ETH por pedido com itens (Figma "Taxa estimada"); `0` com carrinho vazio.
- Cupons: `LANCAMENTO` 5% ("Desconto do lançamento"), `KURIO10` 10%, `GENESIS2025` expirado → 400 `VALIDATION_ERROR` `fieldErrors.code = ['Cupom expirado.']`; desconhecido → `['Cupom inválido.']`.

## Endpoints
`GET /api/cart` · `POST /api/cart/items {nftId, editionId, quantity}` (soma à linha existente) · `PATCH /api/cart/items/:id {quantity}` · `DELETE /api/cart/items/:id` · `PUT /api/cart/coupon {code}` · `DELETE /api/cart/coupon` · `POST /api/cart/merge {guestCartId}` (privado). Quantidade acima do disponível → 409 `OUT_OF_STOCK` "Só há N disponíveis desta edição." Valores com `decimal.js`, ETH como string.

## Tarefas
- [ ] **T1 API + contrato** — testes de API via `fetch` (e2e/cart-api.spec.ts): soma/limite/remoção, cupons, totais exatos, merge, isolamento por usuário.
- [ ] **T2 Tela /carrinho + badge** — Figma desktop (tabela + resumo + "Colecionadores também viram") e mobile; estados vazio/carregando/erro; contador no ícone do carrinho (cabeçalho e barra inferior); "Conectar e finalizar" → `/checkout` (pedaço 7); testes e2e/cart.spec.ts (quantidade, limite, remoção, cupom válido/inválido/expirado, refresh, login mescla, isolamento).
- [ ] **T3 Integração com o detalhe** (após merge da branch do pedaço 4): trocar `addToCartPlaceholder` pela mutation real.
