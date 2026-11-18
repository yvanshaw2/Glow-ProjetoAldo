---
issue: 3
titulo: "Conta e veículos do cliente no portal"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC04, UC05, RF012, RF013, RF014, RF015, RF016, RF017, RF018, RN002, RN035, RN036, RS009, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 18/11/2026
---

# Plano: Conta e veículos do cliente no portal

## Objetivo

Ligar `/profile` ao banco: o cliente autenticado vê e edita os dados da própria conta (UC04, RF012, RF013) e lista, cadastra, vincula e edita os próprios veículos (UC05, RF015 a RF018), por seis rotas em `/api/me`, todas com `requireClient` e só sobre o cliente da sessão (RS009):

- `GET` e `PATCH /api/me/profile`: o `PATCH` é condicionado ao `updatedAt` (409 `VERSION_CONFLICT`, RNF011, decisão 0009);
- `GET /api/me/vehicles` (10 por página, na ordem do vínculo, com `isShared`), `GET /api/me/vehicles/lookup` (os dados do veículo da placa ou `null`, nunca dados de clientes), `POST /api/me/vehicles` (placa nova cadastra; placa já cadastrada vincula sem criar outro, RN036; 409 `VEHICLE_ALREADY_LINKED`) e `PATCH /api/me/vehicles/:id` (404 para veículo que não é da conta; 409 `VEHICLE_SHARED` para veículo também em outra conta; `PLATE_IN_USE`; `VERSION_CONFLICT`).

O porte vem do tipo, calculado pelo banco (RN002, decisão 0013). Os serviços `clients` e `vehicles` da #42 e da #45 são reaproveitados; o que é novo é a regra de quem pode editar um veículo (a conta é dona e ele não é compartilhado), as seis rotas, a validação nos formulários de `/profile` e a saída dos dados de demonstração. Sem migration, sem dependência nova, sem decisão técnica nova.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado o cliente logado, quando abro `/profile`, então vejo os dados da minha conta e os meus veículos, lidos do banco (UC04, RF012, RF017) | passo manual: `/profile` com o cliente do `seed-demo.sql` (Henrique Costa) no banco local, sem o aviso de demonstração; roteiro de API: `GET /api/me/profile` e `GET /api/me/vehicles` devolvem os dados do seed |
| Dado o telefone alterado, quando salvo, então a alteração é gravada, e uma gravação sobre dados já alterados por outra sessão recebe 409 `VERSION_CONFLICT` (UC04, RF013, RNF011) | roteiro de API: `PATCH` com o `updatedAt` lido grava; repetir com o `updatedAt` antigo dá 409; passo manual na tela, com duas abas |
| Dado uma placa já cadastrada por outra conta, quando a informo, então os dados do veículo vêm preenchidos e ele é vinculado à minha conta (UC05 FA01, RN036) | roteiro de API: `lookup` devolve os cinco dados e nenhum dado de cliente; `POST` só com a placa vincula sem criar outro veículo (conferido por SQL); passo manual no diálogo |
| Dado uma placa nova, quando informo o tipo, então o porte é definido pelo tipo e não é escolhido (RN002, RF016) | teste da validação (o porte não é entrada e é descartado); roteiro de API: `POST` com `size` no corpo grava o porte do tipo |
| Dado um veículo vinculado a mais de uma conta, quando o abro, então não há edição (UC05 FA02, RF018) | teste da regra `vehicle-ownership`; roteiro de API: `PATCH` dá 409 `VEHICLE_SHARED` e nada é gravado; passo manual: o cartão do SW4 mostra o aviso, sem "Editar" |
| Dado outro cliente, quando chamo as rotas com o identificador de um veículo que não é meu, então recebo 403 ou 404 e nada é gravado (RS009) | teste da regra; roteiro de API com duas contas: `PATCH` no veículo da outra conta dá 404 (L1), e o veículo continua como estava; um `staff` e um visitante recebem 403 e 401 |
| (UC04, UC05 FE01) Dados inválidos mostram o campo com problema, sem enviar | testes dos esquemas; passo manual nos formulários da conta e dos veículos |
| (RNF004, RNF002, mobile first) Telas de `/profile` em 360 px e em tela larga, claro e escuro, sem falha | passo manual conforme `workflows/procedimentos/testes.md` (Interface), com o Lighthouse de acessibilidade |

