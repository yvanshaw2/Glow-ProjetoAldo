---
issue: 5
titulo: "Acompanhar, editar, cancelar e reagendar agendamentos do cliente"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC07, UC25, UC26, RF028, RF029, RF030, RF031, RF032, RN005, RN006, RN008, RN009, RN010, RN011, RN012, RN013, RN014, RN015, RN017, RN019, RN020, RN032, RN033, RN034, RN037, RNF011, RS009]
status: concluido
aprovado_por: yvan
aprovado_em: 18/1/2026
---

# Plano: Acompanhar, editar, cancelar e reagendar agendamentos do cliente

## Objetivo

Ligar `/appointments` ao banco: o cliente autenticado vê os agendamentos atuais e o histórico, abre o detalhe, edita e cancela o que está "Agendado" e reagenda o que está "Concluído" (UC07, UC25, UC26, RF028 a RF032). São cinco rotas em `/api/me/appointments`, todas com `requireClient` e só sobre os agendamentos do cliente da sessão (RS009):

- `GET /api/me/appointments`: os escopos `current` (da data mais próxima à mais distante) e `history` (da mais recente à mais antiga), 10 por página;
- `GET /api/me/appointments/:id`: o detalhe, com os dados copiados no agendamento (RN037);
- `PATCH /api/me/appointments/:id`: edita só um "Agendado", com a nova data não anterior à marcada (RN032, RN033) e `updatedAt` para o 409 `VERSION_CONFLICT` (RNF011);
- `POST /api/me/appointments/:id/cancel`: "Agendado" passa a "Cancelado" (RN019);
- `POST /api/me/appointments/:id/reschedule`: nasce um "Agendado" pelo catálogo atual e o "Concluído" passa a "Reagendado" (RN020).

