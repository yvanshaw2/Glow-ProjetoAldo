---
id: RN039
titulo: Conteúdo da análise do dashboard
assunto: agendamento
tema: Indicadores
origem: issue #66, plano memoria/tarefas/66-analise-por-ia/01_plano.md (L3); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L2)
relacionados: [RF089, RF090, RF091, UC27, RN038, RN040, RS020]
---

# RN039 – Conteúdo da análise do dashboard

A análise só interpreta os valores recebidos: não calcula nem apresenta números, que são sempre os exibidos pelo sistema, e nenhuma ação é executada a partir dela. A resumida tem um resumo de até 600 caracteres e até quatro observações de até 240 caracteres, cada uma ligada a um indicador. A detalhada tem, além do resumo e das observações, cinco seções (Receita, Serviços, Clientes e veículos, Operação e Pagamentos), cada uma com uma a três observações de até 240 caracteres, e até quatro sugestões de até 240 caracteres, apresentadas como hipóteses a avaliar. Todo o texto é em português do Brasil e sem algarismos. A resposta fora desse formato é descartada, e a análise é tratada como não gerada.

## Onde se aplica

- Requisitos: [RF089](requisitos.md), [RF090](requisitos.md), [RF091](requisitos.md)
- Casos de uso: [UC27](UC27-gerar-analise-do-dashboard.md)
- Conferência da resposta: [calculos.md](calculos.md), seção 6
