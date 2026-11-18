# Notas: 4-agendar-pelo-cliente

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-11-18 – descoberta: o que já existe

- `services/appointments.ts` (#49) já tem `previewAppointment`, `createAppointment`, `lookUpServices` e os cálculos; as rotas do painel (`/api/admin/appointments/*`) são o modelo das três do cliente. `isVehicleOfClient` (#45) serve à regra do RS009.
- `create_appointment` aceita `p_staff_id` vazio; só `NewAppointment.staffId` precisa virar `string | null`.
- `bookingFormSchema` tem o campo `client` (painel); o portal precisa do esquema sem ele.
- Os veículos de `src/lib/demo/appointments.ts` usam os ids do `seed-demo.sql` (cliente Henrique Costa, sem conta de acesso): com a prévia real, as janelas de edição e reagendamento de `/appointments` passam a receber 404 do veículo (lacuna L3).

## 2026-11-18 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L3, nenhuma caixa marcada. Nada foi construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-11-18 – decisão: plano aprovado

O Yvan gravou `status: aprovado` em 18/11/2026, com a opção 1 em L1, L2 e L3 (caixas marcadas). Conferido no arquivo antes da etapa 02.

## 2026-11-18 – desvio: lista de arquivos do plano

Sem arquivo fora da lista. `src/lib/demo/appointments.ts` perdeu mais do que as duas respostas: o catálogo de serviços, as categorias, os veículos e o cálculo de previsão da demonstração só serviam à prévia e aos serviços para agendar, e saíram (o lint acusava o código sem uso).

## 2026-11-18 – descoberta: verificação não executada

O roteiro de API no banco local e o passo manual em `/booking` não foram feitos: o `.env.local` não é lido pelo agente, e o `next build` local parou numa verificação de segurança da versão do Next.js antes de compilar. `npm run check` passa. Registrado no relatório como pendência.
