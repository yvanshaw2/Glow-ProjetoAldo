---
titulo: Conteúdo da tela do dashboard
assunto: agendamento
origem: issue #60, plano memoria/tarefas/60-telas-do-dashboard/01_plano.md (L2, L3, L5, L6); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L2, L7, L8)
relacionados: [UC09, UC27, RF040, RF041, RF042, RF043, RF089, RF090, RF091, RF092, RF093, RF094, RN017, RN021, RN035, RN037, RN038, RN039, RN040, 0057]
---

# Conteúdo da tela do dashboard

Período, indicadores, análise do período, gráficos, agenda do dia e estados de `/admin`, do [UC09](UC09-visualizar-dashboard.md) e do [UC27](UC27-gerar-analise-do-dashboard.md). Cabeçalho e navegação: [../padroes/layouts.md](../padroes/layouts.md); estilo: [../padroes/design.md](../padroes/design.md); etiqueta de status e telas de demonstração: [../padroes/componentes.md](../padroes/componentes.md); contrato da rota: [rotas.md](rotas.md).

Os indicadores, os gráficos e a agenda são reais. Enquanto a análise do período usar os dados de demonstração de `src/lib/demo/dashboard.ts` (decisão 0055), o aviso de demonstração fica no alto do cartão "Análise do período".

## Página

- Título: "Dashboard". Seções, numa coluna: "Período", os indicadores, "Análise do período", "Receita por dia" e "Agendamentos por status" (lado a lado a partir de 1280 px, a receita em 2/3) e "Agenda do dia".
- A página lê o dashboard ao abrir, sem período: vale o mês atual do servidor, e os campos mostram o período da resposta.

## Período (UC09 FE02, RN035)

O período é escolhido por atalhos e por dois campos de data.

- Atalhos: "Este mês" (do primeiro ao último dia do mês atual, o padrão), "Hoje", "7 dias" e "30 dias" (os últimos dias, contando o de hoje). Cada um preenche "De" e "Até" e vale na hora; fica marcado o que coincide com o período mostrado.
- Campos "De" e "Até": a mudança de um campo vale 300 ms depois da última alteração, como a busca das listagens.
- Durante a leitura, nada fica desativado e o foco não sai do controle usado; o conteúdo anterior continua na tela, com a aparência de carregando.
- Período recusado (UC09 FE02): a mensagem aparece junto ao campo ("A data final não pode ser anterior à inicial." ou "O período não pode passar de 12 meses."), e a área de resultados diz "Informe um período válido para ver o dashboard."
- A linha "Período exibido: 01/10/2026 a 31/10/2026." acompanha a resposta e é anunciada quando ela chega.

## Indicadores (RF040, RN021)

Quatro, com os valores da resposta, sem cálculo na tela, cada um com uma linha que diz o que conta:

- "Receita": "Agendamentos Concluído e Reagendado".
- "Agendamentos": "Todos os status do período".
- "Ticket médio": "Receita por agendamento pago".
- "Taxa de cancelamento": "Cancelados sobre o total do período".

Período sem agendamentos (UC09 FE01): os valores zerados e "Não há dados a apresentar neste período."

## Análise do período (UC27, RF089 a RF094)

Cartão na largura toda, logo abaixo dos indicadores, com o ícone `Sparkles` ([../padroes/design-midia.md](../padroes/design-midia.md)) e os textos abaixo. O texto da análise é de um serviço de IA e aparece como texto, nunca como HTML (RS020); todo número do cartão vem do sistema ([RN039](RN039-conteudo-da-analise-do-dashboard.md)).

