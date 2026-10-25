---
issue: 41
pull_request: 112
---

# Relatório: Disponibilidade e formas de pagamento no painel

Em um PR só (`Closes #41`), como aprovado em P1. O plano passou a `concluido` neste PR.

## O que foi feito

- **Rotas** `GET` e `PUT /api/admin/settings/business-hours` e `/api/admin/settings/payment-fees`, com `requirePermission("settings")` (UC23, UC24, RF085, RF087, RF088, RS008, RS010): os sete dias e as quatro formas de pagamento; o `PUT` responde 200 com o mesmo corpo do `GET`. Cada `PUT` grava a lista inteira numa só instrução (`upsert`), então nada é gravado pela metade.
- **Esquemas** `signedPercentSchema` (−100 a 100, até duas casas), `businessHoursSchema` (sete dias uma só vez; horário em hora cheia ou meia hora, RN035; encerramento depois da abertura, UC23 FE01; pausa dentro do expediente e com fim depois do início, UC23 FE02; dia fechado descarta os horários) e `paymentFeesSchema` (quatro formas uma só vez). O erro de um item vai em `fields` como `<índice>.<campo>` (L2).
- **Sem `updatedAt`** nas duas listas: a última gravação prevalece, exceção à decisão 0009 registrada em `api.md` (L1).
- **Abas "Disponibilidade" e "Formas de pagamento"** ligadas ao banco: saem as quatro entradas de `src/lib/demo/routes.ts`, `src/lib/demo/settings.ts` e o `DemoNotice` das abas. A falha do `PUT` mostra a mensagem junto ao campo do dia ("Fecha às", "Início da pausa", "Fim da pausa") ou ao percentual da forma, com o aviso no topo e o digitado mantido; o `useFormFailure` ganhou a tradução opcional do nome do campo. O portal (rodapé, "Localização" e passo de horários) já lia `GET /api/public/company` e passa a mostrar o gravado.
- **Especificação OpenAPI** das quatro operações.

## Arquivos alterados

