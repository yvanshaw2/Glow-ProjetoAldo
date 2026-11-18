# Notas: 4-agendar-pelo-cliente

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-11-18 – descoberta: o que já existe

- `services/appointments.ts` (#49) já tem `previewAppointment`, `createAppointment`, `lookUpServices` e os cálculos; as rotas do painel (`/api/admin/appointments/*`) são o modelo das três do cliente. `isVehicleOfClient` (#45) serve à regra do RS009.
- `create_appointment` aceita `p_staff_id` vazio; só `NewAppointment.staffId` precisa virar `string | null`.
- `bookingFormSchema` tem o campo `client` (painel); o portal precisa do esquema sem ele.
- Os veículos de `src/lib/demo/appointments.ts` usam os ids do `seed-demo.sql` (cliente Henrique Costa, sem conta de acesso): com a prévia real, as janelas de edição e reagendamento de `/appointments` passam a receber 404 do veículo (lacuna L3).

## 2026-11-18 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L3, nenhuma caixa marcada. Nada foi construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.
