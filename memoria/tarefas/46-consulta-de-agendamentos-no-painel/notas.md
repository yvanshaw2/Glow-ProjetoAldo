# Notas: 46-consulta-de-agendamentos-no-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-26 – descoberta: dependências conferidas

A #46 depende da #61 (página com demonstração) e da #56 (etiqueta de status), incorporadas. `git fetch` feito: `origin/main` em a96efa2 (#45, PR #121), e o worktree (`claude/nice-goldberg-bf3500`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em a96efa2, árvore limpa. Plano e notas sem commit, como nas etapas 01 anteriores; a etapa 02 cria `feat/46-appointments-query` a partir da `origin/main`.

## 2026-10-26 – descoberta: o que já existe

- Não há `services/appointments.ts`, `repositories/appointments.ts` nem `shared/validation/appointments.ts`. Os README de `app/api/admin/appointments/` e `[id]/` já existem e citam `services/appointments.ts`; as rotas `route.ts` não existem.
- Tipos `AdminAppointmentSummary` e `AdminAppointment` e as constantes de visão, status e ordem já existem e não mudam. `listPaymentFees`, `calculateTotal`, `toCompanyInstant` e `formatCalendarDate` servem ao detalhe e ao fuso.
- O banco já tem `appointments`, `appointment_services`, `idx_appointments_scheduled_at` e o tipo `appointment_status` na ordem de RN017: nenhuma migration.
- A demonstração dos agendamentos do painel tem 50 linhas fixas em `src/lib/demo/admin-appointments.ts`, que também responde a prévia e as três buscas (essas ficam para a #49 e a #50). `demo/appointments.ts` (portal) só cita o arquivo em comentários. Os ids dos serviços e dos veículos da demonstração são os do `seed-demo.sql` (md5 de `glow-demo:...`).
- `DemoNotice` do painel de agendamentos está só em `page.tsx`; as janelas que gravam não têm aviso.
- O `seed-demo.sql` cria os agendamentos de 90 dias atrás a 14 dias à frente, com a cópia dos dados (RN037) e status pela data da carga; os serviços de um agendamento têm o mesmo `created_at` (L4).
- A janela "Concluir" lê `GET /api/admin/appointments/:id`; com a rota real ela passa a mostrar os totais por forma de pagamento de L6.

## 2026-10-26 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L6 e os pontos P1 a P3 (opção recomendada primeiro, nenhuma marcada, para o Yvan marcar): erros de `view`, `status` e `sort` (400), busca por palavras com placa com ou sem hífen, desempate da ordem e visão "Hoje", ordem dos serviços, lugar do aviso de demonstração e o percentual de cada forma em `paymentOptions`; um PR só (sem migration). Nenhuma migration, dependência nem decisão técnica nova.

## 2026-10-26 – decisão: plano aprovado

O Yvan marcou o cabeçalho com os campos trocados na primeira vez (`status: yvan`); corrigiu em seguida (`status: aprovado`, `aprovado_por: yvan`, `aprovado_em: 12:44`) e pediu que eu marcasse a opção 1 de L1 a L6 e P1 a P3, o que fiz. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificação `feat/46-appointments-query`, da `origin/main` (a96efa2), sem vínculo. Testes escritos antes e vistos falhar (commit `349ef5a`).

## 2026-10-26 – desvio: arquivos fora da lista

Acrescentados à lista do plano; **a confirmar pelo Yvan antes do PR** (P3):

- `src/server/rules/appointment-services.ts` (a função pura de L4; o plano a previa "no arquivo que o README de `rules/` admitir") e `src/server/rules/README.md` (cita o arquivo novo);
- `src/server/repositories/client-search.ts`: `likePattern` passou a ser exportada, para a busca de agendamentos não duplicar o escape de `%`, `_` e aspas;
- `docs/agendamento/calculos.md`: uma linha na seção 1 sobre o total por forma de pagamento (L6);
- `src/shared/validation/README.md` cita `appointments.ts` (já previsto na lista).

## 2026-10-26 – descoberta: detalhes da construção

- Sem migration: o repositório só lê; `status` ordena pela ordem do tipo enumerado (a de RN017) com `order("status")`.
- A visão "Hoje" usa `scheduled_at < startOfNextCompanyDay(now)`; o serviço recebe o `now` (a rota passa `new Date()`).
- O `count: "exact"` com `appointment_services (...)` embutido não duplica o total (conferido contra o SQL).
- O `DemoNotice` ficou no alto do assistente (novo e editar), de "Reagendar" e de "Concluir", e acima do rodapé do detalhe. "Concluir" já lia `GET /api/admin/appointments/:id`, agora real.
- As abas do painel ativam com Enter ou Espaço depois das setas (ativação manual do Base UI), como nas outras telas.
- `admin-appointments.ts` da demonstração perdeu cerca de 360 linhas (os 50 agendamentos fixos, as respostas de listagem e de detalhe); ficaram a prévia e as três buscas.
