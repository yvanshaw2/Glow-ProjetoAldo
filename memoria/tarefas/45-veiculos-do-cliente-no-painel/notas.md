# Notas: 45-veiculos-do-cliente-no-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-26 – descoberta: dependências conferidas

A #45 depende da #42 (clientes do painel, PR #114) e da #64 (veículos nos detalhes, com demonstração), as duas incorporadas. `git fetch` feito: `origin/main` em c719126 (#43, PR #119), e o worktree (`claude/sleepy-pare-2630d1`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em c719126, árvore limpa. Plano e notas sem commit, como nas etapas 01 anteriores; a etapa 02 cria `feat/45-vehicles` a partir da `origin/main`.

## 2026-10-26 – descoberta: o que já existe

- Não há `services/vehicles.ts`, `repositories/vehicles.ts` nem `shared/validation/vehicles.ts`. O README da pasta `app/api/admin/clients/[id]/vehicles/` já existe e cita `services/vehicles.ts`. `findAdminClient` (#42) serve ao 404 do cliente.
- `formats.ts` já tem `plateSchema`, `vehicleBrandModelSchema`, `vehicleColorSchema` e `vehicleYearSchema(currentYear)`; falta o esquema do tipo e a mensagem dele em `mensagens-de-validacao.md` (L3). `PLATE_IN_USE`, `VEHICLE_ALREADY_LINKED` e `VEHICLE_SHARED` estão no catálogo de erros; só o segundo ganha texto próprio no painel (L1).
- O banco já garante placa única (`uq_vehicles_plate`), formato (`ck_vehicles_plate`), ano (`ck_vehicles_year`), porte gerado do tipo e o vínculo único (`client_vehicles` com chave primária composta). `dados.md` já prevê a função `link_vehicle`, que não existe: é a única migration (a data sai de `migration new`).
- `vehicles` não tem exclusão lógica; `client_vehicles.created_at` é a ordem de vínculo e é igual para todos os vínculos do `seed-demo.sql` (L6).
- Os diálogos `AddVehicleDialog` e `EditVehicleDialog` são compartilhados com `/profile` e o agendamento do cliente (`/api/me/vehicles*`, demonstração até a #106) e não têm resolvedor: `vehicle-fields.tsx` diz "sem esquema de validação ainda". O ano é texto no formulário e número no corpo.
- `src/lib/demo/admin-clients.ts` só é importado por `routes.ts`; `demo/clients.ts` e `demo/vehicles.ts` continuam usados pelo portal e por `admin-appointments.ts`. O `DemoNotice` da seção está em `client-details-dialog.tsx`.
- `seed-demo.sql` já tem os 13 clientes, os 14 veículos e os vínculos (SW4 em duas contas) com os ids da demonstração: não muda.
- A consulta de placa não recebe o cliente, então o aviso de placa já na conta só pode vir do 409 do envio (L5).

## 2026-10-26 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L6 e os pontos P1 a P3 (opção recomendada primeiro, nenhuma marcada, para o Yvan marcar): texto do `VEHICLE_ALREADY_LINKED` no painel, placa existente ignora dados e placa nova exige os cinco, mensagem do tipo, `PATCH` parcial, aviso de placa já na conta vindo do envio, ordem do vínculo e `isShared`; dois PRs encadeados (API com a migration; tela com "Closes #45"). Uma migration (`link_vehicle`), nenhuma dependência nem decisão técnica nova.

## 2026-10-26 – decisão: plano aprovado

O Yvan gravou `status: aprovado` (09:07 de 26/10/2026) com a opção 1 em L1 a L6 e P1 a P3. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificações `feat/45-vehicles` (PR 1, API com a migration: PR #120) e `feat/45-vehicles-screen` (PR 2, a tela, sobre a primeira), da `origin/main` (c719126), sem vínculo. Testes escritos antes e vistos falhar (commit `2765f31`: o arquivo nem carregava, sem o módulo de esquemas).

## 2026-10-26 – descoberta: detalhes da construção

- O esquema do `POST` guarda os cinco dados como vieram (`z.unknown()`), e o serviço os confere com `vehicleDataSchema` só quando a placa é nova; assim a placa já cadastrada ignora dados inválidos (L2).
- `isShared` é "há mais de um vínculo com o veículo" (L6), lido em lote por `accountsOfVehicles`; na lista, no `POST` e no `PATCH` a conta é a mesma.
- `link_vehicle` devolve `null` quando o vínculo já existe (sem exceção a interpretar) e o repositório converte a violação de chave estrangeira do cliente em 404. Conferida por SQL: `anon` e `authenticated` recebem 42501, e cliente inexistente não deixa veículo órfão.
- Os formulários de veículo usam o resolvedor com `raw: true`: os campos continuam como digitados (placa com máscara, ano em texto) e o corpo leva `Number(year)`; a rota normaliza de novo.
- Cadastros simultâneos da mesma placa nova: um veículo e dois vínculos, os dois 201.
- Os veículos do seed de uma mesma conta têm o mesmo `created_at` do vínculo; a ordem sai do desempate por `vehicle_id` (L6).

## 2026-10-26 – desvio: arquivo fora da lista, `clients/page.tsx`

O comentário de `src/app/(admin)/admin/clients/page.tsx` dizia que os veículos ficavam em demonstração "até a #45"; passou a "UC16, UC17 e UC18: os clientes no painel e os veículos deles". Acrescentado à lista do plano; **a confirmar pelo Yvan antes do PR da tela** (P3).

## 2026-10-26 – descoberta: verificação

Roteiros em 360 × 800 claro e 1440 × 900 escuro sem falha, Lighthouse de acessibilidade 1,0 em 4 navegações e 56 capturas de estado. LCP do celular de 3,6 a 3,7 s (mesmo padrão das telas anteriores). Nos roteiros, o cadastro de uma placa que a execução anterior já gravou cai na placa cadastrada: o banco é refeito (`fresh.sh`) antes de cada execução.
