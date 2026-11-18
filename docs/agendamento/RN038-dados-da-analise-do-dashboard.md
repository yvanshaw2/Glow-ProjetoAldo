---
id: RN038
titulo: Dados da análise do dashboard
assunto: agendamento
tema: Indicadores
origem: issue #66, plano memoria/tarefas/66-analise-por-ia/01_plano.md (L2); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L6)
relacionados: [RF089, RF091, UC27, RN021, RN039, RN040, RS020]
---

# RN038 – Dados da análise do dashboard

A análise do dashboard usa somente valores agregados calculados pelo sistema: os indicadores do período (RN021); os do período anterior, de mesma quantidade de dias e terminado no dia anterior à data inicial; a variação de cada indicador; a receita por dia, em períodos de até 62 dias, ou por blocos de sete dias contados a partir da data inicial, nos mais longos, para o período e o anterior; e a quantidade de agendamentos por status. Nenhum dado que identifique clientes, veículos ou funcionários, como nome, e-mail, telefone, placa ou identificador, e nada da agenda do dia é enviado ao serviço de inteligência artificial. Sem agendamentos no período, a análise não é gerada; sem agendamentos no período anterior, ela é gerada sem a comparação.

## Onde se aplica

- Requisitos: [RF089](requisitos.md), [RF091](requisitos.md)
- Casos de uso: [UC27](UC27-gerar-analise-do-dashboard.md)
- Cálculo: [calculos.md](calculos.md), seção 6
