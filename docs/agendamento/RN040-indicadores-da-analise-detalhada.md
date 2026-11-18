---
id: RN040
titulo: Indicadores da análise detalhada
assunto: agendamento
tema: Indicadores
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L3, L4, L5, L10 a L15)
relacionados: [RF091, UC27, RN021, RN037, RN038, RN039, RN041, RN042, RN043, RN044, RS020]
---

# RN040 – Indicadores da análise detalhada

A análise detalhada usa, além de RN038, os indicadores abaixo, calculados pelo sistema no fuso da empresa. "Agendamentos do período" são os de data marcada no período, em qualquer status; "pagos do período" são os Concluído e Reagendado com a conclusão no período, como em RN021. Taxas e médias têm duas casas, com meio centavo para cima (RN012).

1. Serviços: os cinco serviços de maior valor nos pagos do período, pela soma do preço de cada serviço no agendamento, com a quantidade, e os demais somados como "Demais".
2. Categorias: o valor e a quantidade dos serviços dos pagos do período por categoria, pelo nome da categoria copiado no agendamento (RN037); nos registrados antes da cópia, pela categoria atual do serviço.
3. Complementos: o percentual dos pagos do período com ao menos um serviço complementar ou adicional.
4. Veículos: os agendamentos do período por tipo e por porte do veículo, e o ticket médio dos pagos por porte.
5. Pagamentos: a quantidade e a receita dos pagos do período por forma de pagamento, e a soma dos acréscimos e a dos descontos (diferença entre o total e o subtotal).
6. Canal: os agendamentos do período registrados pelo próprio cliente e os registrados pelo painel.
7. Clientes: os clientes com agendamento no período, separados em novos e recorrentes. Novo é o cliente cujo primeiro agendamento, em qualquer status, tem a data marcada no período; recorrente, o que já tinha agendamento antes dele.
8. Retornos: os agendamentos do período que são reagendamento de um serviço concluído (RN020).
9. Dias da semana: os agendamentos e os cancelados do período pela data marcada, e a receita dos pagos pela data de conclusão, de segunda a domingo.
10. Horários: os agendamentos do período pela hora de início.
11. Cancelamentos: os cinco serviços mais presentes nos cancelados do período, com a quantidade.
12. Em aberto: a quantidade e a soma do total dos agendamentos do período em Agendado, Em espera, Em execução e Finalizado.
13. Antecedência: a média, em dias com uma casa, entre a data do registro e a data marcada dos agendamentos do período, pelas datas de calendário no fuso da empresa, e a quantidade em cada faixa: no mesmo dia, de 1 a 3 dias, de 4 a 7 dias e mais de 7 dias.
14. Motivos de cancelamento: os cancelados do período por motivo, com "Não informado" para os sem motivo (RN041).
15. Margem: a receita dos pagos com custo informado, a soma dos custos, a margem bruta (diferença) e o percentual dela sobre essa receita, e a quantidade de pagos sem custo informado (RN042).
16. Avaliação: a média das notas, com duas casas, e a quantidade de cada nota dos atendimentos concluídos no período, pela data de conclusão (RN043).
17. Ocupação: a ocupação da agenda do período (RN044).

Os indicadores 3, 6, 7, 8, 13 (a média), 15 (o percentual da margem), 16 (a média) e 17 vão também com o valor do período anterior e a variação. Nomes de clientes, placas, funcionários e identificadores nunca entram; os nomes de serviços e de categorias são do catálogo público.

## Onde se aplica

- Requisitos: [RF091](requisitos.md)
- Regras: [RN041](RN041-motivo-do-cancelamento.md), [RN042](../catalogo/RN042-custo-dos-insumos.md), [RN043](RN043-avaliacao-do-atendimento.md), [RN044](../configuracoes/RN044-ocupacao-da-agenda.md)
- Casos de uso: [UC27](UC27-gerar-analise-do-dashboard.md)
- Cálculo: [calculos.md](calculos.md), seção 7