As regras puras (`status-transitions`, `editing`) já aceitam o ator `client`, e o serviço do painel (#50) já edita, cancela e reagenda; o que é novo é a posse do agendamento (o de outro cliente responde 404, RS009), o ator `client` no serviço, a listagem do cliente, as cinco rotas, o esquema da consulta, a saída das cinco entradas de `src/lib/demo/routes.ts` e do aviso de `/appointments`, e a especificação OpenAPI. As janelas de detalhe, edição e reagendamento já estão na forma final e chamam os endereços reais; só o aviso e as frases de demonstração saem. Sem migration (`update_appointment` e `reschedule_appointment` aceitam `p_staff_id` vazio e a posse é conferida no serviço), sem dependência nova.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado o cliente logado, quando abro `/appointments`, então vejo os atuais, da data mais próxima à mais distante, e o histórico, do mais recente ao mais antigo, com os dados copiados no agendamento (UC07, RF028, RF029, RN037) | teste do esquema `myAppointmentListQuerySchema` (escopos e padrões); roteiro de API: `GET ?scope=current` e `?scope=history` com agendamentos de três datas e dois clientes, conferindo a ordem, a paginação e que só vêm os da sessão (SQL); passo manual nas duas abas; mudar o nome e o preço do serviço no banco e ver o agendamento com o valor da época |
| Dado um agendamento "Agendado", quando cancelo e confirmo, então ele passa a "Cancelado"; em qualquer outro status a rota responde 409 `INVALID_STATUS` (UC07, RF030, RN019) | a tabela de transições já tem teste (`status-transitions`); teste da mensagem do 409 do cliente (L3); roteiro de API: `cancel` em "Agendado" dá 200 `cancelled` com `cancelled_at` (SQL), `cancel` de novo e em "Em espera" dão 409; passo manual: confirmação em "Cancelar agendamento" e o item no histórico |
| Dado um agendamento "Agendado", quando troco um serviço e a data, então os valores e a previsão são recalculados e a nova data não é anterior à marcada (UC26, RF031, RN032, RN033) | testes de `findEditErrors` com o ator `client` (data anterior à marcada, no passado, igual, posterior; composição); roteiro de API: `PATCH` trocando o serviço e a data dá 200 com subtotal, total e previsão novos e as cópias refeitas (SQL); data anterior à marcada dá 400 em `fields.scheduledAt`; só a forma de pagamento mantém os serviços e as cópias (RN037); passo manual na janela "Editar" |
| Dado um serviço concluído, quando o reagendo com o Pix e uma nova data, então nasce um agendamento "Agendado" com os valores do catálogo atual e o original passa a "Reagendado" (UC25, RF032, RN020) | roteiro de API: `POST reschedule` dá 201 `scheduled` com `rescheduled_from_id` e `created_by_staff_id` nulo, e o original `rescheduled` (SQL); mudar o preço antes e ver o valor novo; reagendar o original de novo dá 409; serviço inativo fica de fora (UC25 FE02); passo manual na janela "Reagendar" |
| Dado um agendamento de outro cliente, quando chamo as rotas com o identificador dele, então recebo 403 ou 404 e nada é alterado (RS009) | roteiro de API com duas contas: `GET`, `PATCH`, `cancel` e `reschedule` com o id do outro cliente dão 404 (L1) e nada muda (SQL); `PATCH` com veículo de outra conta dá 404; `staff` e visitante, 403 e 401; id que não é UUID, 404 |
| Dado um agendamento alterado por outra sessão, quando salvo a edição, então recebo 409 `VERSION_CONFLICT` e a tela lê os dados de novo (RNF011) | roteiro de API: dois `PATCH` com o mesmo `updatedAt`, o segundo dá 409 e nada é gravado; a tela já trata o 409 e recarrega (`booking-wizard`); passo manual com duas abas |
| (UC07 FE01) Sem agendamento no escopo, a aba mostra a mensagem de vazio | passo manual com uma conta sem agendamentos (a tela já tem o estado) |
| (RNF002, mobile first) `/appointments`, o detalhe e as duas janelas em 360 px e em tela larga, claro e escuro, sem falha | passo manual conforme `workflows/procedimentos/testes.md` (Interface), com o Lighthouse de acessibilidade |

## Arquivos

PR único (ver "Riscos e dúvidas").

| Arquivo | Ação |
|---|---|
| `src/app/api/me/appointments/route.ts` | alterar: `GET` da listagem, ao lado do `POST` |
| `src/app/api/me/appointments/[id]/route.ts` | criar: `GET` e `PATCH` |
| `src/app/api/me/appointments/[id]/cancel/route.ts` | criar: `POST` |
| `src/app/api/me/appointments/[id]/reschedule/route.ts` | criar: `POST` |
| `src/app/api/me/appointments/README.md`, `.../[id]/README.md`, `.../[id]/cancel/README.md`, `.../[id]/reschedule/README.md` | alterar: tabelas de métodos e "Vai aqui" (sai "na #108; segue em demonstração") |
| `src/server/services/appointments.ts` | alterar: `listMyAppointments`, `getMyAppointment` (posse, senão `NOT_FOUND`), `cancelMyAppointment`, `editMyAppointment` e `rescheduleMyAppointment`; `changeStatus`, `editAppointment` e `rescheduleAppointment` passam a receber o ator e, no do cliente, o `staffId` vazio; o recorte do detalhe do cliente de `createMyAppointment` vira função própria e é reaproveitado |
| `src/server/repositories/appointments.ts` | alterar: `listClientAppointments` (por `client_id` e status, na ordem do escopo, com o identificador como desempate) e o mapeamento para o resumo do cliente, que traz a cor do veículo |
| `src/server/rules/appointment-editing.ts` | alterar: `findEditErrors` recebe o `actor`; mensagens de `INVALID_STATUS` do cliente |
| `src/shared/constants/appointment-views.ts` | alterar: os status de cada escopo (`current` e `history`) |
| `src/shared/validation/appointments.ts` | alterar: `myAppointmentListQuerySchema`; a edição e o reagendamento do cliente reaproveitam `appointmentEditSchema` e `appointmentRescheduleSchema` |
| `src/app/(portal)/appointments/page.tsx` | alterar: sai o `DemoNotice` e o comentário |
| `src/components/portal/appointments/*.tsx` | alterar só se a verificação achar falha; hoje já chamam os endereços reais, e o `NOT_IMPLEMENTED` das janelas segue tratado como qualquer erro |
| `src/lib/demo/routes.ts` | alterar: saem as cinco entradas de `/api/me/appointments`; fica a análise do dashboard (#66) |
| `src/lib/demo/appointments.ts`, `src/lib/demo/list.ts` | remover: só as entradas que saem os usavam (`list.ts` só é usado por `appointments.ts`; o lint confere) |
| `docs/plataforma/openapi.yaml` | alterar: as cinco operações em `client-area`, com `sessionCookie`, reaproveitando `ClientAppointment` e os esquemas de edição e reagendamento do painel |
| `docs/agendamento/rotas.md` | alterar: o texto das lacunas L1 a L3 |
| `docs/agendamento/meus-agendamentos.md`, `docs/agendamento/agendar-servico.md` | alterar: saem as frases de demonstração de `/appointments` (aviso, `NOT_IMPLEMENTED`, prévia que recusa o veículo da demonstração) |
| `tests/validation/appointments.test.ts`, `tests/rules/appointment-editing.test.ts` | alterar: os testes previstos |
| `memoria/tarefas/5-acompanhar-e-alterar-agendamentos/` | criar: `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Pontos de contato com outras tarefas: `src/lib/demo/routes.ts` é editado por toda tarefa que tira rotas (#66 tira a análise do dashboard); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR. `src/server/services/appointments.ts` também é tocado por qualquer tarefa do painel de agendamentos.

## Testes previstos

Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/appointments.test.ts`:

- `myAppointmentListQuerySchema` aceita `current` e `history`, com `page` 1 e `pageSize` 10 por padrão
- recusa `scope` ausente e desconhecido, com a mensagem de `mensagens-de-validacao.md`
- descarta parâmetro desconhecido (RS013) e recusa `pageSize` acima de 50

`tests/rules/appointment-editing.test.ts`:

- `findEditErrors` com o ator `client` recusa a data anterior à marcada e a que já passou, e aceita a posterior (RN033)
- com o ator `client`, a data e o horário iguais aos marcados não são conferidos de novo, mesmo passados (RN033)
- com o ator `staff`, o adiantamento continua aceito (sem regressão do painel)
- as mensagens de `INVALID_STATUS` do cliente citam o status e o que fazer, por ação (cancelar, editar, reagendar; L3)

As regras de transição e de edição já têm teste com o ator `client` (`status-transitions`, `editing`, #36). As cinco rotas, o serviço e o repositório dependem do banco: são conferidos pelo roteiro de API no banco local (`db reset`, `seed-demo.sql`, duas contas) e pela interface, sem teste automatizado (`docs/padroes/testes.md`).

## Lacunas na documentação

Três lacunas, em `docs/agendamento/rotas.md`. Marque a opção escolhida; o texto proposto é o da recomendada.

### L1. Agendamento de outro cliente: 403 ou 404

**Problema.** O critério da issue aceita 403 ou 404 para o agendamento de outro cliente, e `rotas.md` não diz qual nas cinco rotas. No painel, o agendamento inexistente é 404; no portal, o 403 confirmaria ao cliente que o identificador existe e é de outra conta.

**Opções:**

- [ x] **1. 404 (recomendada).** Igual ao agendamento inexistente e ao veículo de outra conta (#4, L1; #3); nada vaza sobre os agendamentos de outros. Vale para o detalhe, a edição, o cancelamento e o reagendamento; o identificador que não é UUID também dá 404, como no painel.
- [ ] **2. 403.** Distingue "não é seu" de "não existe", mas confirma que o identificador existe.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/me/appointments/:id`, Resposta: acrescenta "; 404 se o agendamento não existe ou não é do cliente (RS009)".
- `docs/agendamento/rotas.md`, `PATCH`, `cancel` e `reschedule` do cliente, Resposta: acrescenta, em cada uma, "; 404 se o agendamento não existe ou não é do cliente (RS009), sem alterar nada".
- `docs/agendamento/rotas.md`, `PATCH /api/me/appointments/:id`, Resposta: acrescenta "404 se o veículo informado não existe ou não está na conta do cliente (RS009)".

### L2. Entrada e resposta das cinco rotas do cliente

**Problema.** `rotas.md` não diz, nas rotas do cliente, o formato da resposta de cada gravação, a versão (`updatedAt`) do `PATCH` que a tela já envia, em que campo vem cada 400, o 400 do escopo e o 404 do reagendamento. O painel já definiu tudo isso nas rotas irmãs.

**Opções:**

- [ xx] **1. Igual ao painel (recomendada).** `scope` obrigatório e `pageSize` de 10 por padrão; o `PATCH` com `updatedAt*` e ao menos um campo, só o que vem é conferido e o valor igual ao gravado não conta como mudança; as três gravações respondem no formato do detalhe do cliente; os 400 trazem o campo em `fields`; o reagendamento usa os serviços do original que ainda podem ser agendados. Reaproveita os esquemas, as conferências e as funções do banco.
- [ ] **2. Resposta mínima.** As gravações devolvem só o `id` e a tela lê o agendamento depois; diverge do painel, acrescenta uma leitura e a tela hoje usa o corpo devolvido.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/me/appointments`, Entrada: "`scope*`: `current` (...) ou `history` (...)." acrescenta "`page`, `pageSize` (10 por página)"; Resposta acrescenta "; 400 com `scope` em `fields` quando falta ou não é um dos dois. Dois agendamentos no mesmo instante saem pelo identificador, e a ordem se mantém de uma página à outra. Só os agendamentos do cliente da sessão vêm (RS009)".
- `docs/agendamento/rotas.md`, `PATCH /api/me/appointments/:id`, Entrada: "`vehicleId, serviceIds, paymentMethod, scheduledAt`" passa a "`updatedAt*` (a versão lida, devolvida como veio); `vehicleId, serviceIds` (de 1 a 20 ids, sem repetição), `paymentMethod, scheduledAt` (instante com fuso), ao menos um deles; só o que vem é conferido, e o valor igual ao gravado não conta como mudança. Status, valores, cliente e datas de status não são aceitos (RS013)."; Resposta passa a "**200** agendamento atualizado, no formato de `GET /api/me/appointments/:id` e com o mesmo status, com os valores e a previsão recalculados: a troca de veículo ou de serviços recalcula todos os itens pelo catálogo atual e refaz a cópia do veículo, a troca da forma aplica o percentual vigente, e o que não mudou fica como gravado (RN037); 400 com o campo em `fields`: data ou horário fora do funcionamento, no passado ou anterior ao marcado (`scheduledAt`), serviços sem principal ou complementar, adicional sem o seu principal ou serviço que não pode ser agendado (`serviceIds`); corpo sem nenhum campo além de `updatedAt`, 400; 404 (L1); 409 `INVALID_STATUS` se não estiver agendado (L3); 409 `VERSION_CONFLICT` quando o agendamento mudou depois da leitura."
- `docs/agendamento/rotas.md`, `POST /api/me/appointments/:id/cancel`, Resposta: "**200** agendamento cancelado" passa a "**200** agendamento cancelado, no formato de `GET /api/me/appointments/:id`".
- `docs/agendamento/rotas.md`, `POST /api/me/appointments/:id/reschedule`, Entrada: acrescenta "Os serviços são os do agendamento original que ainda podem ser agendados (RN008, RN031); os demais ficam de fora."; Resposta: "**201** novo agendamento, com valores e duração calculados pelo catálogo atual" passa a "**201** novo agendamento, no formato de `GET /api/me/appointments/:id`, com valores e duração calculados pelo catálogo atual; o original passa a `rescheduled`; 400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado (`scheduledAt`), serviços restantes sem principal ou complementar ou adicional sem o seu principal (`serviceIds`); 404 (L1) ou veículo que saiu da conta do cliente".

### L3. Mensagens do 409 `INVALID_STATUS` para o cliente

**Problema.** UC07 FE02 manda informar que o agendamento "não pode ser cancelado pelo portal" e UC26 FE01 que "alterações devem ser solicitadas à empresa", mas não há texto para o 409 do cliente nem para o reagendamento. O texto do painel ("Esta ação não está disponível para esse status.") fala com o funcionário. A ordem das conferências também não está dita.

**Opções:**

- [ x] **1. Uma mensagem por ação, com o status (recomendada).** Cancelar: "Este agendamento está <status> e não pode ser cancelado pelo portal. Para mudar algo, fale com a empresa."; editar: "Este agendamento está <status> e não pode mais ser alterado por aqui. Para mudar algo, fale com a empresa." (a frase que a tela já mostra); reagendar: "Este agendamento está <status>. Só um serviço concluído pode ser reagendado." A posse vem primeiro (404), depois o status (409), depois a data e a composição (400) e, por último, a versão (409 `VERSION_CONFLICT`).
- [ ] **2. A mensagem do painel.** Reaproveita o texto e o código, mas fala em "ação não disponível" ao cliente e não cumpre UC07 FE02 e UC26 FE01.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `PATCH`, `cancel` e `reschedule` do cliente, Resposta: "409 `INVALID_STATUS`" passa a "409 `INVALID_STATUS`, com o status atual na mensagem (UC07 FE02, UC26 FE01)"; acrescenta, no `PATCH`, "O status é conferido antes da data e da composição."
- `docs/agendamento/UC07-acompanhar-agendamentos.md`, FE02: sem mudança de sentido; o texto da mensagem fica em `rotas.md`.

## Decisões técnicas

nenhuma nova.

- Seguidas: 0002 (API em rotas do Next.js), 0003 (backend em camadas: rota, serviço, repositório), 0005 e 0046 (autorização na API, sessão conferida no Supabase Auth), 0008 e 0027 (esquema compartilhado entre a tela e a rota, React Hook Form), 0021 (valores calculados no servidor pelo catálogo atual), 0025 (erros RFC 9457), 0035 (TDD nas regras), 0042 (banco sem privilégios públicos: as funções só rodam pelo `service_role`), 0055 (telas de demonstração: sai o que a rota substitui).

## Riscos e dúvidas

- **A última rota de demonstração não sai.** `POST /api/admin/dashboard/analysis` (#66) continua na lista; por isso `src/lib/demo/`, o `NOT_IMPLEMENTED` e o `DemoNotice` ficam (`docs/padroes/componentes.md`, decisão 0055). Saem só `appointments.ts` e `list.ts` da pasta. Quem tirar a análise remove o resto.
- **Tamanho do PR.** A estimativa fica perto do limite de 400 linhas fora dos testes: cinco rotas curtas, cinco funções de serviço sobre o que já existe, uma consulta no repositório, um esquema e a especificação OpenAPI (o maior bloco). Se passar do limite, o PR se divide em API (rotas, serviço, repositório, esquema, regras, documentação) e tela/OpenAPI/demonstração (página, lista de demonstração, especificação), nessa ordem.
- **Refatoração do serviço do painel.** `changeStatus`, `editAppointment` e `rescheduleAppointment` passam a receber o ator; os testes do painel (regras puras) cobrem o ator `staff`, mas as rotas do painel só se conferem no banco: o roteiro de API repete um `cancel`, um `PATCH` e um `reschedule` do painel para ver que nada regrediu.
- **Verificação no banco.** O roteiro exige duas contas de cliente com veículo e agendamentos nos status "Agendado" e "Concluído" no banco local (o `seed-demo.sql` não tem conta de acesso para os clientes dele); o `.env.local` não é lido pelo agente, então o que não puder ser executado é registrado no relatório como não verificado. As migrations `create_appointment` e `update_appointment_functions` precisam estar aplicadas; quem as aplica é o Yvan.
- **Posse do `reschedule_appointment`.** A função confere o status, não o dono; a posse é conferida no serviço antes da chamada, como no painel conferem o status e o cliente excluído. Uma corrida entre a leitura e a gravação só pode mudar o status, e a função devolve nulo.

## Fora do escopo

- Agendar serviço (#4, feita) e o painel de agendamentos (#46, #49 e #50, feitas).
- A análise do dashboard e a remoção final de `src/lib/demo/` (#66).
- Migration, novas regras de cálculo, novos componentes de tela e o motivo do cancelamento.
