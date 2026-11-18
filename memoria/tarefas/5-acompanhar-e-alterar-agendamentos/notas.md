# Notas: 5-acompanhar-e-alterar-agendamentos

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-11-18 – descoberta: o que já existe

- As regras `status-transitions` e `editing` já aceitam o ator `client`; `findEditErrors` (`appointment-editing.ts`) é que fixa `actor: "staff"` e precisa receber o ator.
- `changeStatus`, `editAppointment` e `rescheduleAppointment` (#50) fixam o ator `staff`; `reschedule_appointment` e `update_appointment` não conferem o dono, então a posse (RS009) é do serviço. `create_appointment` já aceita `p_staff_id` vazio, e `NewAppointment.staffId` já é `string | null` (#4).
- As janelas de detalhe, edição e reagendamento já estão na forma final: `PATCH` com `updatedAt`, `POST .../reschedule`, tratamento do 409 `VERSION_CONFLICT` com recarga. Só o aviso da página e as frases de demonstração dos docs saem.
- `POST /api/admin/dashboard/analysis` (#66) ainda é rota de demonstração: `src/lib/demo/`, `NOT_IMPLEMENTED` e `DemoNotice` ficam; saem `appointments.ts` e `list.ts` da pasta.
- A ramificação é `feat/5-client-appointments`, criada a partir de `origin/main` (39ee3e3).

## 2026-11-18 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L3, nenhuma caixa marcada. Nada foi construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-11-18 – decisão: plano aprovado

O Yvan gravou `status: aprovado` com a opção 1 marcada em L1, L2 e L3. Conferido no arquivo antes da etapa 02. O `aprovado_em` ficou "18/1/2026" (digitação; a data certa é 18/11/2026); não foi alterado.

## 2026-11-18 – desvio: arquivos fora da lista do plano (a confirmar antes do PR)

- `docs/plataforma/mensagens-de-validacao.md`: uma linha nova ("Lista de agendamentos do cliente ausente ou desconhecida" → "Escolha uma lista válida."), pedida pelo teste do `myAppointmentListQuerySchema`.
- `src/lib/demo/README.md`: os exemplos de módulo de dados passam a citar só `dashboard.ts`, já que `appointments.ts` saiu.
- `src/lib/demo/list.ts` **não** foi removido, ao contrário do plano: `tests/lib/api-client.test.ts` usa `demoPage` para simular a lista de demonstração. Fica como utilitário da pasta até alguém remover `src/lib/demo/` inteira.
- `pageSize` acima de 50 não é recusado: vale 50 (`paginationSchema`); o plano dizia "recusa", o teste afirma o que o código faz.

## 2026-11-18 – descoberta: verificação não executada

O roteiro de API no banco local, os passos manuais em `/appointments` e o Lighthouse não foram feitos: o `.env.local` não é lido pelo agente. `npm run check` passa (788 testes). Registrado no relatório.

## 2026-11-18 – descoberta: tamanho do PR

Contra `origin/main` e sem os testes: 646 linhas incluídas e 402 removidas; 282 das incluídas são a especificação OpenAPI e 333 das removidas são os dados de demonstração. O código (`src/`) soma cerca de 350 linhas incluídas. O plano previa a divisão em API e tela/OpenAPI se passasse do limite; fica para o Yvan decidir.
