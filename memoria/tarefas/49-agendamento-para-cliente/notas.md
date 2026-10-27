# Notas: 49-agendamento-para-cliente

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-27 – descoberta: dependências conferidas

`git fetch` feito: `origin/main` em 2884400 (#48, PR #126), com as dependências da #49 (#41, #44, #45, #46, #62) já incorporadas. O worktree (`claude/vibrant-curie-e67316`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em 2884400, em HEAD solto, árvore limpa.

## 2026-10-27 – descoberta: o que já existe

- `services/appointments.ts` e `repositories/appointments.ts` já têm a listagem e o detalhe (#46); esta tarefa acrescenta a gravação e as consultas do formulário.
- Os tipos `AdminClientOption`, `BookableService`, `AppointmentPreview` e `AdminAppointment` e as funções puras de `pricing.ts` e `scheduling.ts` (#36) já existem; só falta ligar.
- `src/lib/demo/admin-appointments.ts` só responde hoje a prévia e as três buscas; com a #49 ele sai inteiro. `tests/lib/api-client.test.ts` usa `POST /api/admin/appointments/preview` (linhas 82 e 459) como rota de demonstração: precisa de outra rota de demonstração (por exemplo, a de `dashboard/analysis`).
- `docs/plataforma/openapi.yaml` só tem a listagem e o detalhe dos agendamentos do painel.
- `listClientVehicles` (#45) serve ao `lookup/vehicles`; `getClient` dá o 404 do cliente.

## 2026-10-27 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L4 (erros e mensagens do registro, limite de `serviceIds`, o que a prévia faz com `appointmentId` e com data inválida, busca de cliente), nenhuma caixa marcada. Nada foi construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-10-27 – decisão: plano aprovado

O Yvan gravou `status: aprovado` em 27/10/2026 (16:09), com a opção 1 em L1 a L4 (caixas `[x]`). Conferido no arquivo antes da etapa 02; o `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`.

## 2026-10-27 – desvio: lista de arquivos do plano

Dois itens da lista não mudaram: `tests/lib/api-client.test.ts` (o teste usa uma lista de demonstração simulada, não a real) e as quatro etapas compartilhadas `booking-*-step.tsx` (o resolvedor do Zod fica só no assistente do painel; o resolvedor tem precedência sobre o `rules:` das etapas e usa as mesmas mensagens, então o portal continua como está). Nenhum arquivo fora da lista foi tocado. **A confirmar pelo Yvan.**

## 2026-10-27 – decisão: verificação local

Banco local (`db reset`, `seed-demo.sql`), `next start` do build de produção na porta 3057, contas de administrador, de funcionário com e sem `appointments` e de cliente. Roteiro de API (`verify-create-api.mjs`) e de navegador (`ui-create.mjs`) no scratchpad; o resultado está no relatório. O LCP e o teclado do celular do assistente não foram medidos (marcação das etapas igual à da #62).

## 2026-10-27 – descoberta: armadilhas da verificação

`nohup … &` não mantém o `next start` vivo nesta máquina: usar `run_in_background`. O `pg` está no scratchpad da #47 (`…\37-dados-da-empresa-1b1de5\…\scratchpad\node_modules`). O heredoc do Bash com apóstrofo em comentário quebra; gravar o `.mjs` com o Write.
