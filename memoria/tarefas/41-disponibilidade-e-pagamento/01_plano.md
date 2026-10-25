---
issue: 41
titulo: "Disponibilidade e formas de pagamento no painel"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC23, UC24, RF085, RF087, RF088, RN010, RN011, RN012, RN013, RN028, RN035, RS008, RS010, RS013, RS014, RNF003, RNF004, RNF005, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 23:18 - 24/10/2026
---

# Plano: Disponibilidade e formas de pagamento no painel

## Objetivo

Entregar o UC23 e o UC24 de ponta a ponta: o funcionário com a permissão `settings` define os dias e os horários de funcionamento (com a pausa) e o acréscimo ou desconto de cada forma de pagamento, nas abas "Disponibilidade" e "Formas de pagamento" de `/admin/settings` (RF085, RF087, RF088, RN012, RN013), pelas rotas:

- `GET` e `PUT /api/admin/settings/business-hours`: os sete dias, de domingo (0) a sábado (6), com `weekday`, `isOpen`, `opensAt`, `closesAt`, `breakStartsAt` e `breakEndsAt`;
- `GET` e `PUT /api/admin/settings/payment-fees`: crédito, débito, Pix e dinheiro, nessa ordem, com `paymentMethod` e `percent` com sinal (negativo é desconto);
- as quatro com `requirePermission("settings")` (RS008, RS010); o `PUT` responde 200 com o mesmo corpo do `GET`, já gravado.

As duas abas passam a usar as rotas e o banco de verdade: saem da lista de demonstração (`src/lib/demo/routes.ts`) as quatro entradas, o arquivo `src/lib/demo/settings.ts` e o aviso de demonstração das abas (decisão 0055); o que o funcionário grava volta no `GET`, vem dos dados iniciais de `supabase/seed.sql` e chega ao portal (rodapé, "Localização" e passo de horários do agendamento, que já leem `GET /api/public/company`). A especificação OpenAPI ganha as quatro operações.

Não há migration nem dependência nova: `business_hours` e `payment_fees` já existem na migration inicial, com as restrições de RN013 e RN035 (`ck_business_hours_*`, `ck_payment_fees_percent`), o gatilho `updated_at` e as linhas criadas pelo `seed.sql`. As tabelas não ganham nem perdem linhas pelo painel (`dados.md`).

## Base da construção