- `src/app/api/admin/settings/business-hours/route.ts` e `payment-fees/route.ts` (novos).
- `src/server/services/settings.ts`, `src/server/repositories/business-hours.ts` (`replaceBusinessHours`) e `src/server/repositories/payment-fees.ts` (novo).
- `src/shared/validation/formats.ts` (`signedPercentSchema`), `settings.ts` (os dois esquemas) e o `README.md`.
- `src/hooks/use-form-failure.ts`; `src/components/admin/settings/settings-section.tsx`, `availability-form.tsx` e `payment-fees-form.tsx`.
- `src/lib/demo/routes.ts` (saem as quatro entradas) e `src/lib/demo/settings.ts` (removido).
- `tests/validation/formats.test.ts` e `settings.test.ts`.
- `docs/plataforma/openapi.yaml`, `docs/configuracoes/rotas.md`, `docs/configuracoes/configuracoes-do-painel.md`, `docs/padroes/api.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.

Dois ajustes nos arquivos já listados (ver `notas.md`): o `clearErrors()` antes de cada envio e o `aria-invalid` e `aria-describedby` no seletor de horário.

## Testes executados

- `npm run check`: sem erros nem avisos (459 testes, 20 novos de esquemas, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rotas**, no banco local (`db reset`, admin, funcionário de cargo com `settings`, funcionário de cargo sem ela e cliente, `next start` na porta 3041), pelo roteiro `verify-settings-api.mjs`, 46 verificações, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `settings` e para o cliente nos quatro métodos, 200 para o funcionário com `settings`; `PUT` sem `Origin` 403; `text/plain` 415; `no-store`;
  - o seed: domingo fechado, segunda a sexta 08:00–18:00 com pausa 12:00–13:00, sábado 08:00–12:00; as quatro formas em 0 na ordem crédito, débito, Pix e dinheiro;
  - segunda 08:00–18:00 com pausa, e terça até 17:00: `PUT` 200, o `GET` do painel e `GET /api/public/company` trazem o gravado;
  - FE01 (`08:00` e `07:30` como encerramento): 400 em `3.closesAt`, e nada gravado, nem o dia válido do mesmo corpo; FE02 (pausa antes da abertura, depois do encerramento, fim antes do início, só um horário); `08:15` com a mensagem de RN035; dia aberto sem `opensAt`; lista com seis ou oito dias, `weekday` repetido ou 7 e corpo que não é lista: 400 sem campo; dia fechado com horários gravado fechado e sem horários; campos não previstos descartados;
  - crédito 5 e Pix −3 gravados como `5` e `-3` (números), zero sem ajuste, `12.5` e `-0.5`; `-150`, `150`, `"abc"`, `"5"` e `1.234`: 400 em `2.percent` com a mensagem de percentual e nada gravado; percentual ausente, três formas, forma repetida ou desconhecida;
  - `created_at` das linhas não muda e `updated_at` muda a cada `PUT`.
- **Telas** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro, tudo certo:
  - **Estados:** carregamento (esqueleto e `aria-busy`) e falha da leitura com "Tentar novamente" nas duas abas, falha 500 do salvar (aviso no topo, com o foco), sucesso ("Disponibilidade salva.", "Percentuais salvos."), sem aviso de demonstração e sem transbordo. As abas não têm estado vazio (os sete dias e as quatro formas sempre existem).
  - **Fluxos:** o seed vindo do banco; FE01 na terça com a mensagem junto a "Fecha às", o digitado mantido e nada gravado; FE02 junto a "Início da pausa" e a "Fim da pausa"; gravação válida lida de volta pela API, por `GET /api/public/company` e, depois de recarregar, pela tela; o rodapé do portal mostrando o horário novo; dia fechado e reaberto mantendo os horários; crédito 5 e Pix desconto 3 gravados, relidos pela tela e restaurados; desconto 150 com a mensagem junto ao percentual, os dados mantidos e nada gravado; corrigir só o encerramento, com a mensagem da pausa ainda na tela, grava.
  - **Acesso:** o funcionário sem `settings` que abre `/admin/settings` sai da página (vai a `/admin/appointments`, a página dele); com a permissão, a página abre.
  - **Teclado, a 1440 px:** setas e Enter nas abas; Tab da aba ao primeiro interruptor; Espaço aciona o interruptor; ordem por dia: interruptor, abre, fecha, pausa, início e fim da pausa; Enter abre a lista de horários, Home e setas escolhem, Enter confirma, e o foco volta ao seletor; Enter e Espaço no botão enviam; na falha o foco vai ao aviso do topo, e o seletor com a mensagem tem `aria-invalid` e `aria-describedby`; nas formas, setas no grupo de ajuste e Enter no percentual enviam.
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/settings` (navegação) e 1,0 nas 32 capturas de estado (8 estados nas quatro combinações: aba "Empresa", "Disponibilidade" e "Formas de pagamento", cada uma aberta, com as mensagens por campo e depois de salvar, e com a falha da leitura).
  - **Desempenho (navegação, `next start` local, aba "Empresa" que abre por padrão):** celular LCP 3,3 s, CLS 0, TBT de 100 a 190 ms, desempenho 0,90 e 0,92; computador LCP 0,7 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (os quatro caminhos, `BusinessHours`, `PaymentFee` e `PaymentFees`), `docs/configuracoes/rotas.md`, `docs/configuracoes/configuracoes-do-painel.md`, `docs/padroes/api.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.
- Lacunas resolvidas: L1 → opção 1 (sem `updatedAt`, a última gravação prevalece) → `api.md` e `rotas.md`; L2 → opção 1 (cinco mensagens e o campo `<índice>.<campo>`) → `mensagens-de-validacao.md`, `rotas.md`, `api.md` e `configuracoes-do-painel.md`; L3 → opção 1 (a mensagem de percentual de hoje) → `mensagens-de-validacao.md`; L4 → opção 1 (só a rota confere) → nenhum texto novo.
- Decisões: nenhuma (a exceção à 0009 fica em `api.md`).
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A, com os `PUT` das duas listas (400 com o campo pelo índice do item) e a exceção a RNF011 (sem `updatedAt`); nenhuma `RN` mudou, então a Análise do Sistema não precisa de ajuste.

## Pendências

- **Passo do Yvan:** conferir `/admin/settings`, nas abas "Disponibilidade" e "Formas de pagamento", em produção, logado como administrador, depois da incorporação. Gravar nelas muda os dados reais da empresa e o que o portal mostra (decisão 0030): gravar os reais da empresa, ou gravar os de teste e restaurar os do `seed.sql` no próprio painel. Não há migration.
- LCP do celular de `/admin/settings` em 3,3 s no Lighthouse local (limite de 2,5 s em `frontend.md`): medir na pré-visualização da Vercel.
- Dois funcionários salvando a mesma lista ao mesmo tempo: a última gravação vale (L1).
- O uso da disponibilidade e dos percentuais no agendamento (cálculo do valor e oferta de horários) é da #49, #50 e #107.
