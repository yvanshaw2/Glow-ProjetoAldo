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
