---
id: RN042
titulo: Custo dos insumos
assunto: catalogo
tema: Precificação
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L12)
relacionados: [RF096, UC13, UC14, RN009, RN037, RN040, RS021]
---

# RN042 – Custo dos insumos

O custo dos insumos de um serviço é o valor estimado dos produtos e materiais gastos em um atendimento, informado no cadastro do serviço na mesma forma do preço (RN009): um valor no serviço de valor fixo e um por porte no serviço por porte. É opcional, de zero a R$ 99.999,99. Ao registrar, editar ou reagendar um agendamento, o custo de cada serviço é copiado, como o preço (RN037). A margem bruta de um período é a receita dos pagos (RN021) menos a soma dos custos copiados nos serviços deles, contando só os pagos com o custo de todos os serviços informado; os outros são contados à parte, como "sem custo informado". A margem não inclui despesas gerais, como aluguel e salários. O custo é dado interno da empresa (RS021).

## Onde se aplica

- Requisitos: [RF096](requisitos.md)
- Casos de uso: [UC13](UC13-cadastrar-servico.md), [UC14](UC14-manter-servicos.md)
- Regras: [RN009](RN009-precificacao.md), [RN037](../agendamento/RN037-copia-no-agendamento.md), [RN040](../agendamento/RN040-indicadores-da-analise-detalhada.md)
- Segurança: [RS021](../plataforma/seguranca.md)
