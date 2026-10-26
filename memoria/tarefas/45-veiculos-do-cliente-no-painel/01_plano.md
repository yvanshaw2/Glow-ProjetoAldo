---
issue: 45
titulo: "Veículos do cliente pelo painel"
areas: [backend, frontend, banco, testes]
tipo: funcionalidade
requisitos: [UC18, RF016, RF075, RF076, RN002, RN035, RN036, RN037, RS008, RS010, RS013, RNF005, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 26/10/2026 - 09:07
---

# Plano: Veículos do cliente pelo painel

## Objetivo

Entregar o UC18 de ponta a ponta: o funcionário com a permissão `clients` lista, cadastra, vincula e edita os veículos de um cliente, nos detalhes da conta em `/admin/clients`, pelas rotas de `docs/clientes/rotas.md`, todas com `requirePermission("clients")` (RS008, RS010):

- `GET /api/admin/clients/:id/vehicles`: página (10 por página) dos veículos da conta, na ordem em que foram vinculados, com `isShared` (RN036); 404 se o cliente não existe ou foi excluído;
- `GET /api/admin/vehicles/lookup?plate=`: os dados do veículo da placa, se já cadastrada, ou `null`; nunca devolve dados de clientes;
- `POST /api/admin/clients/:id/vehicles`: cadastra o veículo de uma placa nova e o vincula à conta, ou vincula o veículo da placa já cadastrada, sem criar outro (RN036); 201; 400 com `fields`; 404; 409 `VEHICLE_ALREADY_LINKED`. O porte vem do tipo, calculado pelo banco (RN002);
- `PATCH /api/admin/vehicles/:id`: edita o veículo, inclusive o que está em mais de uma conta, condicionado ao `updatedAt` (RNF011, decisão 0009); 200; 400; 404; 409 `PLATE_IN_USE` e `VERSION_CONFLICT`. Os agendamentos já registrados guardam a própria cópia do veículo e não mudam (RN037).

**A seção "Veículos" dos detalhes deixa de ser demonstração** (orientação do Yvan e decisão 0055): saem de `src/lib/demo/routes.ts` as quatro entradas (`GET /api/admin/clients/:id/vehicles`, `GET /api/admin/vehicles/lookup`, `POST /api/admin/clients/:id/vehicles`, `PATCH /api/admin/vehicles/:id`); `src/lib/demo/admin-clients.ts` é apagado (só `routes.ts` o importa); sai o `DemoNotice` de `client-details-dialog.tsx`; os diálogos de cadastro e de edição passam a validar no navegador pelo esquema compartilhado (critério da issue). A demonstração vem do banco: o `supabase/seed-demo.sql` já tem os 13 clientes, os 14 veículos e os vínculos (a SW4 em duas contas), com os ids que a demonstração usava, então **não muda**.

**O que depende dessas rotas na mesma tela.** Nada: a janela de detalhes lê o cliente (real desde a #42) e os veículos (reais com esta tarefa), e o envio de cadastro e de edição usa as rotas novas. Depois da #45, `/admin/clients` inteira é real e não tem aviso. Continuam em demonstração, cada uma com a sua tarefa, as telas que reusam os mesmos diálogos com outras rotas: `/profile` e o agendamento do cliente (`/api/me/vehicles*`, #106) e o agendamento pelo painel (`/api/admin/appointments/lookup/vehicles`, #49). Como os diálogos são compartilhados, a validação no navegador também passa a valer ali (ver Riscos).

**Migration: uma**, `link_vehicle` (veículo, quando a placa é nova, e vínculo com a conta, numa transação), como pede a issue e `dados.md`; o Yvan a aplica. Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/45-vehicles`, criada da `origin/main` (c719126, com a #43: PRs #118 e #119), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/sleepy-pare-2630d1`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em c719126, árvore limpa.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondPage`, `requirePermission`, `getServiceClient`, `AppError` (`NOT_FOUND`, `VERSION_CONFLICT`, `PLATE_IN_USE`, `VEHICLE_ALREADY_LINKED` com `message` própria, `VALIDATION_ERROR` com `fields`); em `formats.ts`: `plateSchema`, `vehicleBrandModelSchema`, `vehicleColorSchema`, `vehicleYearSchema`; em `params.ts`: `idSchema`, `paginationSchema`, `updatedAtSchema`; tipos `ClientVehicle` e `VehicleLookup` (`src/shared/api/vehicles.ts`, não mudam); `findAdminClient` (repositório de clientes, #42); `VEHICLE_TYPES` e `formatPlate`; no cliente: `apiRequest`, `withQuery`, `usePaginatedList`, `useFormFailure`, `FormAlert`, `FormField`, `AddVehicleDialog`, `EditVehicleDialog`, `ClientVehicleList`, `ClientVehicleCard` (da #64).
- Moldes: `services/clients.ts` e `repositories/clients.ts` (`PATCH` condicionado ao `updated_at`, `findAdminClient` para o 404), `rpc` de `repositories/services.ts` e a migration `20261025182500_save_service_function.sql` (`set search_path = ''`, `revoke`, `grant`), `client-form-dialog.tsx` (resolvedor, `clearErrors`).

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/clients/:id/vehicles` | `page`, `pageSize` | 200 página de `ClientVehicle`; 404 |
| `GET /api/admin/vehicles/lookup` | `plate*` | 200 `VehicleLookup` ou `null`; 400 `plate` |
| `POST /api/admin/clients/:id/vehicles` | `plate*`; placa nova: `type*`, `brand*`, `model*`, `color*`, `year*` | 201 `ClientVehicle`; 400 com `fields`; 404; 409 `VEHICLE_ALREADY_LINKED` |
| `PATCH /api/admin/vehicles/:id` | `updatedAt*` e, ao menos um, `type`, `plate`, `brand`, `model`, `color`, `year` | 200 `ClientVehicle`; 400; 404; 409 `PLATE_IN_USE`, `VERSION_CONFLICT` |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem `clients` ou origem recusada), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500. Id que não é UUID responde o 404 do recurso.
- Campos não previstos são descartados (RS013): `id`, `size`, `isShared`, `clientId`, `createdAt`. O porte nunca é gravado pela aplicação (RN002).
- A placa chega com ou sem hífen, em qualquer caixa, e é gravada em maiúsculas e sem hífen (`plateSchema`, RN035). `"abc-1234"` → `"ABC1234"`.

### Esquemas (`src/shared/validation/vehicles.ts`, novo), TDD

| Esquema | Regras |
|---|---|
| `vehicleLookupQuerySchema` | `plate` (`plateSchema`) |
| `vehicleInputSchema` (corpo do `POST`) | `plate` (`plateSchema`) e, opcionais, `type`, `brand`, `model`, `color`, `year`. A completude dos cinco dados quando a placa é nova é conferida pelo serviço com o `vehicleDataSchema` (L2), porque só o banco sabe se a placa existe |
| `vehicleDataSchema` | `type` (um de `hatch`, `sedan`, `suv`, `pickup`; ausente ou fora da lista → mensagem da L3), `brand` e `model` (`vehicleBrandModelSchema`), `color` (`vehicleColorSchema`), `year` (`vehicleYearSchema` do ano corrente na hora da chamada) |
| `vehicleUpdateSchema` (corpo do `PATCH`) | `type`, `plate`, `brand`, `model`, `color`, `year` opcionais com as mesmas regras, mais `updatedAt` obrigatório (`updatedAtSchema`); só `updatedAt` → "Informe ao menos um campo para alterar." |
| `vehicleFormSchema` (formulário) | os mesmos campos, com `plate` e `year` como o formulário os tem (texto com máscara e texto de dígitos): converte `year` de texto para número antes do `vehicleYearSchema`; vazio → "Preencha este campo."; o `type` nulo do cadastro novo → mensagem da L3 |

O ano corrente vem de um ajudante `currentVehicleYear()` no mesmo arquivo (fuso da empresa, `formatYear` de `shared/format/date.ts`), que o servidor e o formulário usam, de modo que há um só conjunto de regras. O formulário **usa** os esquemas no navegador por um resolvedor próprio (o ano é texto no formulário e número no corpo): no cadastro, o da etapa (só a placa em "Continuar"; os cinco dados na placa nova); na edição, o `vehicleFormSchema` completo. Saem as notas de "sem esquema de validação" de `vehicle-fields.tsx`.

### Backend (decisões 0003, 0005, 0006, 0008, 0009, 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/clients/[id]/vehicles/route.ts` | `GET`: guard, `idSchema` (inválido → `NOT_FOUND`), `paginationSchema(SHORT_LIST_PAGE_SIZE)`, `listClientVehicles`, `respondPage`. `POST`: guard, `idSchema`, `vehicleInputSchema.parse(body)`, `addClientVehicle`, `respondCreated` |
| Rota | `app/api/admin/vehicles/lookup/route.ts` | `GET`: guard, `vehicleLookupQuerySchema.parse`, `lookUpVehicle`, `respondOk` (corpo `null` quando a placa é nova) |
| Rota | `app/api/admin/vehicles/[id]/route.ts` | `PATCH`: guard, `idSchema`, `vehicleUpdateSchema.parse`, `updateVehicle`, `respondOk` |
| Serviço | `server/services/vehicles.ts` | novo: `listClientVehicles`, `lookUpVehicle`, `addClientVehicle`, `updateVehicle` |
| Repositório | `server/repositories/vehicles.ts` | novo: `listVehiclesOfClient(clientId, page, pageSize)`, `findVehicleByPlate(plate)`, `findVehicle(id)`, `linkVehicle(clientId, plate, data \| null)` (a `rpc`), `updateVehicle(id, changes, updatedAt)` |
| Banco | `supabase/migrations/<data>_link_vehicle_function.sql` | `link_vehicle` |

- **Listagem.** `client_vehicles` com `vehicles`, ordem `client_vehicles.created_at` e `vehicle_id` (estável), `range` da página e contagem exata; o `isShared` vem de uma segunda consulta em lote em `client_vehicles` dos ids da página (`idx_client_vehicles_vehicle_id`), sem N+1 (L6). O cliente é lido antes com `findAdminClient` (404).
- **Consulta de placa.** Devolve só `type`, `brand`, `model`, `color` e `year`; sem `id`, sem contas.
- **Cadastro** (`addClientVehicle`): `findAdminClient` (404); procura a placa; se existe, vincula sem usar os dados que vieram (L2); se não, valida os cinco dados com `vehicleDataSchema` (400 com `fields` por campo ausente) e chama `link_vehicle`. `null` da função → `VEHICLE_ALREADY_LINKED` com a mensagem do painel (L1). Devolve o veículo relido, com `isShared`.
- **Função SQL** `link_vehicle(p_client_id uuid, p_plate text, p_type public.vehicle_type, p_brand text, p_model text, p_color text, p_year smallint) returns uuid`: `insert into vehicles ... on conflict (plate) do nothing`, lê o id da placa (a nova ou a que já existia, inclusive a criada por outra requisição ao mesmo tempo), `insert into client_vehicles ... on conflict do nothing returning`; sem linha inserida, devolve `null` (já vinculado) e nada mais muda. `set search_path = ''`, `revoke ... from public, anon, authenticated`, `grant execute ... to service_role`, como `save_service`. As restrições do banco (`ck_vehicles_plate`, `ck_vehicles_year`, `not null`, `fk_client_vehicles_client_id`) decidem o que o servidor deixar passar.
- **Edição** (`updateVehicle`): `findVehicle` (404); `update ... eq("updated_at", updatedAt)`, sem linha → `VERSION_CONFLICT`; `unique_violation` em `uq_vehicles_plate` → `PLATE_IN_USE` (L4); o porte muda sozinho com o tipo (coluna gerada) e a linha dos agendamentos não é tocada (RN037). Trocar a placa para a própria placa não conflita.
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: seção "Veículos" dos detalhes de `/admin/clients`

Conteúdo, textos e estados já definidos em `docs/clientes/clientes-do-painel.md` (#64); o que muda:

- `client-details-dialog.tsx`: sai o `DemoNotice` (e o import) e o comentário "Until #45".
- `add-vehicle-dialog.tsx` e `edit-vehicle-dialog.tsx`: resolvedor sobre o esquema compartilhado (por etapa no cadastro), `clearErrors()` antes do envio, falhas de campo junto de cada campo e as demais no topo da janela com os dados mantidos (`useFormFailure` já faz); `PLATE_IN_USE` e `VERSION_CONFLICT` no topo da edição, com o 409 relendo a lista e a janela recebendo os dados atuais (já ligado a `onConflict`). O cadastro recebe do painel a mensagem do `VEHICLE_ALREADY_LINKED` (L1) pela mensagem da própria `AppError`, sem parâmetro novo.
- `vehicle-fields.tsx`: saem a nota de demonstração e, se sobrar, o `type` nulo sem mensagem; o campo "Tipo" mostra a mensagem do esquema.
- `src/lib/demo/routes.ts`: saem as quatro entradas. `src/lib/demo/admin-clients.ts`: apagado. `src/lib/demo/README.md` é conferido; `clients.ts` e `vehicles.ts` da demonstração ficam, porque o portal e `admin-appointments.ts` ainda os usam.
- Foco: depois do cadastro e da edição a janela fecha e o foco volta ao botão que a abriu (`Cadastrar veículo` e `Editar`), que continuam na tela; sem foco perdido.

### Dados de demonstração (`supabase/seed-demo.sql`)

Sem mudança: os 14 veículos e os vínculos dos 13 clientes já estão no arquivo, com os mesmos ids da demonstração anterior. Um cliente criado pelo painel não tem veículos ("Nenhum veículo cadastrado").

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/clients/{id}/vehicles` (`listClientVehicles`, `addClientVehicle`), `/api/admin/vehicles/lookup` (`lookUpVehicle`) e `/api/admin/vehicles/{id}` (`updateVehicle`) na tag dos clientes, com `sessionCookie`; os esquemas `ClientVehicle`, `ClientVehiclePage`, `VehicleLookup`, `VehicleInput` e `VehicleUpdateInput`; as respostas existentes `NotFound`, `VersionConflict`, `ValidationError`, `Unauthenticated`, `PanelForbidden`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`; os 409 `VEHICLE_ALREADY_LINKED` (texto do painel) e `PLATE_IN_USE`, e o 200 com corpo `null` da consulta.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado a placa nova "ABC1D23", quando informo SUV, marca, modelo, cor e ano e confirmo, então o veículo aparece na conta com o porte G (UC18, RN002) | Testes de `vehicleDataSchema` e `vehicleInputSchema` (corpo válido normalizado: placa em maiúsculas sem hífen, marca e modelo com iniciais, cor com a primeira maiúscula, ano número). Local: `POST` → 201 com `size: "large"`, `isShared: false`; SQL: uma linha em `vehicles` com `size = 'large'` (coluna gerada) e uma em `client_vehicles`; o `GET` da lista o traz. Na tela: "Cadastrar veículo" → placa → "Continuar" → tipo SUV e os dados → "Cadastrar veículo": a janela fecha e o cartão "SUV · Porte G" aparece |
| Dado uma placa já cadastrada em outra conta, quando a informo, então tipo, marca, modelo, cor e ano aparecem preenchidos, e a confirmação vincula o mesmo veículo, sem criar outro (UC18 FA01, RN036) | Local: `lookup` da placa de um veículo do seed devolve os cinco campos e nenhum dado de cliente (corpo conferido); `POST` só com a placa → 201; SQL: a contagem de `vehicles` não muda, `client_vehicles` ganha o vínculo, o `id` é o mesmo; `isShared` verdadeiro nas duas contas. Placa nova no `lookup` → corpo `null`. Dois `POST` simultâneos da mesma placa nova: um veículo só e dois vínculos ou um vínculo e um 409. Na tela: "Continuar" mostra "Esta placa já está cadastrada. Confira os dados do veículo." com os dados e "Adicionar à conta"; o cartão do cliente aparece com "Também vinculado a outra conta" |
| Dado uma placa que já está na conta, quando a informo, então recebo a mensagem de `VEHICLE_ALREADY_LINKED` (UC18 FE02, RN036) | Local: `POST` da placa já vinculada → 409 `VEHICLE_ALREADY_LINKED` com a mensagem da L1; nada gravado (contagens por SQL iguais). Na tela: o aviso no topo da janela com o foco, os dados mantidos |
| Dado um veículo, quando mudo o tipo de hatch para picape, então o porte passa a GG, e os agendamentos já registrados não mudam (UC18 FA02, RN002, RN037) | Local: `PATCH {type:"pickup", updatedAt}` num veículo do seed com agendamentos → 200 com `size: "extra_large"`; SQL: `appointments.vehicle_type` e `vehicle_size` dos agendamentos dele iguais a antes (consulta antes e depois), e o `updated_at` do veículo mudou. Na tela: "Editar" → Picape → "Salvar alterações": o cartão mostra "Picape · Porte GG" |
| Dado a edição com a placa de outro veículo, quando confirmo, então recebo a mensagem de `PLATE_IN_USE` (UC18 FE03, RN036) | Local: `PATCH {plate}` com a placa de outro veículo → 409 `PLATE_IN_USE` ("Esta placa já está cadastrada em outro veículo."); nada muda (SQL). Reenviar a própria placa → 200. Na tela: o aviso no topo, os dados mantidos |
| Dado a placa "abc-1234", quando confirmo, então ela é gravada como "ABC1234" (RN035) | Testes de `plateSchema` no corpo do `POST` e do `PATCH` (já existe o do formato; novos para os esquemas). Local: `POST` com `"abc-1234"` e `PATCH` com `"abc-1234"` → a resposta e a coluna `plate` por SQL com `ABC1234`; `lookup?plate=abc-1234` acha o veículo `ABC1234`. Na tela: o campo mostra a máscara, o cartão mostra `ABC-1234` |
| Dado um funcionário sem a permissão `clients`, quando chama as rotas, então recebe 403 (RS008) | Local, nas quatro rotas: funcionário de cargo sem `clients` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `clients` → 200/201; `POST` e `PATCH` sem `Origin` → 403 e `Content-Type` fora de JSON → 415, nada gravado (RS010). Retirar `clients` do cargo muda a resposta na requisição seguinte |

Outros casos, pelo roteiro de rotas, pelo SQL e pelos testes: placa nova sem um dos cinco dados → 400 com `fields` do campo (nada gravado, nem veículo órfão); dados com `type` fora da lista, marca de 41 caracteres, cor com número, ano de 1885 e do ano corrente mais 2 → 400 com as mensagens de RN035; ano ano-corrente+1 aceito; `PATCH` só com `updatedAt` → 400 "Informe ao menos um campo para alterar."; `updatedAt` antigo → 409 `VERSION_CONFLICT` sem gravar; `id`, `size`, `isShared` no corpo descartados; dados enviados junto de uma placa já cadastrada não alteram o veículo; cliente inexistente, excluído ou com id que não é UUID → 404 no `GET` e no `POST`; veículo inexistente ou id inválido no `PATCH` → 404; `pageSize=100` volta 50 e `page=0` → 400; placa inválida no `lookup` e no `POST` → 400 em `plate`; cliente sem veículos → página vazia; ordem da lista igual à ordem dos vínculos.

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin/clients` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: o lugar reservado dos cartões), vazio (cliente criado pelo painel: "Nenhum veículo cadastrado."), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação em cada campo do cadastro (placa, tipo, marca, modelo, cor, ano) e da edição, `VEHICLE_ALREADY_LINKED`, `PLATE_IN_USE`, `VERSION_CONFLICT` na edição (duas janelas: a segunda grava depois da primeira, aviso no topo e dados atuais na janela), falha da consulta da placa, do cadastro e da edição (500) e de acesso (403);
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, com os detalhes do cliente e a janela de veículo aberta sobre eles, nos três passos do cadastro (placa, placa cadastrada, placa nova) e na edição;
- teclado completo: "Cadastrar veículo", "Placa" e Enter ("Continuar"), os botões de opção do tipo (setas), os campos, "Voltar", "Cadastrar veículo"/"Adicionar à conta", "Cancelar", Esc (devolve o foco ao botão e à janela de baixo), "Editar" no cartão e o foco no aviso do topo na falha e voltando ao campo;
- Lighthouse de acessibilidade em `/admin/clients` (navegação) e nos estados em `snapshot` (detalhes com veículos, detalhes vazios, cadastro nos três passos, com a falha, edição com o aviso de veículo compartilhado e com a falha), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` (aplica as cinco migrations, com a nova, e o `seed.sql`), depois o `seed-demo.sql` inteiro pelo ajudante `run-sql.mjs` (pacote `pg` só no scratchpad, conexão local padrão). Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois (`fresh.sh`). A função é conferida também direto por SQL (`select public.link_vehicle(...)` com o papel de serviço: placa nova, placa existente, já vinculada, cliente inexistente → violação da chave estrangeira) e é conferido que `anon` e `authenticated` não a executam.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `clients`), funcionário B (cargo sem `clients`) e um cliente, pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre (3042), com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #43 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `make-cookie.mjs`, `lh-pages.sh`, `lh-snapshots`, `lh-summary.mjs`, `local-env.sh`, `start.sh`, `restart.sh`, `fresh.sh`, `cleanup.mjs`, `run-sql.mjs`) e novos para esta tarefa: `verify-vehicles-api.mjs` (rotas, permissões, placa existente, simultaneidade, porte e agendamentos intactos), `ui-vehicles.mjs` e `ui-keyboard-vehicles.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` do Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nos roteiros com `Select` ou janela aberta sobre outra, escolhem-se só as opções visíveis e a janela de cima é a de `data-open` sem `data-nested-dialog-open`, esperando cerca de 1 s depois de abrir. Estados de falha e carregamento por interceptação de requisição do `puppeteer`, sem alterar `src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Passos do Yvan** (no relatório): aplicar a migration com `npx supabase db push` a partir da branch do PR 1 (não da `main`) antes da pré-visualização e comentar no PR; conferir logado, em `/admin/clients`, a lista dos veículos de um cliente do `seed-demo.sql` (já carregado), o cadastro de placa nova, o vínculo de placa já cadastrada e a edição (os veículos criados nela são dados reais de produção).

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_link_vehicle_function.sql` | criar: `link_vehicle` (`npx supabase migration new link_vehicle_function`) |
| `src/shared/validation/vehicles.ts` e `src/shared/validation/README.md` | criar / alterar: os cinco esquemas e `currentVehicleYear` |
| `src/server/repositories/vehicles.ts` | criar |
| `src/server/services/vehicles.ts` | criar: `listClientVehicles`, `lookUpVehicle`, `addClientVehicle`, `updateVehicle` |
| `src/app/api/admin/clients/[id]/vehicles/route.ts` | criar: `GET` e `POST` (a pasta já tem README, que cita `services/vehicles.ts`) |
| `src/app/api/admin/vehicles/lookup/route.ts` e `README.md` | criar |
| `src/app/api/admin/vehicles/[id]/route.ts` e `README.md` | criar |
| `src/components/shared/add-vehicle-dialog.tsx`, `edit-vehicle-dialog.tsx`, `vehicle-fields.tsx` | alterar: resolvedor, `clearErrors`, mensagem do tipo, sem nota de demonstração |
| `src/components/admin/clients/client-details-dialog.tsx` | alterar: sai o `DemoNotice` |
| `src/app/(admin)/admin/clients/page.tsx` | alterar: sai o comentário "até a #45" (acrescentado na construção) |
| `src/lib/demo/routes.ts` | alterar: saem as quatro entradas |
| `src/lib/demo/admin-clients.ts` | apagar |
| `src/lib/demo/README.md` | alterar, se citar veículos do painel |
| `tests/validation/vehicles.test.ts` | criar: os cinco esquemas |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/clientes/clientes-do-painel.md` | alterar: sai o parágrafo do aviso de demonstração e o do texto do `VEHICLE_ALREADY_LINKED`; entram os textos de L1 e L5 |
| `docs/clientes/rotas.md` | alterar: textos de L1 a L6 |
| `docs/clientes/dados.md` | alterar: `link_vehicle` com a assinatura e o retorno |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: a mensagem do tipo (L3) |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita o veículo do painel |
| `memoria/tarefas/45-veiculos-do-cliente-no-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/`, `src/components/shared/` e `src/components/admin/vehicles/` são conferidos na construção: se citarem listas de arquivos, entram aqui. Não há tipo gerado do banco, `seed.sql` nem `seed-demo.sql` a alterar.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em c719126 (#43).
- **#46** (consulta de agendamentos) e **#51** (dashboard): nenhum arquivo em comum além de `src/lib/demo/routes.ts` (cada uma tira as suas entradas); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR. A migration desta tarefa é a única nova; se outra aparecer antes, a data dela e a desta mantêm a ordem.
- Etapa 04: comentário nas issues que dependem de veículos (**#106** conta e veículos do cliente, **#49** agendamento pelo painel, **#107**) com o que a tarefa deixou: repositório e serviço de veículos, `link_vehicle`, a consulta de placa, os diálogos compartilhados já validados e as entradas de demonstração que sobram.

## Testes previstos

Valores esperados tirados de RN002, RN035, RN036, `mensagens-de-validacao.md` e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/vehicles.test.ts`, `vehicleDataSchema`:

- accepts a vehicle and normalizes it: `suv`, `volkswagen` → `Volkswagen`, `t-cross` mantido, `prata` → `Prata`, ano número
- requires each of the five fields, each in its own path → "Preencha este campo." (e a mensagem do tipo, L3)
- rejects a `type` outside the four values, brand and model of 0 and 41 characters, a color with digits or under 3 letters, and a year before 1886 and after the current year plus one → mensagens de RN035
- accepts the current year plus one

`vehicleInputSchema`:

- normalizes the plate: `abc-1234` → `ABC1234`, `abc1d23` → `ABC1D23`
- accepts a body with only the plate (vínculo de placa existente)
- rejects an invalid plate and an absent one → "Informe uma placa válida." e "Preencha este campo."
- discards the unknown fields: `id`, `size`, `isShared`, `clientId`

`vehicleUpdateSchema`:

- requires `updatedAt` and keeps it as text
- accepts a single field: só `type`, só `plate`, só `year`
- rejects a body with only `updatedAt` → "Informe ao menos um campo para alterar."
- normalizes the plate and discards `id`, `size` and `isShared`

`vehicleLookupQuerySchema`:

- normalizes the plate and rejects an invalid or missing one

`vehicleFormSchema` (formulário):

- turns the text year `"2021"` into a number and `""` into "Preencha este campo."
- rejects a year with letters, with the year message
- requires the type of a new vehicle (`null`) → mensagem da L3
- accepts the plate with the mask (`ABC-1234`)

Sem teste automático para rota, serviço, repositório, função SQL e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Mensagem de `VEHICLE_ALREADY_LINKED` no painel (herdada da #64)

**Problema.** A mensagem do catálogo, "Este veículo já está na sua conta.", foi escrita para o portal. No painel, quem cadastra é o funcionário, e a conta é a do cliente; "sua conta" confunde. O UC18 FE02 pede só "informar o funcionário". A #42 resolveu o mesmo caso do e-mail com um texto próprio do painel na `AppError`.

**Opções:**

- [x] **1. Texto próprio do painel (recomendada).** "Este veículo já está na conta do cliente." na `AppError` do `POST` (a `message` própria opcional já existe). Informa o conflito sem falar com o cliente e não muda o catálogo, que o portal continua usando.
- [ ] **2. A mensagem do catálogo.** Sem texto novo, mas fala "sua conta" a quem cadastra para outra pessoa.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `POST /api/admin/clients/:id/vehicles`: "409 `VEHICLE_ALREADY_LINKED` com a mensagem 'Este veículo já está na conta do cliente.'."
- `docs/clientes/clientes-do-painel.md`, "Veículos do cliente", Cadastrar veículo: a frase que remete ao catálogo passa a "Placa já entre os veículos do cliente (FE02): o aviso é 'Este veículo já está na conta do cliente.', no topo da janela, com os dados mantidos."

### L2. Corpo do `POST`: placa já cadastrada e placa nova incompleta

**Problema.** `rotas.md` diz "Entrada: `plate*`; Placa nova: `type*, brand*, model*, color*, year*`", sem dizer o que o servidor faz quando vêm dados junto de uma placa que já existe (o UC18 FA01 diz que o funcionário só confere e confirma, e RN036 que o veículo existente é vinculado), nem como responde a placa nova com dados faltando.

**Opções:**

- [x] **1. Placa existente: os dados são ignorados; placa nova: os cinco são obrigatórios (recomendada).** O vínculo nunca altera o veículo (a edição é o `PATCH`); placa nova incompleta → 400 `VALIDATION_ERROR` com `fields` dos campos que faltam ("Preencha este campo.") e nada gravado. Evita que uma requisição direta altere um veículo de outras contas sem a conferência da edição.
- [ ] **2. Placa existente com dados diferentes → 400.** Mais rígido, mas cria um erro que a documentação não tem e quebra o cliente da API que reenvia o formulário inteiro.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `POST /api/admin/clients/:id/vehicles`: "Com a placa já cadastrada, só `plate` vale e os demais campos são ignorados: o veículo existente é vinculado sem ser alterado (RN036). Com a placa nova, os cinco dados são obrigatórios; faltando algum, 400 com os campos."

### L3. Mensagem do tipo do veículo ausente ou inválido

**Problema.** `mensagens-de-validacao.md` tem a mensagem de placa, marca, modelo, cor e ano, mas não a do tipo (hatch, sedan, SUV ou picape); o formulário de demonstração não validava o tipo, e o servidor precisa de uma mensagem para `type` ausente ou fora da lista.

**Opções:**

- [x] **1. "Escolha o tipo do veículo." (recomendada).** Imperativa como "Escolha o cargo do sistema." (#43) e a legenda do campo, igual no formulário e na rota.
- [ ] **2. "Preencha este campo."** Reaproveita a mensagem genérica, mas o tipo é uma escolha entre quatro botões, não um texto.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, nova linha: "Tipo do veículo ausente ou fora da lista | Escolha o tipo do veículo."

### L4. O que o `PATCH` de veículo aceita e quem pode editar

**Problema.** `rotas.md` diz "Entrada: `type, plate, brand, model, color, year`", sem dizer se o corpo é parcial; a RN036 diz que os dados de um veículo em mais de uma conta só podem ser alterados pelo funcionário, e o UC18 FA02 diz que valem para todas as contas. Também não diz a resposta de um `id` que não existe.

**Opções:**

- [x] **1. Corpo parcial com `updatedAt` obrigatório; veículo inexistente → 404 (recomendada).** O que veio troca o que havia; ao menos um campo além de `updatedAt` (como #40, #42, #43 e #44); trocar a placa para a própria não conflita; `PLATE_IN_USE` só para a placa de outro veículo; vale para todas as contas, sem trava de veículo compartilhado no painel (o aviso da tela já diz isso).
- [ ] **2. Corpo sempre completo.** A tela já envia os seis campos, mas um cliente da API teria de reenviar tudo para mudar uma cor.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `PATCH /api/admin/vehicles/:id`: "Entrada: `updatedAt*` e, ao menos um, `type`, `plate`, `brand`, `model`, `color` e `year`. Só o que veio é alterado. Resposta: **200** o veículo com `isShared`; 400; 404; 409 `PLATE_IN_USE` e `VERSION_CONFLICT`. Os agendamentos já registrados não mudam (RN037)."

### L5. Quando o aviso de veículo já na conta aparece (UC18 FE02)

**Problema.** O UC18 FE02 coloca o aviso no passo 4 ("a placa informada já está entre os veículos do cliente"), mas a consulta `GET /api/admin/vehicles/lookup` recebe só a placa, sem o cliente, e "nunca devolve dados de clientes". Não dá para o "Continuar" saber que o veículo já está na conta sem mudar o contrato.

**Opções:**

- [x] **1. O aviso vem do envio (409), não da consulta (recomendada).** "Continuar" mostra os dados do veículo cadastrado, como no FA01, e o 409 do "Adicionar à conta" informa que ele já está na conta, sem criar outro vínculo (o efeito de FE02 é o mesmo). Mantém o contrato e a regra de não expor contas.
- [ ] **2. A consulta ganha `clientId` opcional e devolve `isLinked`.** O aviso vem antes do envio, mas muda `rotas.md`, o OpenAPI, o tipo `VehicleLookup` e os diálogos do portal, e passa a dizer algo sobre contas.

**Texto proposto (opção recomendada):**

- `docs/clientes/clientes-do-painel.md`, "Veículos do cliente", Cadastrar veículo: acrescenta "A consulta da placa não sabe de qual cliente é o cadastro; por isso o aviso de placa já na conta vem do envio."
- `docs/clientes/UC18-manter-veiculos-do-cliente.md`: nenhuma mudança.

### L6. Ordem da lista e `isShared`

**Problema.** `rotas.md` pede a lista "na ordem em que foram vinculados à conta" e `isShared` ("também vinculado a outra conta"). O vínculo tem só `created_at`, que no `seed-demo.sql` é o mesmo para todos, e a documentação não diz se o vínculo de uma conta de cliente excluída (RN030 preserva os veículos) conta para `isShared`.

**Opções:**

- [x] **1. `created_at` do vínculo e depois `vehicle_id`; `isShared` conta qualquer outro vínculo, inclusive de conta excluída (recomendada).** Ordem estável e sem migration; a consulta de `isShared` usa só `client_vehicles`, sem juntar `clients`, e o aviso "as alterações valem para todas as contas vinculadas" continua verdadeiro mesmo com conta excluída.
- [ ] **2. `isShared` só com contas não excluídas.** Mais fiel ao que o funcionário vê, mas junta `clients` e filtra `deleted_at` em cada leitura, para um caso raro.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `GET /api/admin/clients/:id/vehicles` (e a de `/api/me`): "na ordem do vínculo (e, no empate, pelo identificador do veículo); `isShared` é verdadeiro quando há outro vínculo com o veículo, inclusive de conta excluída."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js`), 0008 (validação compartilhada), 0009 (concorrência por `updated_at`), 0010 e 0012 (permissões por página), 0013 (porte derivado do tipo pelo banco), 0018 (placa única e veículo compartilhado), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos), 0043 (banco local), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `banco.md`, `componentes.md`, `frontend.md` e `testes.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Diálogos compartilhados.** `AddVehicleDialog` e `EditVehicleDialog` também servem `/profile` e o agendamento do cliente, ainda em demonstração. A validação no navegador passa a valer lá (placa, tipo, ano), o que é coerente com `area-do-cliente.md`; as rotas de lá continuam respondendo a demonstração, e a #106 liga as reais. Conferido nos roteiros: `/profile` com a demonstração e a validação.
- **Veículo órfão.** O cadastro tem duas gravações (veículo e vínculo); a função SQL as faz numa só transação, e a falha do vínculo (cliente excluído no meio) desfaz o veículo. O caso é conferido por SQL no banco local.
- **Corrida de placas.** Duas requisições com a mesma placa nova ao mesmo tempo: `on conflict (plate) do nothing` e a leitura do id depois fazem as duas vincularem o mesmo veículo; o dado da perdedora é descartado, igual à placa existente (L2).
- **Edição de veículo compartilhado.** Muda o veículo de todas as contas, também o que aparece nos próximos agendamentos delas; o aviso da tela e a RN037 (cópia no agendamento) cobrem o caso. Conferido que os agendamentos existentes não mudam.
- **Ano corrente.** `currentVehicleYear()` usa o fuso da empresa no servidor e na tela; no ano-novo, o formulário e a rota concordam. O teste usa o ano passado por parâmetro (`vehicleYearSchema(currentYear)`), sem depender do relógio.
- **Migration em produção.** Todos os ambientes usam o mesmo banco; a função é só acrescentada (nada é removido ou renomeado), então aplicar antes do deploy do PR 1 não quebra o código publicado. Passo do Yvan, a partir da branch do PR 1.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Produção.** Os veículos cadastrados na pré-visualização são dados reais do banco de produção; passo do Yvan, no relatório.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 520 linhas adicionadas (rotas 90, serviço 100, repositório 140, esquemas 100, diálogos e campos 90), mais cerca de 45 de SQL, cerca de 230 de testes e as especificações, contra cerca de 90 removidas (a demonstração de veículos do painel e o aviso).

### P1. Divisão em PRs

- [x] **1. Dois PRs encadeados (recomendada).** Como na #40, #43 e #44: o primeiro, "Refs #45", com a migration, os esquemas, o repositório, o serviço, as rotas, a OpenAPI e os testes (cerca de 400 linhas em `src/`); o segundo, "Closes #45", com os diálogos validados, a demonstração removida e os `docs/` da tela (cerca de 120 adicionadas e 90 removidas). O Yvan aplica a migration entre os dois (ou antes do PR 1 ser incorporado). O plano, as notas e o relatório vão no segundo.
- [ ] **2. Um PR só.** A tela só deixa de ser demonstração com as rotas e a verificação é única, mas o PR passa de 500 linhas em `src/` e mistura migration com tela.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da função SQL, do porte e dos agendamentos intactos.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível dos README das pastas tocadas e de `supabase/README.md`.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Veículos na área do cliente (`/profile`, fase 3, #106) e a consulta de veículos do agendamento pelo painel (#49).
- Remover o vínculo de um veículo e excluir veículo (sem requisito; veículos não são excluídos, `dados.md`).
- Busca ou filtro na lista de veículos do cliente, e edição em lote.
- Dependência nova e registro de decisão.