## Arquivos

Divisão em PRs em P1 (recomendada: dois, como na #45).

| Arquivo | Ação |
|---|---|
| `src/server/rules/vehicle-ownership.ts` | criar: dado o cliente e as contas vinculadas ao veículo, diz se ele é da conta e se é compartilhado (L1, L2) |
| `src/server/rules/README.md` | alterar: cita o arquivo novo |
| `src/server/services/clients.ts` | alterar: `getProfile` e `updateProfile` (o cliente da sessão, sem o `id` na resposta), sobre `getClient` e `updateClient` |
| `src/server/services/vehicles.ts` | alterar: `listMyVehicles`, `addMyVehicle`, `updateMyVehicle` (aplica a regra antes do `saveVehicle`) e o texto do `VEHICLE_ALREADY_LINKED` do portal |
| `src/app/api/me/profile/route.ts` | criar: `GET`, `PATCH` |
| `src/app/api/me/vehicles/route.ts` | criar: `GET`, `POST` |
| `src/app/api/me/vehicles/lookup/route.ts` | criar: `GET` |
| `src/app/api/me/vehicles/[id]/route.ts` | criar: `PATCH` |
| `docs/plataforma/openapi.yaml` | alterar: as seis operações na tag dos clientes, com `sessionCookie`, e os esquemas `ClientProfile` e `ProfileUpdateInput`, reaproveitando `ClientVehicle`, `VehicleLookup`, `VehicleInput` e `VehicleUpdateInput` |
| `docs/clientes/rotas.md` | alterar: o texto das lacunas L1 a L3 |
| `src/lib/demo/routes.ts` | alterar: sai o bloco `docs/clientes/rotas.md` (seis entradas) |
| `src/lib/demo/clients.ts`, `src/lib/demo/vehicles.ts` | remover: ninguém mais os usa (conferido: `appointments.ts` só cita o nome em comentário) |
| `src/lib/demo/README.md` | alterar: os módulos de exemplo passam a `appointments.ts` e `dashboard.ts` |
| `src/lib/demo/appointments.ts` | alterar (fora da lista original): só o comentário que citava `src/lib/demo/clients.ts`, apagado |
| `src/shared/validation/clients.ts` | sem alteração: o formulário da conta usa o `clientEditSchema` que já existe (ver `notas.md`) |
| `src/components/portal/clients/account-form.tsx` | alterar: resolvedor com o esquema; sai o `DemoNotice` e o comentário da demonstração |
| `src/components/portal/clients/profile-tabs.tsx` | alterar: sai o `DemoNotice` da aba de veículos |
| `src/components/shared/vehicle-fields.tsx` | alterar: sai o comentário "sem esquema de validação ainda", se ainda houver |
| `src/app/(portal)/profile/page.tsx` | alterar: comentário |
| `src/app/api/me/*/README.md` | alterar: só se algo mudar na tabela de cada pasta (hoje já descrevem os métodos) |
| `docs/clientes/area-do-cliente.md` | alterar: sai a frase da demonstração e o aviso da aba "Meus veículos" |
| `tests/rules/vehicle-ownership.test.ts` | criar |
| `tests/validation/clients.test.ts` | alterar: `clientEditSchema` |
| `memoria/tarefas/3-conta-e-veiculos-do-cliente/` | criar: `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Pontos de contato com outras tarefas: `src/lib/demo/routes.ts` é editado por toda tarefa que tira rotas (#4, #5, #2, #1); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR.

## Testes previstos

Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/rules/vehicle-ownership.test.ts`, `checkClientVehicle(clientId, accounts)`:

- veículo sem nenhuma conta vinculada → não é da conta (404)
- veículo vinculado só a outra conta → não é da conta (404, RS009)
- veículo vinculado só à conta do cliente → pode editar
- veículo vinculado à conta do cliente e a outra → compartilhado (409 `VEHICLE_SHARED`, RN036)
- o veículo vinculado a outras duas contas, sem a do cliente → continua 404, nunca `VEHICLE_SHARED` (não revela que o veículo existe)

`tests/validation/clients.test.ts`, `clientEditFormSchema`:

- aceita o celular com máscara e o devolve só com os 11 algarismos
- recusa nome e sobrenome vazios e celular incompleto, com as mensagens de `mensagens-de-validacao.md`
- descarta `email`, `updatedAt` e `id` do corpo

Os esquemas de veículo (`vehicleInputSchema`, `vehicleUpdateSchema`, `vehicleFormSchema`, `vehiclePlateFormSchema`) e `clientUpdateSchema` já têm testes da #45 e da #42 e são reaproveitados sem mudança.

As seis rotas e os serviços dependem do banco: são conferidos pelo roteiro de API no banco local (`fresh.sh`, `seed-demo.sql`, duas contas) e pela interface, sem teste automatizado (`docs/padroes/testes.md`).

## Lacunas na documentação

Quatro lacunas, em `docs/clientes/rotas.md` e `docs/clientes/area-do-cliente.md`. Marque a opção escolhida; o texto proposto é o da recomendada.

### L1. Veículo que não é da conta: 404 ou 403

**Problema.** O critério da issue aceita 403 ou 404 para o veículo de outra conta, e `rotas.md` não diz qual. O 403 revela que o identificador existe.

**Opções:**

- [x] **1. 404 (recomendada).** Igual ao 404 de um veículo que não existe, como o painel faz com o cliente inexistente; nada vaza sobre veículos de outras contas.
- [ ] **2. 403.** Distingue "não é seu" de "não existe", mas confirma ao cliente que o identificador existe.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `PATCH /api/me/vehicles/:id`, Resposta: "**200** veículo atualizado, com o porte redefinido se o tipo mudar; 409 `VEHICLE_SHARED` se o veículo estiver vinculado a outra conta; `PLATE_IN_USE`." passa a "**200** veículo atualizado, com o porte redefinido se o tipo mudar; 404 se o veículo não existe ou não está na conta do cliente (RS009); 409 `VEHICLE_SHARED` se o veículo também estiver vinculado a outra conta; `PLATE_IN_USE`; `VERSION_CONFLICT`."

### L2. Entrada do `POST` e do `PATCH` de veículos do cliente

**Problema.** `rotas.md` não cita o `updatedAt` na entrada do `PATCH` do cliente (só a regra geral do topo exige), não diz que basta um campo e não diz o que acontece com os dados enviados quando a placa já está cadastrada. O painel já definiu os três no UC18.

**Opções:**

- [x] **1. Igual ao painel (recomendada).** `PATCH` com `updatedAt*` e ao menos um dos campos, alterando só o que veio; `POST` com placa já cadastrada ignora os demais campos e vincula o veículo existente sem alterá-lo; com placa nova, os cinco dados são obrigatórios (400 com os campos). Reaproveita os esquemas e o serviço.
- [ ] **2. Corpo completo no `PATCH`.** O cliente reenvia os seis campos; mais simples de ler, mas diverge do painel e obriga a tela a enviar o que não mudou.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `POST /api/me/vehicles`, Entrada: "`plate*`; Placa nova: `type*, brand*, model*, color*, year*`." passa a "`plate*`; Placa nova: `type*, brand*, model*, color*, year*`. Com a placa já cadastrada, só `plate` vale e os demais campos são ignorados: o veículo existente é vinculado sem ser alterado (RN036). Com a placa nova, faltando algum dos cinco dados, 400 com os campos."
- `docs/clientes/rotas.md`, `PATCH /api/me/vehicles/:id`, Entrada: "`type, plate, brand, model, color, year`" passa a "`updatedAt*` e, ao menos um, `type`, `plate`, `brand`, `model`, `color` e `year`. Só o que veio é alterado."
- `docs/clientes/rotas.md`, `POST /api/me/vehicles`, Resposta: acrescenta ", com a mensagem 'Este veículo já está na sua conta.'" ao 409 `VEHICLE_ALREADY_LINKED`.

### L3. Entrada do `PATCH /api/me/profile`

**Problema.** A entrada diz "`firstName, lastName, phone`" sem o `updatedAt`, exigido pela regra do topo, e a issue pede o 409 `VERSION_CONFLICT`. A resposta cita "dados atualizados" sem os campos.

**Opções:**

- [x] **1. Igual ao `PATCH /api/admin/clients/:id` (recomendada).** `updatedAt*` e ao menos um dos três campos; a resposta tem os campos do `GET` (sem o `id`). Reaproveita `clientUpdateSchema`; o e-mail nunca é entrada.
- [ ] **2. Os três campos sempre.** Exige reenviar o que não mudou; diverge do painel.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `PATCH /api/me/profile`: "Entrada: `firstName, lastName, phone`" passa a "Entrada: `updatedAt*` e, ao menos um, `firstName`, `lastName` e `phone`. Só o que veio é alterado. O e-mail não é alterado." e "Resposta: **200** dados atualizados." passa a "Resposta: **200** os mesmos campos do `GET`, com o novo `updatedAt`; 400; 409 `VERSION_CONFLICT`."

### L4. Aviso de demonstração em `/booking`

**Problema.** `/booking` usa `GET /api/me/vehicles` e o diálogo de cadastro de veículo (`booking-vehicle-step.tsx`, `booking-add-vehicle.tsx`). Com as rotas reais, o passo do veículo passa a ler e gravar de verdade, e o aviso da página ("nada do que você fizer nela é gravado", `demo-notice.tsx`) fica falso para esse passo; os serviços, os horários e o envio continuam demonstração até a #4.

**Opções:**

- [x] **1. Manter o aviso e registrar a divergência (recomendada).** A #4 liga o agendamento e tira o aviso da página; até lá o cliente que cadastra um veículo no `/booking` o grava de verdade e o vê em `/profile`. Nada muda no código do `/booking`, e a #3 só registra o fato nas notas e no relatório.
- [ ] **2. Ajustar o texto do aviso no `/booking`.** Dizer que o cadastro de veículo grava. Mexe em `demo-notice.tsx` (usado também por `/appointments` e pelo dashboard) e em `docs/padroes/componentes.md`, e a #4 desfaz.

**Texto proposto (opção recomendada):**

- nenhum arquivo de `docs/`: só a nota na `notas.md` e no relatório.

## Decisões técnicas

Nenhuma nova.

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API) e 0009 (concorrência otimista), com `requireClient` e o `updatedAt` dos `PATCH`; 0008 (validação compartilhada), com os esquemas de `src/shared/validation/`; 0013 (porte calculado pelo banco); 0018 (placa única); 0035 (TDD nas regras); 0055 (telas de demonstração), ao tirar as entradas, os dados e o aviso.