- Título "Análise do período" e "Um resumo em texto dos indicadores deste período, escrito por inteligência artificial a partir dos números do sistema."
- Antes de gerar: a escolha "Resumida" ou "Detalhada" (RF091), com "Resumida" marcada, e o botão "Gerar análise". A geração é pedida pelo clique, nunca sozinha. Enquanto espera, o botão diz "Gerando análise…", fica indisponível sem perder o foco (`aria-disabled`) e o lugar do texto fica reservado, em três linhas.
- Resultado da resumida: o resumo; as observações, cada uma com o nome do indicador em negrito e, nos quatro indicadores do período, o valor e a variação do sistema, como "Receita: R$ 12.500,00, alta de 25,0% em relação ao período anterior" ("queda de", "estável" quando a variação é zero; na taxa de cancelamento, "alta de 5,0 pontos percentuais"), com os ícones `TrendingUp`, `TrendingDown` ou `Minus`, decorativos; a tabela "Este período × período anterior" (Indicador, Este período, Período anterior, Variação); o gráfico "Receita: este período e o anterior" (RF092); "Gerado por inteligência artificial em 23/10/2026 às 14:32. Pode conter imprecisões: os números oficiais são os dos indicadores." (data e hora no fuso da empresa, decisão 0053); e o botão passa a "Gerar novamente", que troca a análise exibida (UC27 FA01).
- Resultado da detalhada: o mesmo e, depois das observações, as cinco seções em `h3`, cada uma com as observações da IA e "Números da seção", os indicadores de [RN040](RN040-indicadores-da-analise-detalhada.md) formatados pela tela: "Receita" (a comparação e os agendamentos em aberto), "Serviços" (serviços, categorias, complementos e cancelamentos por serviço), "Clientes e veículos" (novos e recorrentes, retornos, tipo e porte), "Operação" (dias da semana, horários e canal) e "Pagamentos" (formas de pagamento, acréscimos e descontos); e "Sugestões", com "Sugestões geradas por IA: avalie antes de colocar em prática."
- Gráfico "Receita: este período e o anterior": linhas, este período em `--link` e o anterior em `--muted-foreground`, tracejado; no eixo horizontal, "Dia 1", "Dia 2"… ou, nos períodos de mais de 62 dias, "Semana 1", "Semana 2"… ([calculos.md](calculos.md), seção 6); a dica com as datas e os valores dos dois períodos; a tabela oculta para o leitor de tela ("Posição", "Este período" e "Período anterior"), como nos outros gráficos.
- Sem comparação (UC27 FA03): "O período anterior não tem agendamentos: a análise não compara os períodos."; a tabela e o gráfico mostram só este período.
- Depois de gerada, ao lado de "Gerar novamente": "Copiar análise" e "Imprimir ou salvar em PDF".
- Copiar (UC27 FA04, RF093): o texto simples com "Análise do período – 01/10/2026 a 31/10/2026", "Comparado com 31/08/2026 a 30/09/2026", o resumo, as observações com os valores do sistema, na detalhada as seções e as sugestões, e a nota de geração por IA. A região de status anuncia "Análise copiada." ou, se o navegador recusar, "Não foi possível copiar. Selecione o texto e copie manualmente."
- Imprimir (UC27 FA05, RF094): abre a impressão do navegador, que também salva em PDF. Saem a navegação, o cabeçalho, os campos e os atalhos do período, os botões e a agenda do dia; ficam a linha do período exibido, os indicadores, a análise com os números e os gráficos, sempre nas cores do tema claro, sem dividir um cartão entre páginas (decisão 0057).
- Período sem agendamentos (UC27 FE01): o botão fica indisponível, e o texto "Não há dados suficientes no período para gerar a análise." o descreve.
- Falha (UC27 FE02): o aviso com a mensagem da API e "Tentar novamente", que pede de novo e leva o foco ao botão; os indicadores continuam na tela (RNF017).
- Uma região de status, sempre presente, anuncia "Análise gerada.". Escolher outro período leva o cartão de volta ao começo (UC27 FA02), e a chamada em curso é cancelada.

## Gráficos (RF041, RF042, UC09 passo 3)

- "Receita por dia": barras, uma por dia do período, em `--link`; no eixo horizontal, o dia e o mês ("05/10"), com poucos rótulos; no vertical, valores em reais; a dica com a data e o valor. Sem receita no período: "Nenhuma receita no período."
- "Agendamentos por status": barras horizontais, uma por status, na ordem de [RN017](RN017-sequencia-de-status.md), com o nome e a quantidade escritos; as cores seguem os tons da etiqueta de status. Sem agendamentos: "Nenhum agendamento no período."
- Cores, contraste e acesso sem a cor: [../padroes/design.md](../padroes/design.md), Gráficos. Cada gráfico tem uma tabela com os mesmos dados, visualmente oculta, para o leitor de tela ("Dia" e "Receita"; "Status" e "Agendamentos"); o desenho não é lido nem focável.
- O código dos gráficos (Recharts, decisão 0056) só é carregado depois da página, quando a primeira resposta chega (RNF006); até lá, o lugar do gráfico fica reservado.

## Agenda do dia (RF043)

- Título "Agenda do dia", com a data de hoje por extenso.
- Os agendamentos marcados para hoje, de qualquer status, por horário. Cada item: "<início> às <previsão>", o cliente, "<marca> <modelo> · <placa>", os serviços, o total e a etiqueta de status ([RN017](RN017-sequencia-de-status.md)), com os dados copiados no agendamento ([RN037](RN037-copia-no-agendamento.md)). Uma coluna no celular; a linha em colunas a partir de 768 px.
- Sem agendamentos: "Nenhum agendamento para hoje" e "Os agendamentos marcados para hoje aparecem aqui.".

## Estados

- Na primeira leitura, o lugar dos indicadores, dos gráficos e da agenda fica reservado; numa nova leitura, o conteúdo anterior continua na tela, com a aparência de carregando (RNF004).
- Na falha da leitura (UC09 FE03), o aviso com a mensagem da API e "Tentar novamente"; o seletor de período continua na tela.

## Fora da tela, sem requisito

A saudação, "Avaliação média", "Alertas" e a variação em relação ao período anterior nos cartões dos indicadores (ela aparece só na análise).

## Onde se aplica

- Requisitos: [RF040 a RF043](requisitos.md), [RF089 a RF094](requisitos.md)
- Casos de uso: [UC09](UC09-visualizar-dashboard.md), [UC27](UC27-gerar-analise-do-dashboard.md)
- Regras: [RN021](RN021-indicadores-do-dashboard.md), [RN035](../plataforma/RN035-formatos-dos-dados.md), [RN038](RN038-dados-da-analise-do-dashboard.md), [RN039](RN039-conteudo-da-analise-do-dashboard.md), [RN040](RN040-indicadores-da-analise-detalhada.md)
