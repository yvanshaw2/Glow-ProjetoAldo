---
issue: 45
pull_request: 121
---

# Relatório: Veículos do cliente pelo painel

Em dois PRs, como aprovado em P1: o #120, da API com a migration (`Refs #45`), e o #121, da tela (`Closes #45`), sobre o #120. O relatório está completo, e o plano passou a `concluido` neste PR.

## O que foi feito

PR #120, API e banco:

- **Rotas** com `requirePermission("clients")` (UC18, RF016, RF075, RF076, RN002, RN035, RN036, RN037, RS008, RS010, RS013, RNF011):
  - `GET /api/admin/clients/:id/vehicles`: 10 por página, na ordem do vínculo, com `isShared` (L6); 404 para cliente inexistente ou excluído;
  - `GET /api/admin/vehicles/lookup`: cinco campos ou `null`, sem dado de cliente;
  - `POST /api/admin/clients/:id/vehicles`: placa nova cria o veículo e o vínculo; placa cadastrada vincula sem alterar e ignora os demais campos; placa nova incompleta → 400 com os campos (L2); `VEHICLE_ALREADY_LINKED` com "Este veículo já está na conta do cliente." (L1);
  - `PATCH /api/admin/vehicles/:id`: parcial, condicionado ao `updatedAt`; `PLATE_IN_USE`, `VERSION_CONFLICT`, 404 (L4); o porte vem do tipo.
- **Migration** `20261026121013_link_vehicle_function.sql`: função `link_vehicle`, com `execute` só para `service_role`.
- **Esquemas** `vehicleDataSchema`, `vehicleInputSchema`, `vehicleUpdateSchema`, `vehicleLookupQuerySchema`, `vehicleFormSchema` e `vehiclePlateFormSchema` (a mensagem do tipo, L3); repositório e serviço `vehicles.ts`; especificação OpenAPI.

PR #121, tela:

- **Veículos dos detalhes ligados às rotas:** saem as quatro entradas de `src/lib/demo/routes.ts`, `src/lib/demo/admin-clients.ts` e o aviso de demonstração da seção; os diálogos de cadastro (por etapa) e de edição usam os esquemas compartilhados (`zodResolver` com `raw: true`) e `clearErrors()` antes do envio. O aviso de placa já na conta vem do envio, no topo da janela (L5).
- Nada em `/admin/clients` fica em demonstração. Continuam em demonstração, com outras rotas: `/profile` e o agendamento do cliente (#106) e o agendamento pelo painel (#49).

## Arquivos alterados

- API e banco: `supabase/migrations/20261026121013_link_vehicle_function.sql`; `src/shared/validation/vehicles.ts` e `README.md`; `src/server/repositories/vehicles.ts` e `src/server/services/vehicles.ts` (novos); `src/app/api/admin/clients/[id]/vehicles/route.ts`, `vehicles/lookup/route.ts` e `vehicles/[id]/route.ts` (novos); `tests/validation/vehicles.test.ts`; `docs/plataforma/openapi.yaml`, `docs/clientes/rotas.md` e `dados.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.
- Tela: `src/components/shared/add-vehicle-dialog.tsx`, `edit-vehicle-dialog.tsx` e `vehicle-fields.tsx`; `src/components/admin/clients/client-details-dialog.tsx`; `src/lib/demo/routes.ts` e `admin-clients.ts` (apagado); `src/app/(admin)/admin/clients/page.tsx`; `docs/clientes/clientes-do-painel.md`.

Desvio do plano (ver `notas.md`): `src/app/(admin)/admin/clients/page.tsx` ficou fora da lista original (só o comentário que dizia "até a #45"); acrescentado à lista e confirmado antes do PR.

## Testes executados

- `npm run check`: sem erros nem avisos (601 testes, 25 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rotas**, no banco local (`db reset` com as cinco migrations, `seed-demo.sql`, admin, dois funcionários e um cliente, `next start` na porta 3042), pelo roteiro `verify-vehicles-api.mjs`, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `clients` e para o cliente nas quatro rotas; `POST` e `PATCH` sem `Origin` 403; `text/plain` 415; nada gravado pelas recusadas; a retirada de `clients` do cargo vale na requisição seguinte;
  - lista: as duas placas de Ana na ordem do vínculo, campos e porte P, `pageSize=100` volta 50, `page=0` 400, cliente inexistente, excluído e id que não é UUID 404, cliente sem veículos com página vazia;
  - consulta: placa cadastrada devolve só os cinco campos; placa nova devolve `null`; placa inválida e ausente 400;
  - critério 1: `POST` da placa "abc1d23" como SUV → 201 com porte `large`, uma linha em `vehicles` e uma em `client_vehicles`, `id`, `size` e `isShared` do corpo descartados; marca, modelo e cor normalizados;
  - critério 2: `POST` só com a placa cadastrada em outra conta → 201 com o mesmo `id`, `isShared` verdadeiro nas duas contas, nenhum veículo novo e dados enviados junto ignorados;
  - critério 3: segunda tentativa na mesma conta → 409 `VEHICLE_ALREADY_LINKED` com o texto do painel, nada gravado;
  - critério 4: `PATCH` de hatch para picape → 200 com `extra_large`; os 23 agendamentos do veículo iguais antes e depois (comparação das linhas completas); `updated_at` mudou;
  - critério 5: `PATCH` com a placa de outro veículo → 409 `PLATE_IN_USE`, nada muda; reenviar a própria placa → 200;
  - critério 6: `abc-1234` gravada como `ABC1234` no `POST` e no `PATCH`, e a consulta com hífen acha o veículo;
  - critério 7: ver o primeiro item;
  - placa nova com dados inválidos e só com a placa → 400 com os cinco campos, nada gravado; ano do ano seguinte aceito; `updatedAt` antigo → 409 `VERSION_CONFLICT` sem gravar; só `updatedAt` e sem `updatedAt` → 400; cliente excluído 404 no `GET` e no `POST`; edição de veículo compartilhado vista pela outra conta;
  - função: `link_vehicle` com cliente inexistente falha (23503) e não deixa veículo; `anon` e `authenticated` recebem 42501; dois `POST` simultâneos da mesma placa nova: um veículo e dois vínculos.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro (`ui-vehicles.mjs`), tudo certo:
  - **Estados:** sem aviso de demonstração; carregamento (lugar reservado), falha da leitura com "Tentar novamente", acesso negado, vazio ("Nenhum veículo cadastrado."); falha da consulta da placa e do cadastro (aviso no topo com o foco, dados mantidos); falha e 403 da edição; sem transbordo horizontal;
  - **Fluxos:** placa vazia e inválida; máscara da placa; placa nova com uma mensagem em cada um dos cinco campos, ano com letras, marca acima de 40 e cor com número; cadastro com o cartão "SUV · Porte G" e o foco de volta a "Cadastrar veículo"; placa cadastrada em outra conta com os dados e "Adicionar à conta" (cartão "Também vinculado a outra conta"); placa já na conta com o aviso do painel e o foco nele; edição com os campos preenchidos, ano inválido, `PLATE_IN_USE`, `VERSION_CONFLICT` com a janela mostrando os dados atuais e depois o salvar ("Picape · Porte GG");
  - **Teclado** (`ui-keyboard-vehicles.mjs`, nos dois tamanhos): Tab até "Ver detalhes" e "Cadastrar veículo"; Enter abre a janela com o foco em "Placa"; Enter na placa consulta e leva o foco ao tipo; setas mudam o tipo; Tab percorre Marca, Modelo, Cor, Ano, "Voltar" e "Cadastrar veículo"; Enter cadastra e o foco volta ao botão; Esc devolve o foco ao botão de cada janela e, nos detalhes, a "Ver detalhes";
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/clients` (navegação) e 1,0 nas 56 capturas de estado (14 estados nas quatro combinações: detalhes com veículos, vazios e com falha da leitura; cadastro na placa, com erro, placa nova com e sem erros, placa cadastrada, já na conta, falha do salvar; edição, com erros, com falha e de veículo compartilhado);
  - **Desempenho (navegação, `next start` local):** celular LCP 3,6 a 3,7 s, CLS 0, TBT 90 a 140 ms, desempenho 0,88 a 0,90; computador LCP 0,6 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (as quatro rotas e os esquemas de veículo), `docs/clientes/rotas.md`, `dados.md` e `clientes-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md` (a mensagem do tipo) e `docs/padroes/testes.md`.
- Lacunas resolvidas, todas na opção 1: L1 (texto do painel) → `rotas.md` e `clientes-do-painel.md`; L2 (placa existente ignora os dados; placa nova exige os cinco) → `rotas.md`; L3 (mensagem do tipo) → `mensagens-de-validacao.md`; L4 (`PATCH` parcial) → `rotas.md`; L5 (aviso vem do envio) → `clientes-do-painel.md`; L6 (ordem do vínculo e `isShared`) → `rotas.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`/api/admin/clients/:id/vehicles` e `/api/admin/vehicles/*`: o `POST` com a placa cadastrada, o `PATCH` parcial, o 409 `VEHICLE_ALREADY_LINKED` com a mensagem do painel) e a seção de dados (a função `link_vehicle`); Análise do Sistema, UC18 FE02 (o aviso vem ao confirmar a vinculação, não ao consultar a placa).

## Pendências

- **Do Yvan:** aplicar a migration com `npx supabase db push` a partir da branch do PR #120 (não da `main`) e comentar no PR; conferir logado, na pré-visualização, `/admin/clients` (veículos de um cliente do `seed-demo.sql`, cadastro de placa nova, vínculo de placa cadastrada e edição) e o LCP do celular. A pré-visualização usa o banco de produção (decisão 0030): os veículos cadastrados nela são dados reais. O `seed-demo.sql` não mudou.
- Fora desta tarefa, para tarefas à parte: o Enter num campo de formulário em etapas não avança (todos os `StepForm`, achado da #43).
- Etapa 04: comentário nas issues #106, #49 e #107 com o que a tarefa deixou.