## Divisão em PRs

### P1. Um ou dois pull requests

- [x] **1. Dois PRs encadeados (recomendada).** Como na #45: o primeiro, "Refs #3", com a regra, os serviços, as quatro rotas, a OpenAPI, o `rotas.md` e os testes; o segundo, "Closes #3", com a tela (esquema da conta, avisos), a saída de `src/lib/demo/` e o `area-do-cliente.md`, mais o plano, as notas e o relatório. A OpenAPI das seis operações passa de 250 linhas, o que levaria um PR único acima das cerca de 400 linhas fora dos testes.
- [ ] **2. Um PR.** Menos trocas, mas fica acima do limite e mistura API e tela na revisão.

## Riscos e dúvidas

- **Corrida na edição de veículo compartilhado.** A regra lê as contas do veículo e depois grava; se o funcionário vincular outra conta entre as duas leituras, a edição passa. A janela é de milissegundos e o efeito (o cliente edita um veículo que acabou de ser compartilhado) é de baixo impacto; fechá-la exigiria uma função SQL, ou seja, migration, fora da issue. Fica registrado no relatório.
- **Verificação.** As rotas dependem de duas contas reais (`make-users.mjs`) e do `seed-demo.sql` no banco local; o `db reset` apaga as contas, então usa-se o `fresh.sh`. O LCP local de `/profile` (leitura da API depois da hidratação) deve passar de 2,5 s no celular simulado e vai ao relatório.
- **Sem migration.** `link_vehicle` e as restrições já existem; nada a aplicar.
- **Acessibilidade (WCAG).** Os componentes já existem e só mudam o ligar dos dados; o ajuste do site inteiro é do Yvan no fim.

## Fora do escopo

- Clientes e veículos pelo painel (#42, #45); troca de senha (já existe); agendamentos do cliente (#4 e #5); a análise por IA (#1).
- Exclusão da conta pelo cliente (só o funcionário, RF074) e alteração do e-mail.