- Ramificação `feat/41-availability-and-payment-fees`, criada da `origin/main` (edb9369, com a #40: PRs #109 e #110), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`; o worktree está em edb9369, igual à `origin/main`.
- Contratos usados sem mudança: `handleRoute`, `respondOk` (`src/server/http/`), `requirePermission`, `getServiceClient`, `AppError`; em `formats.ts`, já testados: `halfHourTimeSchema` ("Escolha um horário em hora cheia ou meia hora.", RN035), `optionalFormat`, `numberFormat` (interno) e as mensagens de `mensagens-de-validacao.md`; no cliente: `apiRequest`, `useApiQuery`, `useFormFailure`, `FormAlert`, `FormField`, `SubmitButton`, `ChoiceGroup`, `SettingsNotices`.
- Moldes: `settings/company` (#37: rota fina, serviço, repositório), os `PUT` com resposta igual ao `GET` e a leitura `listBusinessHours`, que o `getPublicCompany` já usa.
- Já prontos da #65 e mantidos: os formulários `availability-form.tsx` e `payment-fees-form.tsx`, com `availability-values.ts` e `payment-fees-values.ts` (`toFormValues` e `toRequestBody` já montam o corpo das rotas: `null` nos horários de dia fechado e de dia sem pausa, percentual com sinal).

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/settings/business-hours` | nenhuma | 200 os sete dias, por `weekday` |
| `PUT /api/admin/settings/business-hours` | lista de sete itens: `weekday*`, `isOpen*`, `opensAt`, `closesAt`, `breakStartsAt`, `breakEndsAt` | 200 os sete dias gravados; 400 `VALIDATION_ERROR` com `fields` (L2) |
| `GET /api/admin/settings/payment-fees` | nenhuma | 200 as quatro formas, na ordem crédito, débito, Pix e dinheiro |
| `PUT /api/admin/settings/payment-fees` | lista de quatro itens: `paymentMethod*`, `percent*` (número, de −100 a 100, até duas casas) | 200 as quatro formas gravadas; 400 `VALIDATION_ERROR` com `fields` |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem a permissão `settings` ou origem recusada), `ACCOUNT_INACTIVE` e `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500. Sem 404 (a rota não tem id) e sem 409 `VERSION_CONFLICT` (L1).
- Campos não previstos são descartados (RS013). Dia fechado com horários no corpo: os horários são descartados e o dia é gravado fechado, sem pausa (a restrição `ck_business_hours_open` exige o conjunto todo nulo).
- A lista inteira é gravada ou nada é gravado: cada `PUT` é **uma única instrução** (`upsert` das sete ou das quatro linhas, por `weekday` ou `payment_method`), então não há dia gravado pela metade. Uma violação de restrição do banco seria erro 500: os esquemas a impedem antes.

### Esquemas (`src/shared/validation/`), TDD

- `formats.ts`, novo `signedPercentSchema`: número de −100 a 100 com até duas casas; qualquer outro valor (texto, fora do intervalo, mais de duas casas) responde a mensagem de percentual de hoje (L3). O `percentSchema` (0 a 100) segue como está.
- `settings.ts`, novos:

| Esquema | Regras |
|---|---|
| `businessHoursSchema` (corpo do `PUT`) | lista de exatamente sete itens, cada `weekday` de 0 a 6 uma só vez (senão erro do corpo, L2). Por item: dia aberto exige `opensAt` e `closesAt` em hora cheia ou meia hora (`halfHourTimeSchema`); `closesAt` depois de `opensAt` (UC23 FE01); pausa com início e fim juntos, `breakStartsAt` a partir da abertura, `breakEndsAt` depois do início e até o encerramento (UC23 FE02); dia fechado descarta os horários. O primeiro erro de cada campo vai ao campo (`0.closesAt`, `1.breakEndsAt`…) |
| `paymentFeesSchema` (corpo do `PUT`) | lista de exatamente quatro itens, cada `paymentMethod` (`credit`, `debit`, `pix`, `cash`) uma só vez, com `percent`: `signedPercentSchema` |

- O formulário **não** usa esses esquemas no navegador: segue `configuracoes-do-painel.md` ("a consistência é conferida pela rota") e mostra as mensagens de `fields` no dia ou na forma de pagamento (L4). A tela já impede o que os controles impedem (horário só em meia hora, percentual só com dígitos e vírgula).

### Backend (decisões 0003, 0005, 0006 e 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/settings/business-hours/route.ts` | `GET`: guard, `getBusinessHours`, `respondOk`. `PUT`: guard, `businessHoursSchema.parse(body)`, `updateBusinessHours`, `respondOk` |
| Rota | `app/api/admin/settings/payment-fees/route.ts` | o mesmo para `getPaymentFees` e `updatePaymentFees` |
| Serviço | `server/services/settings.ts` | módulo `settings`: ganha `getBusinessHours`, `updateBusinessHours`, `getPaymentFees` e `updatePaymentFees`; `getPublicCompany` já lê `listBusinessHours`, então passa a trazer o gravado sem mudar |
| Repositório | `server/repositories/business-hours.ts` | `listBusinessHours` (existe) e `replaceBusinessHours(days)`: um `upsert` das sete linhas com `onConflict: "weekday"` e `select`, na ordem do dia, com a conversão `HH:MM` ↔ `time` já feita por `toBusinessDay` |
| Repositório | `server/repositories/payment-fees.ts` | novo: `listPaymentFees()` (ordem da enumeração `payment_method`: crédito, débito, Pix, dinheiro) e `replacePaymentFees(fees)`: um `upsert` das quatro linhas por `payment_method`; `percent` convertido de `numeric` para número |

- O `updated_at` das linhas muda pelos gatilhos `trg_business_hours_updated_at` e `trg_payment_fees_updated_at`; a API não o expõe (L1).
- Sem linha de registro própria: `backend.md` não lista a alteração de configurações entre os eventos de negócio, e o tratamento único já grava a requisição com o usuário.

### Tela: abas "Disponibilidade" e "Formas de pagamento" de `/admin/settings`

Conteúdo, textos e estados já definidos em `docs/configuracoes/configuracoes-do-painel.md` (#65); o que muda:

- `settings-section.tsx`: sai o `DemoNotice` e o comentário de demonstração; a leitura continua com o esqueleto, a falha com "Tentar novamente" e o conteúdo.
- `availability-form.tsx` e `payment-fees-form.tsx`: a falha do `PUT` põe as mensagens de `fields` junto ao dia (FE01 e FE02 no campo "Fecha às", "Início da pausa" ou "Fim da pausa" do dia) e ao percentual da forma, com o `detail` no topo e o foco; o digitado continua. O caminho de `fields` da API (`0.closesAt`, `2.percent`) é traduzido para o nome do campo do formulário (`days.0.closesAt`, `fees.pix.percent`) pelo `useFormFailure`, que ganha o parâmetro opcional de tradução. Na gravação, a tela usa a resposta do `PUT` para atualizar os campos (já faz).
- `src/lib/demo/routes.ts`: saem os dois `GET` e os dois `PUT` e o comentário da #41; `src/lib/demo/settings.ts` é removido (as telas leem o banco).
- `configuracoes-do-painel.md`: sai o parágrafo do aviso e do `NOT_IMPLEMENTED`; entram os textos de erro por campo (L2).
- **O que depende dessas rotas na mesma tela.** Nada além das duas abas: a aba "Empresa" já é real (#37). Fora da tela, o portal (rodapé, "Localização" e o passo de horários do agendamento) já lê a disponibilidade real por `GET /api/public/company`; a conferência do critério 1 inclui abrir o portal depois de gravar. O uso da disponibilidade e dos percentuais no agendamento é da #36 (regras prontas), #49 e #107.
- **Dados de demonstração vindos do banco.** O `seed.sql` já cria os sete dias (segunda a sexta 08:00–18:00 com pausa 12:00–13:00, sábado 08:00–12:00, domingo fechado) e as quatro formas sem ajuste, iguais ao que `settings.ts` mostrava; o `seed-demo.sql` só lê os percentuais para os agendamentos de exemplo. Nada muda nos `seed` (P3).

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): os caminhos `/api/admin/settings/business-hours` (`getBusinessHours` e `updateBusinessHours`) e `/api/admin/settings/payment-fees` (`getPaymentFees` e `updatePaymentFees`) na tag `settings`, com `sessionCookie`; os esquemas `BusinessDay`, `PaymentMethod` e `PaymentFee`; as respostas já existentes `Unauthenticated`, `PanelForbidden`, `ValidationError`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`. Sem `VersionConflict` nem `NotFound` (L1).

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado a segunda-feira aberta das 8h às 18h, com pausa das 12h às 13h, quando confirmo, então a disponibilidade é gravada, e `GET /api/public/company` passa a trazê-la (UC23) | Testes de `businessHoursSchema` (corpo válido normalizado). Local, pelo roteiro: o `PUT` responde 200 com os sete dias; o `GET` do painel e o `GET /api/public/company` trazem a segunda 08:00–18:00 com pausa 12:00–13:00; outro dia alterado volta igual. Na tela: mudar "Fecha às" de terça para 17:00 e "Salvar disponibilidade": "Disponibilidade salva."; recarregar mantém; o rodapé e a "Localização" do portal mostram o horário novo |
| Dado o encerramento igual ou anterior à abertura, quando confirmo, então a mensagem aparece no dia e nada é gravado (UC23 FE01) | Testes: `closesAt` igual e anterior a `opensAt` → mensagem em `0.closesAt`. Local: o `PUT` responde 400 com `fields`, e o `GET` seguinte traz os valores de antes (o outro dia do mesmo corpo também não é gravado). Na tela: abertura 18:00 e encerramento 08:00 numa terça: a mensagem aparece junto a "Fecha às" da terça, com o foco no aviso do topo; ao corrigir e salvar, grava |
| Dado uma pausa fora do expediente, ou com o término antes do início, quando confirmo, então a mensagem aparece no dia (UC23 FE02) | Testes: início antes da abertura, fim depois do encerramento, fim igual ou antes do início, pausa só com um dos horários. Local: o `PUT` responde 400 com a mensagem no campo; nada gravado. Na tela: a pausa 07:00–08:00 num dia 08:00–18:00 mostra a mensagem junto ao campo do dia |
| Dado um horário que não é hora cheia nem meia hora, como 8h15, quando confirmo, então recebo "Escolha um horário em hora cheia ou meia hora." (RN035) | Teste: `08:15` em `opensAt` → a mensagem em `0.opensAt`. Local: `PUT` com `08:15` → 400 com a mensagem. A tela só oferece meias horas (caminho de rota) |
| Dado acréscimo de 5% no crédito e desconto de 3% no Pix, quando confirmo, então os percentuais são gravados como 5 e -3; com zero, a forma fica sem ajuste (UC24, UC24 FA01, RN012) | Testes de `signedPercentSchema` e `paymentFeesSchema` (5, −3, 0, 100, −100, 5,25). Local: `PUT` com crédito 5, Pix −3 responde 200 e o `GET` traz `5` e `-3`; o zero volta `0`. Na tela: crédito "Acréscimo" `5`, Pix "Desconto" `3`, "Salvar percentuais": "Percentuais salvos."; recarregar mostra "Desconto 3" no Pix; débito e dinheiro com `0` ficam sem ajuste |
| Dado um desconto acima de 100% ou um valor que não é número, quando confirmo, então recebo a mensagem de percentual inválido (UC24 FE01) | Testes: `100,01`, `-100,01`, `"abc"`, `"5"` (texto), `null`, ausente e três casas → "Informe um percentual de 0 a 100, com até duas casas decimais." (L3). Local: `PUT` com `-150` e com `"abc"` → 400 com a mensagem no item; nada gravado. Na tela: desconto `150` mostra a mensagem junto ao percentual da forma, com os demais dados mantidos |
| Dado um funcionário sem a permissão `settings`, quando chama as rotas, então recebe 403 (RS008) | Local, pelo roteiro: o funcionário de um cargo sem `settings` e o cliente de teste recebem 403 `FORBIDDEN` nos quatro métodos (RS010); sem sessão, 401 `UNAUTHENTICATED`; `PUT` sem `Origin`, 403; `Content-Type` diferente de JSON, 415; nada é gravado. Na tela, o funcionário sem a permissão que abre `/admin/settings` volta com o aviso de acesso negado (`proxy.ts`) |

Outros casos, também pelo roteiro de rotas e pelos testes: lista com seis ou oito dias, `weekday` repetido ou fora de 0 a 6 → 400 sem campo (erro do corpo); lista com três formas, forma repetida ou desconhecida → 400; dia fechado com horários no corpo → gravado fechado e sem horários; dia aberto sem `opensAt` ou `closesAt` → "Preencha este campo."; campos não previstos (`updatedAt`, `createdAt`) descartados; corpo que não é lista → 400.

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, nas duas abas e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação por dia e por forma (acima), falha de acesso (403) e do salvar (500, no topo); a aba não tem estado vazio (os sete dias e as quatro formas sempre existem);
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar;
- teclado completo: as abas, cada interruptor e lista de horário (setas e Enter), "Salvar" por Enter e por espaço, o foco indo ao aviso do topo na falha e voltando ao campo, e a troca de aba sem perder o digitado;
- Lighthouse de acessibilidade em `/admin/settings`, nas abas "Disponibilidade" e "Formas de pagamento" (com a falha de validação exibida, em `snapshot`), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` com o `seed.sql`. Nunca `--linked` nem `--db-url` (decisão 0043). O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; um funcionário de cargo com `settings`, um de cargo sem ela e um cliente, criados pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #40 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `lh-*`) e novos para esta tarefa: `verify-settings-api.mjs` (rotas), `ui-states.mjs`, `ui-flow.mjs` e `ui-keyboard.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` que vem com o Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Alterações temporárias para os estados (requisição retida, falha) ficam sem commit e são desfeitas por `git checkout -- src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Pré-visualização e produção**, passo do Yvan, listado no relatório: ela usa o banco de produção (decisão 0030); gravar a disponibilidade e os percentuais nela muda os dados reais da empresa e o que o portal mostra. **Ponto para a aprovação:** gravar os valores reais da empresa, ou gravar os de teste e restaurar os do `seed.sql` no próprio painel.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/settings/business-hours/route.ts` | criar: `GET` e `PUT` |
| `src/app/api/admin/settings/payment-fees/route.ts` | criar: `GET` e `PUT` |
| `src/server/services/settings.ts` | alterar: as quatro funções |
| `src/server/repositories/business-hours.ts` | alterar: `replaceBusinessHours` |
| `src/server/repositories/payment-fees.ts` | criar |
| `src/shared/validation/formats.ts` | alterar: `signedPercentSchema` |
| `src/shared/validation/settings.ts` | alterar: `businessHoursSchema` e `paymentFeesSchema` |
| `src/shared/validation/README.md` | alterar: os esquemas novos |
| `src/hooks/use-form-failure.ts` | alterar: tradução opcional do nome do campo |
| `src/components/admin/settings/settings-section.tsx` | alterar: sai o `DemoNotice` |
| `src/components/admin/settings/availability-form.tsx` | alterar: nomes dos campos de `fields` |
| `src/components/admin/settings/payment-fees-form.tsx` | alterar: nomes dos campos de `fields` |
| `src/components/admin/settings/availability-values.ts` e `payment-fees-values.ts` | alterar se a tradução do nome do campo ficar aqui (ver notas) |
| `src/lib/demo/routes.ts` | alterar: saem as quatro entradas |
| `src/lib/demo/settings.ts` | remover |
| `tests/validation/formats.test.ts` | alterar: `signedPercentSchema` |
| `tests/validation/settings.test.ts` | alterar: os dois esquemas |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/configuracoes/rotas.md` | alterar (L1, L2) |
| `docs/configuracoes/configuracoes-do-painel.md` | alterar: sai o aviso de demonstração; entram os textos de erro por campo (L2) |
| `docs/padroes/api.md` | alterar: o `updatedAt` nas configurações em lista (L1) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as linhas novas (L2) |
| `docs/padroes/testes.md` | alterar: a tabela "Validação e formatos" cita os esquemas novos |
| `memoria/tarefas/41-disponibilidade-e-pagamento/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/app/api/admin/settings/business-hours/` e `payment-fees/`, `src/server/services/`, `src/server/repositories/`, `src/components/admin/settings/`, `src/lib/demo/` e `tests/validation/` já cobrem os arquivos e não mudam (o de `src/lib/demo/` será conferido: se citar `settings.ts`, entra na lista).

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em edb9369.
- **#39** (cargos) e **#42** (clientes), da mesma onda: nenhum arquivo em comum; `src/lib/demo/routes.ts` é compartilhado, e a conferência de conflito é no momento do PR.
- **#36/#49/#107** (agendamento): usam `listBusinessHours` e os percentuais gravados aqui. Ao fim, deixo um comentário na #49, na #50 e na #107 com o que esta tarefa deixou para elas (rotas, `listPaymentFees` e `listBusinessHours` no repositório, sem `updatedAt`).

## Testes previstos

Valores esperados tirados de RN012, RN013, RN035, de `mensagens-de-validacao.md` e das opções recomendadas de L2 e L3. Escritos antes do código e conferidos em vermelho, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/formats.test.ts`, `signedPercentSchema`:

- accepts a surcharge, a discount and zero: `5`, `-3`, `0`, `100`, `-100`, `5.25`, `-0.5`
- rejects a value outside the range: `100.01`, `-100.01` → "Informe um percentual de 0 a 100, com até duas casas decimais."
- rejects more than two decimals and what is not a number: `1.234`, `"abc"`, `"5"`, `NaN` → a mesma mensagem
- requires the value: `null` e ausente → "Preencha este campo."

`tests/validation/settings.test.ts`, `businessHoursSchema`:

- accepts the seven days of the seed: segunda a sexta 08:00–18:00 com pausa 12:00–13:00, sábado 08:00–12:00, domingo fechado
- discards the times of a closed day and the unknown fields
- requires the times of an open day: `opensAt`/`closesAt` ausentes ou `null` → "Preencha este campo."
- rejects a time that is not a whole or half hour: `08:15`, `8:00`, `24:00` → "Escolha um horário em hora cheia ou meia hora." no campo `0.opensAt`
- rejects closing at or before opening: `closesAt` igual e anterior → "O encerramento deve ser depois da abertura." em `<dia>.closesAt` (UC23 FE01)
- rejects a break outside the working hours or inverted: início antes da abertura → "A pausa deve começar a partir da abertura." em `breakStartsAt`; fim depois do encerramento → "A pausa deve terminar até o encerramento." e fim igual ou antes do início → "O fim da pausa deve ser depois do início." em `breakEndsAt` (UC23 FE02)
- rejects a break with only one time: "Preencha este campo." no horário que falta
- accepts a break that touches the opening or the closing: início = abertura, fim = encerramento
- requires the seven days once each: seis, oito, `weekday` repetido ou 7 → "Informe os sete dias da semana, sem repetir." sem campo
- keeps the first message of each field

`tests/validation/settings.test.ts`, `paymentFeesSchema`:

- accepts the four methods with a signed percent: crédito `5`, Pix `-3`, débito e dinheiro `0` (UC24, FA01)
- requires the four methods once each: três, repetida ou `boleto` → "Informe as quatro formas de pagamento, sem repetir." sem campo
- reports an invalid percent in the item: `150`, `-150`, `"abc"` → a mensagem do percentual em `<índice>.percent`
- discards the unknown fields

Sem teste automático para rota, serviço, repositório e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. `updatedAt` nas rotas de lista

**Problema.** O corpo da #41 pede "`requirePermission("settings")` e o `updatedAt` (decisão 0009)" e `api.md` (Concorrência) diz que "em configurações gravadas em lista (disponibilidade, formas de pagamento), vale o `updatedAt` mais recente da lista". Já `rotas.md`, `configuracoes-do-painel.md` e o comentário da #41 definem o `PUT` sem `updatedAt` e sem `VERSION_CONFLICT`, e o `BusinessDay` e o `PaymentFee` de `src/shared/api/settings.ts` não têm o campo. Com o `updatedAt`, a gravação das sete (ou quatro) linhas condicionada à versão não cabe numa instrução do `supabase-js`: exigiria uma função SQL (migration que você aplica).

**Opções:**

- [x] **1. Sem `updatedAt`; a última gravação prevalece (recomendada).** Vale `rotas.md` e o comentário da #41. O `PUT` substitui a lista inteira numa instrução; não há migration. Duas pessoas editando ao mesmo tempo: a última a salvar vale (a tela já reflete a resposta do `PUT`). Exceção à 0009 só nestas duas listas, registrada em `api.md`.
- [ ] **2. Com `updatedAt` (o mais recente da lista) e 409 `VERSION_CONFLICT`.** Cada item ganha `updatedAt`, o `PUT` o devolve, e a gravação só acontece se nenhum item mudou: precisa de uma função SQL com migration (aplicada por você), mais cerca de 120 linhas e a tela tratando o conflito; os tipos, `rotas.md`, a #65 e o OpenAPI mudam.

**Texto proposto (opção recomendada):**

- `docs/padroes/api.md`, Concorrência: "Em configurações gravadas em lista (disponibilidade, formas de pagamento), vale o `updatedAt` mais recente da lista." passa a "As configurações gravadas em lista (disponibilidade, formas de pagamento) não têm `updatedAt`: o `PUT` substitui a lista inteira numa só instrução, e a última gravação prevalece (exceção a RNF011, decisão 0009)."
- `docs/configuracoes/rotas.md`, cabeçalho: "`updatedAt` obrigatório em `PATCH` e `PUT`, com 409 `VERSION_CONFLICT`" passa a "`updatedAt` obrigatório em `PATCH` e `PUT`, com 409 `VERSION_CONFLICT`, exceto no `PUT` das duas listas, `business-hours` e `payment-fees`".

### L2. Mensagens e campos de erro das duas listas

**Problema.** UC23 FE01 e FE02 pedem "indicar o problema" no dia, e `mensagens-de-validacao.md` só tem a mensagem de horário fora de hora cheia ou meia hora. Faltam os textos do encerramento, da pausa e do corpo com dias ou formas faltando, e o caminho do campo na lista (`api.md` cita só `services.0.serviceId`, lista dentro de objeto).

**Opções:**

- [x] **1. Textos próprios e caminho pelo índice da lista (recomendada).** Cinco mensagens novas e o campo em `fields` como `<índice>.<campo>` (`1.closesAt`, `2.percent`), com o índice igual a `weekday` ou à posição da forma; a tela traduz para o nome do campo. Cada problema aponta o campo certo.
- [ ] **2. Uma só mensagem genérica no topo.** "Confira os horários." sem campo: o requisito "a mensagem aparece no dia" (issue, UC23) não é cumprido.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, depois da linha "Horário", cinco linhas novas:
  - "Encerramento igual ou anterior à abertura | O encerramento deve ser depois da abertura."
  - "Início da pausa antes da abertura | A pausa deve começar a partir da abertura."
  - "Fim da pausa depois do encerramento | A pausa deve terminar até o encerramento."
  - "Fim da pausa igual ou anterior ao início | O fim da pausa deve ser depois do início."
  - "Dias ou formas de pagamento incompletos ou repetidos (sem campo) | Informe os sete dias da semana, sem repetir. / Informe as quatro formas de pagamento, sem repetir."
- `docs/configuracoes/rotas.md`, `PUT business-hours` e `PUT payment-fees`: "Resposta: 400 …" ganha "; o campo com problema vai em `fields` com o índice do item da lista (`1.closesAt`, `2.percent`)". `docs/padroes/api.md`, parágrafo de `fields`: "…`services.0.serviceId`)" ganha ", ou, no corpo que é uma lista, o índice do item (`0.closesAt`)".
- `docs/configuracoes/configuracoes-do-painel.md`, "Disponibilidade": a frase sobre FE01 e FE02 passa a "a mensagem aparece junto ao campo do dia ('Fecha às', 'Início da pausa' ou 'Fim da pausa')".

### L3. Mensagem do percentual com sinal

**Problema.** `mensagens-de-validacao.md` tem "Informe um percentual de 0 a 100, com até duas casas decimais." (a tela pede a grandeza de 0 a 100 e o ajuste à parte), mas a rota recebe o valor com sinal, de −100 a 100. UC24 FE01 fala em valor "negativo", e `rotas.md` e `dados.md` aceitam negativo como desconto.

**Opções:**

- [x] **1. Reusar a mensagem de hoje (recomendada).** O erro aparece no campo da tela, que mostra de 0 a 100; a mensagem é a que a pessoa entende. Quem chama a API vê o mesmo texto para −150.
- [ ] **2. Mensagem própria da API: "Informe um percentual de −100 a 100…".** Aparece na tela, no campo de 0 a 100, com um intervalo que ela não aceita.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, linha "Percentual": acrescentar ao título "Percentual (a rota das formas de pagamento o recebe com sinal, de −100 a 100; a mesma mensagem vale)".
- `docs/configuracoes/UC24-configurar-formas-de-pagamento.md`: sem mudança (o FE01 fala do valor digitado na tela, que o sinal da API reflete).

### L4. Onde as regras da disponibilidade e dos percentuais são conferidas

**Problema.** O corpo da #41 diz "o esquema de validação no formulário", e `configuracoes-do-painel.md` diz que "a consistência dos horários (UC23 FE01 e FE02) é conferida pela rota" e que o percentual fora do intervalo "é conferido pela rota". O comentário da #41 repete que "a tela só envia".

**Opções:**

- [x] **1. Só a rota confere, a tela mostra as mensagens de `fields` (recomendada).** Vale o documento. Os esquemas ficam em `src/shared/validation/` (decisão 0008) e podem ser usados pelo formulário depois; os controles já impedem o que dá para impedir. O primeiro envio vai à rota, e o erro volta no dia.
- [ ] **2. A tela também confere antes de enviar, com `safeParse(toRequestBody(values))`.** Mensagem sem ida à rede, mas duas conferências, o formulário passa a depender do esquema e `configuracoes-do-painel.md` muda; a #40 usou o `zodResolver` porque o formulário tinha os mesmos campos do esquema, o que aqui não ocorre (o formulário tem `hasBreak` e o ajuste).

**Texto proposto (opção recomendada):** nenhum; `configuracoes-do-painel.md` já diz isso.

## Decisões técnicas

- Seguidas: 0002 (API em rotas do Next.js), 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js` e migration SQL), 0008 (validação compartilhada), 0010 (permissões por página), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos), 0049 (shadcn sobre Base UI), 0053 (horários HH:MM no fuso da empresa) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `componentes.md` e `frontend.md`.
- Exceção à 0009 (L1, opção recomendada): as duas listas não têm `updatedAt`. Fica registrada em `api.md`, sem registro de decisão novo, porque a 0009 trata do registro editável e as listas são substituídas por inteiro.
- A gravação atômica é um `upsert` do `supabase-js` (uma instrução), sem função SQL, o que evita migration (decisão 0006).
- Nenhuma nova.

## Riscos e dúvidas

- **Gravação em uma instrução.** O `upsert` envia `weekday`/`payment_method` e as colunas dos valores; `created_at` fica com o padrão da linha existente. Se o `supabase-js` exigir todas as colunas obrigatórias, `is_open` sempre vai no corpo, então basta. Conferido na verificação local: `updated_at` muda e `created_at` não.
- **Ordem das formas de pagamento.** A ordem de `order("payment_method")` é a da enumeração (`credit`, `debit`, `pix`, `cash`), igual à de `rotas.md`; conferida no banco local.
- **Horas do banco.** O tipo `time` volta como `08:00:00`; a conversão para `HH:MM` já existe em `toBusinessDay`.
- **Percentual como número.** A coluna `numeric(5,2)` volta como número do `supabase-js` (ou texto, se o driver preferir): a conversão para número fica no repositório e é conferida (`-3` volta `-3`, não `"-3.00"`).
- **Concorrência sem `updatedAt`.** Duas pessoas salvando ao mesmo tempo: a última vale (L1).
- **Produção.** Gravar na pré-visualização altera a disponibilidade real do portal e dos novos agendamentos (RN013); passo seu, listado no relatório.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo seu.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 310 linhas adicionadas (rotas 50, serviço 40, repositórios 90, esquemas e formato 90, hook e formulários 40), contra cerca de 100 removidas (a demonstração de `settings.ts`), mais ~230 de testes e as especificações.

### P1. Divisão em PRs

- [x] **1. Um PR só (recomendada).** Cerca de 310 linhas em `src/`, abaixo das ~400, com a tela ligada às rotas e a verificação completa antes de marcar como pronto, `memoria/tarefas/41-…` e "Closes #41".
- [ ] **2. Dois PRs encadeados (API e tela).** Como na #40; o primeiro deixaria a tela em demonstração por mais um ciclo de revisão.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da gravação real.

### P3. Dados de demonstração dos percentuais

- [x] **1. Manter o `seed.sql` e o `seed-demo.sql` (recomendada).** A disponibilidade e as formas de pagamento já vêm do banco, com os valores iniciais; o funcionário define os percentuais pela tela. Os totais dos agendamentos de exemplo seguem sem ajuste.
- [ ] **2. Dar percentuais ao `seed-demo.sql` (por exemplo crédito +3, Pix −5).** A tela abre com a demonstração preenchida, mas os totais dos agendamentos de exemplo (RN010) passam a mudar, e o `seed-demo.sql` não é aplicado em produção.

### P4. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível da tradução do nome do campo em `availability-values.ts`/`payment-fees-values.ts` (já listado) ou de um componente que a conferência do teclado exija.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- O uso da disponibilidade e dos percentuais no agendamento: cálculo do valor e oferta de horários (#36, #49, #107).
- Dados da empresa (#37, feita) e as demais abas de `/admin/settings`.
- Migration, dependência nova e registro de decisão.
- Texto próprio para o conflito de edição simultânea (L1, opção 2).
- Dias especiais, feriados e exceções de calendário: sem requisito em `docs/configuracoes/`.
