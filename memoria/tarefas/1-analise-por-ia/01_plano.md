---
issue: 1
titulo: "Análise do período no dashboard, gerada por IA"
areas: [frontend, backend, banco, testes]
tipo: funcionalidade
requisitos: [UC27, UC09, UC07, UC12, UC13, UC14, UC23, UC28, RF089, RF090, RF040, RF041, RF042, RF095, RF096, RF097, RF098, RN038, RN039, RN021, RN035, RN037, RN019, RN009, RN013, RN016, RN040, RN041, RN042, RN043, RN044, RNF017, RNF018, RNF007, RS008, RS009, RS014, RS016, RS017, RS018, RS019, RS020, RS021]
status: aprovado
aprovado_por: 18/11/2026  
aprovado_em: 17:41
---

# Plano: Análise do período no dashboard, gerada por IA

## Objetivo

Ligar ao sistema a análise do período de `/admin` (UC27) e ampliá-la para uma análise de negócio, a pedido do Yvan em 18/11/2026 ("Tudo na #1"). O funcionário com a permissão `dashboard` escolhe uma análise **resumida** ou **detalhada** do período, comparada com o período anterior, escrita por um modelo de linguagem do Groq em plano gratuito (decisão 0054), que recebe só valores agregados (RN038, RS020). Todo número exibido vem do sistema; a IA só interpreta (RN039). A análise pode ser **copiada** e **impressa ou salva em PDF**. A falha da IA não afeta o dashboard (RNF017, RNF018).

Entregas:

1. Análise resumida (a de UC27 hoje): resumo e até quatro observações, agora com o número do sistema ao lado de cada observação, a tabela "Este período × anterior" e o gráfico da receita dos dois períodos.
2. Análise detalhada: o resumo, cinco seções fixas (Receita, Serviços, Clientes e veículos, Operação, Pagamentos), cada uma com as observações da IA e os números do sistema, e até quatro sugestões, a partir de indicadores novos do negócio (RN040, nova), agregados no banco por uma função nova (migration).
3. Copiar a análise (texto) e imprimir ou salvar em PDF pelo navegador (decisão 0057, nova).
4. Versão das instruções ao modelo no registro e roteiro de avaliação manual da análise.
5. Remoção de `src/lib/demo/`, do código `NOT_IMPLEMENTED` e do `DemoNotice`, porque esta é a última rota de demonstração (decisão 0055, L1 e L16).
6. Dados novos do negócio, para a análise ter de fato o que analisa (segunda ampliação, pedida pelo Yvan em 18/11/2026, "Tudo na #1"): a antecedência dos agendamentos (já gravada), o motivo do cancelamento, o custo dos insumos e a margem, a categoria copiada no agendamento, a avaliação do atendimento pelo cliente e a ocupação da agenda. Cada dado entra completo: a coluna ou tabela no banco, a captura no fluxo real (tela, rota e regra), a exibição onde o dado é usado, a simulação coerente no `seed-demo.sql` e o indicador na análise detalhada. Nenhum dado existe só no seed.

A documentação de base da análise (decisão 0054, `servico-de-ia.md`, UC27, RN038, RN039, RF089, RF090, RNF017, RNF018, RS019, RS020, `calculos.md` seção 6, `rotas.md`) já está na `main`. Já existem o cartão `dashboard-analysis-card.tsx`, os tipos `DashboardAnalysis`, a lista `DASHBOARD_INDICATORS` e `calculateIndicators` no serviço `dashboard`; hoje o cartão recebe uma análise fixa de `src/lib/demo/dashboard.ts`.

## Base

- Cada PR abre a sua ramificação a partir da `origin/main` atualizada (ordem abaixo). Este plano e as notas estão na `docs/1-ai-analysis-details` (PR 1), criada de `origin/main` (5500d11).
- Próximos números livres, conferidos em `docs/`: RF091, RN040, RNF019, RS021, UC28 e a decisão 0057; depois do PR 1, RF095, RN041, RS021, UC28 e a decisão 0058.
- A segunda ampliação (L10 a L17) devolveu o plano a `aguardando_aprovacao`. As lacunas L1 a L9 continuam aprovadas, e o PR 1 (L2 a L9 e a decisão 0057) está pronto, com commits locais na `docs/1-ai-analysis-details`, ainda não enviados.
- A AV3 é no início de dezembro de 2026, e a #2 (documentos formais) depende da documentação desta tarefa e da decisão 0055 (ver "Riscos e dúvidas", ponto 1).

## Ordem da construção: treze PRs na issue #1

Cada PR fica perto de 400 linhas fora os testes, com a sua ramificação, e só começa depois da incorporação dos PRs de que depende. O último a ser incorporado usa `Closes #1`; os outros, `Refs #1`.

| PR | Ramificação | Conteúdo | Depende de |
|---|---|---|---|
| 1. Documentação da análise | `docs/1-ai-analysis-details` | os textos de L2 a L9 (prontos, sem envio) e de L18, a decisão 0057, a memória da tarefa | nada |
| 2. Documentação dos dados novos | `docs/1-business-data` | os textos de L10 a L17 | PR 1 |
| 3. Rota da análise resumida | `feat/1-ai-analysis` | regras puras com TDD, esquema, códigos do catálogo, adaptador, serviço, rota, OpenAPI, versão das instruções no registro | PR 1 |
| 4. Cartão ligado | `feat/1-analysis-card` | o cartão na rota real (sai a entrada da lista de demonstração e o aviso), o número ao lado das observações, a tabela comparativa, o gráfico dos dois períodos, copiar, imprimir | PR 3 |
| 5. Fim da demonstração | `chore/1-remove-demo` | `src/lib/demo/`, `NOT_IMPLEMENTED`, `DemoNotice`, `api-client.ts` e o teste dele, a decisão 0058 (L16) | PR 2, PR 4 |
| 6. Indicadores detalhados | `feat/1-analysis-details-data` | a migration da função `dashboard_details` com os itens 1 a 13 de RN040, o repositório, as regras puras com TDD, `dados.md` | PR 2 |
| 7. Análise detalhada, servidor | `feat/1-detailed-analysis` | entrada, mensagens e conferência da detalhada com TDD, `detail` no esquema, serviço, rota e OpenAPI | PR 3, PR 6 |
| 8. Análise detalhada, tela | `feat/1-detailed-analysis-card` | a escolha "Resumida / Detalhada", as seções com os números, as sugestões, a cópia e a impressão da detalhada | PR 4, PR 7 |
| 9. Motivo do cancelamento | `feat/1-cancellation-reason` | migration (tipo e coluna), esquemas e regra dos motivos por ator com TDD, as duas rotas de cancelamento, os dois diálogos, o motivo no detalhe nos dois lados, o seed, o indicador em `dashboard_details` e na seção Operação | PR 8 |
| 10. Custo e categoria, servidor | `feat/1-service-cost` | migration (colunas de custo e de categoria, a nova `save_service` e as funções de agendamento), custo na regra de preço com TDD, rotas de serviços e OpenAPI, o seed | PR 2 |
| 11. Custo e margem, tela e análise | `feat/1-service-cost-screen` | os campos de custo no cadastro do serviço, a margem e a categoria copiada em `dashboard_details` e na seção Serviços | PR 8, PR 10 |
| 12. Avaliação do atendimento | `feat/1-appointment-review` | migration (tabela), regra de quem e quando avalia com TDD, rota do cliente e OpenAPI, `/appointments`, detalhe do painel, o seed, o indicador e a seção Clientes e veículos | PR 8 |
| 13. Ocupação da agenda | `feat/1-schedule-occupancy` | migration (coluna), regra dos minutos disponíveis com TDD, rota e formulário de disponibilidade, o seed, o indicador e a seção Operação | PR 8 |

Os PRs 1 a 5 entregam a análise resumida completa e o sistema sem demonstração; os 6 a 8, a detalhada com os dados que o sistema já tem (inclusive a antecedência); os 9 a 13 acrescentam, cada um por inteiro, um dado novo: gravado pelo fluxo real, exibido, simulado no seed e levado à análise, com uma versão nova das instruções da detalhada. Qualquer fronteira entre PRs deixa o sistema inteiro: o dado que não chegar até a AV3 só não existe ainda (ponto 1 de "Riscos e dúvidas").

## Como funciona

### Contrato da API

`POST /api/admin/dashboard/analysis` (`rotas.md`), com `requirePermission("dashboard")`. `POST` porque é ação com custo, nunca repetida; nada é gravado.

- **Entrada:** `from*`, `to*` (datas do período exibido, RN035) e `detail` (`summary`, o padrão, ou `detailed`, a partir do PR 7). Campos não previstos são descartados (RS013).
- **Resposta 200** (`DashboardAnalysis`): os campos de hoje (`from`, `to`, `previousFrom`, `previousTo`, `hasComparison`, `summary`, `highlights`, `generatedAt`) e mais:
  - `analyzedTo`: o último dia analisado, `to` ou o dia corrente, o que vier antes (L18);
  - `detail`: o modo gerado;
  - `promptVersion`: a versão das instruções que gerou o texto;
  - `comparison`: para `revenue`, `appointmentCount`, `averageTicket` e `cancellationRate`, os valores `current`, `previous` e `variation` (percentual com uma casa; na taxa de cancelamento, pontos percentuais; `null` sem valor anterior), calculados pelo sistema;
  - `revenueSeries`: a unidade (`day` ou `week`, L6) e, para cada posição, o início e a receita deste período e do anterior;
  - só na detalhada: `details` (os indicadores de RN040, os mesmos enviados à IA), `sections` (cinco, cada uma com `section` e de uma a três `observations`) e `recommendations` (até quatro); na resumida, `null`.
- **Erros:** os de hoje em `rotas.md`: 400, 401, 403, 409 `INSUFFICIENT_DATA`, 413, 415, 503 `AI_UNAVAILABLE`, 500.

### Backend

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `src/app/api/admin/dashboard/analysis/route.ts` | guard, `dashboardAnalysisSchema.parse(body)`, `generateDashboardAnalysis`, `respondOk` |
| Serviço | `src/server/services/dashboard.ts` | indicadores do período e do anterior em paralelo (`calculateIndicators`); na detalhada, também `dashboard_details` dos dois períodos; sem agendamentos, `INSUFFICIENT_DATA`; monta a entrada e as mensagens, chama o adaptador, confere a resposta; falha → `AI_UNAVAILABLE` com `warn`; sucesso → `info` com o modelo, os tokens, a duração e `promptVersion` |
| Regras | `src/server/rules/dashboard-analysis.ts` | `findPreviousPeriod`, `calculateVariation`, `buildComparison`, `buildRevenueSeries`, `buildAnalysisInput`, `buildAnalysisMessages`, `parseAnalysis` (os dois modos), os esquemas JSON da resposta e `ANALYSIS_PROMPT_VERSIONS` |
| Regras | `src/server/rules/dashboard-details.ts` | `buildDetails`: arredondamentos, taxas, os cinco maiores e "Demais", dias da semana e horas completos (RN040) |
| Repositório | `src/server/repositories/dashboard.ts` | `findDashboardDetails(from, to, timeZone)`, pela função `dashboard_details` |
| Banco | `supabase/migrations/<data>_dashboard_details_function.sql` | `dashboard_details(p_from, p_to, p_time_zone)`, só leitura, `jsonb`, como a `dashboard_figures`: o banco agrega porque uma leitura da API para em 1000 linhas; `execute` revogado de `public`, `anon` e `authenticated` |
| Apoio | `src/server/ai/chat-completion.ts` | `requestChatCompletion({ messages, schema, maxTokens })`: lê as três variáveis na requisição; `fetch` a `${AI_BASE_URL}/chat/completions`, `Authorization: Bearer`; corta em 15 s; devolve o texto e os tokens, ou o motivo (`not_configured`, `timeout`, `rate_limited`, `provider_error`); nenhuma nova tentativa |

Registro (decisão 0029): nunca a chave, as mensagens nem a resposta (RS018, RS019).

### Tamanho da entrada (RN038, L6)

Até 62 dias, a receita vai por dia; acima disso, em blocos de sete dias contados a partir da data inicial (o último pode ser menor), nos dois períodos, alinhados por posição. Doze meses passam de 366 itens para 53. Estimativa com as instruções e a resposta: resumida de um mês, cerca de 1,5 mil tokens; resumida de 12 meses, cerca de 2,5 mil; detalhada, de 3,5 mil a 4,5 mil. Todas cabem nos 8 mil tokens por minuto do plano Free.

### Tela

No cartão "Análise do período" de `/admin`, a partir de 360 px:

- Antes de gerar: a escolha "Resumida / Detalhada" (`ChoiceGroup`, a partir do PR 8) e o botão "Gerar análise", como hoje.
- Resumida: o resumo; as observações, cada uma com o rótulo do indicador, o valor do sistema e a variação ("Receita: R$ 12.500,00, alta de 25,0% em relação ao período anterior"), com os ícones `TrendingUp`, `TrendingDown` ou `Minus`, decorativos, e a variação sempre escrita; a tabela "Este período × período anterior" (Indicador, Este período, Período anterior, Variação); o gráfico de linhas "Receita: este período e o anterior" (este em `--link`, o anterior em `--muted-foreground`, tracejado; eixo "Dia 1…" ou "Semana 1…"; tabela oculta para o leitor de tela, como os outros gráficos, decisão 0056). Sem comparação (UC27 FA03), sai a coluna e a linha do anterior, com o aviso de hoje.
- Detalhada: além disso, as cinco seções (`h3`), cada uma com as observações da IA e "Números da seção", as listas e quantidades de `details`, formatadas pela tela; e "Sugestões", com "Sugestões geradas por IA: avalie antes de colocar em prática."
- Depois de gerada: "Copiar análise" e "Imprimir ou salvar em PDF", ao lado de "Gerar novamente".
- Copiar: o texto simples abaixo, pela área de transferência do navegador; a região de status anuncia "Análise copiada." ou "Não foi possível copiar. Selecione o texto e copie manualmente."
- Imprimir: `window.print()`. Na impressão saem a navegação, o cabeçalho, os campos do período, os botões e a agenda do dia (tem nomes e placas e não é do período); ficam o período, os indicadores, a análise com os números e os gráficos, sempre com as cores do tema claro, sem quebrar um cartão entre páginas.

Texto copiado (exemplo da resumida):

```
Análise do período – 01/10/2026 a 31/10/2026
Comparado com 01/09/2026 a 30/09/2026

<resumo>

Observações
- Receita (R$ 12.500,00; alta de 25,0%): <comentário>

Gerado por inteligência artificial em 18/11/2026 às 14:32. Pode conter imprecisões: os números oficiais são os dos indicadores.
```

### Instruções ao modelo

A mensagem de sistema de cada modo, constante no código, põe o modelo no lugar do analista da empresa que entrega ao dono o relatório do período: o que os números do dashboard e os outros dados mostram, o que mudou em relação ao período anterior (L18), o que merece atenção e, na detalhada, as sugestões. Texto em português do Brasil, em tom profissional e direto, só com os valores recebidos, sem algarismos (RN039) e com as causas apresentadas como hipóteses. As instruções não mencionam a origem dos dados (`notas.md`, 18/11/2026). O relatório é gerado quando o dono, ou o funcionário com a permissão `dashboard`, pede, para qualquer período: o do dia, do mês, do ano ou outro.

### Dados novos (L10 a L15)

| Dado | Banco | Captura no fluxo real | Onde aparece | Simulação no `seed-demo.sql` |
|---|---|---|---|---|
| Antecedência (L10) | `appointments.created_at`, que já existe | o registro do agendamento | na análise | já simulada: de 1 a 6 dias antes da data marcada |
| Motivo do cancelamento (L11) | tipo `cancellation_reason` e coluna `appointments.cancellation_reason`, opcional no banco (os cancelamentos antigos ficam sem motivo) | escolha obrigatória no diálogo "Cancelar agendamento", do painel e do portal; corpo `{ reason }` nos dois `POST .../cancel` | no detalhe do agendamento cancelado, no painel e no portal; na análise | um motivo para cada cancelado de demonstração, por sorteio fixo pelo id, com os motivos do cliente nos agendados pelo portal |
| Custo dos insumos (L12) | `services.fixed_cost`, `service_prices.cost` e `appointment_services.cost`, opcionais | campos de custo no cadastro do serviço, na etapa dos preços e na mesma forma deles; cópia ao registrar, editar e reagendar (RN037) | no cadastro do serviço, no painel; na análise; nunca no catálogo público nem na área do cliente (RS021) | custo de 25% a 35% do preço em cada serviço e porte, e a cópia nos agendamentos de demonstração |
| Categoria copiada (L13) | `appointment_services.category_name`, opcional | cópia nas funções de agendamento, como o nome do serviço | na análise | a cópia nos agendamentos de demonstração |
| Avaliação (L14) | tabela `appointment_reviews` (`appointment_id`, `rating` de 1 a 5, `created_at`) | o cliente avalia no detalhe do histórico de `/appointments`; `POST /api/me/appointments/:id/review` | no detalhe do agendamento, no portal e no painel; na análise | notas em cerca de 60% dos concluídos, dadas dentro dos 30 dias da conclusão: a maioria 5 e 4, algumas 3 e poucas 2 e 1 |
| Ocupação (L15) | `business_settings.simultaneous_slots`, de 1 a 20, padrão 1 | campo "Atendimentos simultâneos" na aba Disponibilidade; `GET` e `PUT /api/admin/settings/business-hours` passam a `{ days, simultaneousSlots }` | em Configurações; na análise | 3 atendimentos simultâneos |

- O `seed-demo.sql` continua carregável mais de uma vez: além de acrescentar os dias sem agendamentos, preenche os dados novos dos agendamentos de demonstração que ainda não os têm, sem duplicar nada. Nada de dado pessoal real (`guia/regras.md`, Dados).
- Cada PR de dado novo amplia `dashboard_details` (migration nova, com `create or replace`), `buildDetails`, os "Números da seção" e as instruções da detalhada (versão nova, `detalhada-2` em diante), além do texto copiado.
- O custo é lido só pelas rotas do painel: as rotas do catálogo público e as da área do cliente não selecionam as colunas de custo, e os tipos delas não têm o campo (RS021).

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um período com agendamentos, quando aciono "Gerar análise", então vejo, em até 20 s, um resumo e até quatro observações em português, sem algarismos, identificados como gerados por IA (UC27, RF089, RF090, RN039, RNF018) | testes de `parseAnalysis`; local, com o provedor simulado e o `seed-demo.sql`; com a chave real, só na pré-visualização, pelo Yvan |
| Dado o período de 01/10/2026 a 31/10/2026, quando a análise é gerada, então o serviço de IA recebe os indicadores dele e os de 01/09/2026 a 30/09/2026, sem nome, e-mail, telefone, placa, identificador nem a agenda do dia (RN038, RS020) | testes de `findPreviousPeriod` e `buildAnalysisInput` (resumida e detalhada); local: o provedor simulado grava o corpo, conferido contra os nomes e as placas do `seed-demo.sql` |
| Dado um período sem agendamentos, quando o abro, então "Gerar análise" fica indisponível, e a rota responde 409 `INSUFFICIENT_DATA` sem chamar a IA (UC27 FE01) | local, na tela e por `POST` direto |
| Dado o serviço de IA fora do ar, lento, sem cota ou com resposta fora do formato, quando gero a análise, então vejo que ela não pôde ser gerada, com "Tentar novamente", e os indicadores continuam (UC27 FE02, RNF017) | local, com o provedor simulado em cada modo; 503 `AI_UNAVAILABLE`, a linha `warn`, nenhuma nova chamada |
| Dado um funcionário sem a permissão `dashboard`, quando chama a rota, então recebe 403, e a IA não é chamada (RS008, RS019) | local, com as contas de teste |
| Dado o registro do servidor e o código do navegador, então nenhum traz a chave, as mensagens enviadas ou a resposta do modelo (RS016, RS018, RS019) | local: busca no registro e em `.next/static` pela chave de teste e por trechos da resposta simulada |
| Dado uma análise gerada, quando a vejo, então cada observação de um indicador tem o valor e a variação do sistema, e a tabela e o gráfico comparam os dois períodos (RF092) | testes de `buildComparison` e `buildRevenueSeries`; local, conferindo os valores com os indicadores da tela e com SQL no banco local |
| Dado um período de 12 meses, quando a análise é gerada, então a receita vai à IA em blocos de sete dias (RN038) | teste de `buildRevenueSeries`; local, pelo corpo gravado no provedor simulado |
| Dado a escolha "Detalhada", quando gero a análise, então vejo o resumo, as cinco seções com as observações e os números do sistema e até quatro sugestões, sem algarismos no texto da IA (RF091, RN039, RN040) | testes de `buildDetails`, da entrada e da conferência detalhadas; local, com o provedor simulado; números conferidos com SQL no banco local |
| Dado uma análise na tela, quando aciono "Copiar análise", então o texto com o período, os números do sistema e a nota de IA vai à área de transferência (RF093) | local, colando num editor; teste da função que monta o texto |
| Dado uma análise na tela, quando aciono "Imprimir ou salvar em PDF", então a impressão traz o período, os indicadores, a análise e os gráficos, sem navegação, botões nem agenda do dia, legível também no tema escuro (RF094) | local, salvando em PDF pelo Chrome nos temas claro e escuro, a 360 px e em tela larga |
| Dado o sistema sem rotas de demonstração, quando as telas abrem, então nenhuma mostra o aviso de demonstração, e o cliente da API só fala com a rede (decisão 0055) | `npm run check`; busca por `lib/demo`, `NOT_IMPLEMENTED` e `DemoNotice` em `src/`, `tests/` e `docs/`; uma tela de cada área |
| Dado agendamentos registrados no mesmo dia, 2 e 10 dias antes da data marcada, quando gero a detalhada, então ela traz a antecedência média e a distribuição por faixa (RN040) | teste de `buildDetails`; local, com SQL no banco |
| Dado um agendamento "Agendado", quando o cancelo pelo painel ou pelo portal, então escolho o motivo, obrigatório, e ele aparece no detalhe; o cliente não vê "Não comparecimento" nem "Indisponibilidade da empresa", e a rota do cliente os recusa (RF095, RN041) | testes dos esquemas e da regra dos motivos; roteiro de API nas duas rotas; na tela, nos dois diálogos |
| Dado um serviço por porte com custo, quando é agendado para um veículo grande, então o custo do porte grande é copiado no agendamento, e o catálogo público e a área do cliente nunca trazem custo (RF096, RN042, RS021) | teste da regra de preço com custo; SQL; busca por `cost` nas respostas das rotas públicas e do cliente |
| Dado pagos com e sem custo informado, quando gero a detalhada, então a margem considera só os com custo, e os outros aparecem como "sem custo informado" (RN042) | teste de `buildDetails`; local |
| Dado um atendimento meu concluído há menos de 30 dias, quando o avalio com nota 4, então a nota fica gravada e aparece no detalhe, no portal e no painel; avaliar de novo, depois de 30 dias ou o de outro cliente é recusado (UC28, RF097, RN043, RS009) | testes da regra da avaliação e do esquema; roteiro de API com duas contas; na tela |
| Dado 3 atendimentos simultâneos e a disponibilidade atual, quando gero a detalhada, então a ocupação é a duração dos agendamentos não cancelados sobre os minutos de funcionamento vezes 3 (RF098, RN044) | teste da regra dos minutos disponíveis e de `buildDetails`; SQL |
| Dado o `seed-demo.sql` carregado duas vezes, quando confiro o banco, então os agendamentos de demonstração têm motivo, custo, categoria e avaliações, sem nada duplicado | local, contando no SQL depois de cada carga |

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`: o cartão nos estados inicial, carregando, resumida, detalhada, sem comparação, sem dados, falha e copiado, a 360 × 800 primeiro e a 1440 × 900, claro e escuro, pelo teclado, com os anúncios da região de status. E o roteiro de avaliação da L9, na pré-visualização, pelo Yvan.

### Como a verificação local é feita

Banco local, contas de teste, `next build` e `next start`, como nas tarefas anteriores, mais um **provedor simulado**: um servidor Node.js no scratchpad, em `http://127.0.0.1`, que responde no formato Chat Completions nos modos sucesso (resumida e detalhada), demora de 20 s, 429, 500, texto fora do JSON, algarismo no texto e observações demais, e grava o corpo recebido. O servidor recebe `AI_BASE_URL` com esse endereço, um `AI_MODEL` qualquer e uma chave inventada. O agente não usa a chave real nem chama o Groq. Como o agente não lê `.env.local`, a verificação com o banco local e a chamada real dependem do Yvan; o relatório registra o que não foi verificado.

## Arquivos

### PR 1, documentação da análise

| Arquivo | Ação |
|---|---|
| `docs/agendamento/requisitos.md` | alterar: RF091 a RF094, `ids` |
| `docs/agendamento/RN038-dados-da-analise-do-dashboard.md`, `RN039-conteudo-da-analise-do-dashboard.md` | alterar (L2, L6) |
| `docs/agendamento/RN040-indicadores-da-analise-detalhada.md` | criar (L3 a L5) |
| `docs/agendamento/UC27-gerar-analise-do-dashboard.md` | alterar: o modo no passo 1, FA04 (copiar), FA05 (imprimir) |
| `docs/agendamento/calculos.md` | alterar: seção 6 (comparação, série, modos) e seção 7, nova (indicadores de RN040) |
| `docs/agendamento/rotas.md`, `dashboard-do-painel.md`, `CONTEXT.md` | alterar: contrato, tela, RN040 e a contagem dos RF |
| `docs/plataforma/servico-de-ia.md` | alterar: tamanhos, modos, versão das instruções, avaliação (L9) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: "Tipo de análise desconhecido" → "Escolha um tipo de análise válido." (L2) |
| `docs/padroes/testes.md`, `workflows/procedimentos/testes.md` | alterar: casos novos e o roteiro de avaliação (L9) |
| `docs/decisoes/0057-exportacao-pela-impressao-do-navegador.md`, `docs/decisoes/CONTEXT.md` | criar e alterar (L8) |
| `memoria/tarefas/1-analise-por-ia/` | `01_plano.md` e `notas.md` |

### PR 2, documentação dos dados novos

| Arquivo | Ação |
|---|---|
| `docs/agendamento/requisitos.md`, `docs/catalogo/requisitos.md`, `docs/configuracoes/requisitos.md` | alterar: RF095 e RF097; RF096; RF098 |
| `docs/agendamento/RN041-motivo-do-cancelamento.md`, `RN043-avaliacao-do-atendimento.md`, `UC28-avaliar-atendimento.md` | criar |
| `docs/catalogo/RN042-custo-dos-insumos.md`, `docs/configuracoes/RN044-ocupacao-da-agenda.md` | criar |
| `docs/agendamento/RN019-cancelamento.md`, `RN037-copia-no-agendamento.md`, `RN040-indicadores-da-analise-detalhada.md`, `UC07-acompanhar-agendamentos.md`, `UC12-atualizar-status-do-agendamento.md` | alterar |
| `docs/catalogo/UC13-cadastrar-servico.md`, `UC14-manter-servicos.md`, `docs/configuracoes/UC23-configurar-disponibilidade.md` | alterar |
| `docs/agendamento/dados.md`, `docs/catalogo/dados.md`, `docs/configuracoes/dados.md` | alterar: as colunas, o tipo e a tabela novos |
| `docs/agendamento/rotas.md`, `docs/catalogo/rotas.md`, `docs/configuracoes/rotas.md` | alterar: os corpos de cancelamento, a rota da avaliação, o custo nos serviços, `business-hours` |
| `docs/agendamento/calculos.md` | alterar: o custo na seção 1 e os itens novos na seção 7 |
| `docs/agendamento/agendamentos-do-painel.md`, `meus-agendamentos.md`, `dashboard-do-painel.md`, `docs/catalogo/servicos-do-painel.md`, `docs/configuracoes/configuracoes-do-painel.md` | alterar: os textos das telas |
| `docs/agendamento/CONTEXT.md`, `docs/catalogo/CONTEXT.md`, `docs/configuracoes/CONTEXT.md` | alterar: índices |
| `docs/plataforma/seguranca.md` | alterar: RS021 |
| `docs/plataforma/mensagens-de-validacao.md`, `docs/padroes/api.md` | alterar: as mensagens novas e o código `REVIEW_NOT_ALLOWED` |
| `docs/plataforma/infraestrutura.md` | alterar: o que o `seed-demo.sql` preenche |
| `docs/plataforma/visao-geral.md` | alterar: o custo dos insumos dentro do escopo (L12) |
| `docs/padroes/testes.md` | alterar: os casos novos |
| `memoria/tarefas/1-analise-por-ia/` | `01_plano.md` e `notas.md` |

### PR 3, rota da análise resumida

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/dashboard/analysis/route.ts`, `README.md` | criar |
| `src/app/api/admin/dashboard/README.md` | alterar |
| `src/server/ai/chat-completion.ts`, `README.md` | criar |
| `src/server/rules/dashboard-analysis.ts` | criar |
| `src/server/rules/README.md`, `src/server/README.md` | alterar |
| `src/server/services/dashboard.ts` | alterar: `generateDashboardAnalysis` |
| `src/shared/api/dashboard.ts` | alterar: `comparison`, `revenueSeries`, `detail`, `promptVersion` |
| `src/shared/validation/dashboard.ts` | alterar: `dashboardAnalysisSchema` |
| `src/shared/errors/catalog.ts` | alterar: `INSUFFICIENT_DATA` e `AI_UNAVAILABLE` |
| `docs/plataforma/openapi.yaml` | alterar: o caminho, `DashboardAnalysis`, `DashboardAnalysisRequest`, `InsufficientData`, `AiUnavailable` |
| `tests/rules/dashboard-analysis.test.ts` | criar |
| `tests/validation/dashboard.test.ts` | alterar |
| `.env.example` | **alterar pelo Yvan**: `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, sem valores; o agente confere pelo hash |

### PR 4, cartão ligado

| Arquivo | Ação |
|---|---|
| `src/components/admin/dashboard/dashboard-analysis-card.tsx` | alterar: sai o `DemoNotice`; números, tabela, ações |
| `src/components/admin/dashboard/analysis-comparison.tsx` | criar: a tabela e o gráfico dos dois períodos (o gráfico carregado sob demanda, decisão 0056) |
| `src/components/admin/dashboard/analysis-text.ts` | criar: monta o texto copiado |
| `src/components/admin/dashboard/dashboard-view.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/globals.css` | alterar: classes de impressão e o tema claro na impressão |
| `src/components/admin/dashboard/README.md` | alterar |
| `src/lib/demo/routes.ts` | alterar: sai a entrada da análise (a lista fica vazia) |
| `tests/format/analysis-text.test.ts` ou o lugar que `tests/README.md` indicar | criar: o texto copiado |

### PR 5, fim da demonstração

| Arquivo | Ação |
|---|---|
| `src/lib/demo/` (`routes.ts`, `match.ts`, `list.ts`, `dashboard.ts`, `README.md`), `src/components/shared/demo-notice.tsx` | remover |
| `src/lib/api-client.ts` | alterar: sai a consulta à lista e `answerDemo` |
| `src/shared/errors/catalog.ts` | alterar: sai `NOT_IMPLEMENTED` |
| `src/lib/README.md`, `src/components/shared/README.md` | alterar |
| `tests/lib/api-client.test.ts`, `tests/lib/README.md`, `tests/README.md` | alterar: sai a simulação da lista (`vi.mock` de `@/lib/demo/routes`, que usa `demoPage` de `list.ts`) e o bloco "apiRequest with demo data" |
| `docs/padroes/api.md`, `componentes.md`, `frontend.md`, `testes.md`, `docs/plataforma/estrutura-de-pastas.md`, `docs/plataforma/openapi.yaml` (se tiver o 501), `docs/agendamento/dashboard-do-painel.md`, `workflows/procedimentos/pull-request.md`, `.github/pull_request_template.md`, `docs/decisoes/0055-telas-de-demonstracao.md` | alterar (L1) |

### PR 6, indicadores detalhados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_dashboard_details_function.sql` | criar, com `npx supabase migration new dashboard_details_function` |
| `src/server/repositories/dashboard.ts` | alterar: `findDashboardDetails` |
| `src/server/rules/dashboard-details.ts` | criar |
| `src/shared/api/dashboard.ts` | alterar: `DashboardDetails` |
| `src/shared/constants/dashboard-sections.ts` | criar: as cinco seções e os rótulos |
| `docs/agendamento/dados.md` | alterar: a função nova |
| `tests/rules/dashboard-details.test.ts` | criar |

### PR 7, análise detalhada no servidor

| Arquivo | Ação |
|---|---|
| `src/server/rules/dashboard-analysis.ts` | alterar: entrada, mensagens, esquema e conferência da detalhada |
| `src/server/services/dashboard.ts`, `src/shared/validation/dashboard.ts`, `src/shared/api/dashboard.ts` | alterar: `detail` |
| `docs/plataforma/openapi.yaml` | alterar: `detail`, `details`, `sections`, `recommendations` |
| `tests/rules/dashboard-analysis.test.ts`, `tests/validation/dashboard.test.ts` | alterar |

### PR 8, análise detalhada na tela

| Arquivo | Ação |
|---|---|
| `src/components/admin/dashboard/dashboard-analysis-card.tsx` | alterar: a escolha do modo, as seções e as sugestões |
| `src/components/admin/dashboard/analysis-sections.tsx` | criar: as seções e os números |
| `src/components/admin/dashboard/analysis-text.ts` | alterar: o texto da detalhada |
| testes do texto copiado | alterar |

### PR 9, motivo do cancelamento

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_cancellation_reason.sql` | criar: o tipo, a coluna e a `dashboard_details` com os motivos |
| `src/shared/constants/cancellation-reasons.ts` | criar: os motivos, os rótulos e os do cliente |
| `src/shared/validation/appointments.ts`, `src/shared/api/appointments.ts` | alterar: `reason` nos dois cancelamentos e no detalhe |
| `src/server/services/appointments.ts`, `src/server/repositories/appointments.ts` | alterar: gravar e ler o motivo |
| `src/app/api/admin/appointments/[id]/cancel/route.ts`, `src/app/api/me/appointments/[id]/cancel/route.ts` e os README | alterar: o corpo |
| `src/components/admin/appointments/appointment-details-dialog.tsx`, `src/components/portal/appointments/appointment-details-dialog.tsx` | alterar: a escolha do motivo e a exibição |
| `src/server/rules/dashboard-details.ts`, `src/server/rules/dashboard-analysis.ts`, `src/components/admin/dashboard/analysis-sections.tsx` | alterar: o indicador, a instrução e os números |
| `supabase/seed-demo.sql`, `docs/plataforma/openapi.yaml` | alterar |
| `tests/validation/appointments.test.ts`, `tests/rules/dashboard-details.test.ts` | alterar |

### PR 10, custo e categoria no servidor

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_service_cost.sql` | criar: as colunas, a nova `save_service` e as funções de agendamento com a cópia do custo e da categoria |
| `src/server/rules/pricing.ts` | alterar: o custo de cada serviço, pelo porte |
| `src/shared/validation/catalog.ts`, `src/shared/api/catalog.ts` | alterar: o custo no cadastro e no detalhe do painel |
| `src/server/services/catalog.ts`, `src/server/services/appointments.ts`, `src/server/repositories/services.ts`, `src/server/repositories/appointments.ts` | alterar |
| `supabase/seed-demo.sql`, `docs/plataforma/openapi.yaml` | alterar |
| `tests/rules/pricing.test.ts`, `tests/validation/catalog.test.ts` | alterar |

### PR 11, custo e margem na tela e na análise

| Arquivo | Ação |
|---|---|
| `src/components/admin/catalog/service-prices-step.tsx`, `service-form-values.ts`, `service-form-resolver.ts` | alterar: os campos de custo |
| `supabase/migrations/<data>_dashboard_details_cost.sql` | criar: a margem e a categoria copiada na `dashboard_details` |
| `src/server/rules/dashboard-details.ts`, `src/server/rules/dashboard-analysis.ts`, `src/components/admin/dashboard/analysis-sections.tsx` | alterar |
| `tests/rules/dashboard-details.test.ts` | alterar |

### PR 12, avaliação do atendimento

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_appointment_reviews.sql` | criar: a tabela e a `dashboard_details` com as notas |
| `src/server/rules/appointment-review.ts` | criar: quem avalia e até quando |
| `src/shared/validation/appointments.ts`, `src/shared/api/appointments.ts`, `src/shared/errors/catalog.ts` | alterar: a nota, o detalhe e `REVIEW_NOT_ALLOWED` |
| `src/server/repositories/appointment-reviews.ts`, `src/server/services/appointments.ts` | criar e alterar |
| `src/app/api/me/appointments/[id]/review/route.ts`, `README.md` | criar |
| `src/components/portal/appointments/appointment-review.tsx`, `appointment-details-dialog.tsx`, `src/components/admin/appointments/appointment-details-dialog.tsx` | criar e alterar |
| `src/server/rules/dashboard-details.ts`, `src/server/rules/dashboard-analysis.ts`, `src/components/admin/dashboard/analysis-sections.tsx` | alterar |
| `supabase/seed-demo.sql`, `docs/plataforma/openapi.yaml` | alterar |
| `tests/rules/appointment-review.test.ts`, `tests/validation/appointments.test.ts`, `tests/rules/dashboard-details.test.ts` | criar e alterar |

### PR 13, ocupação da agenda

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_simultaneous_slots.sql` | criar: a coluna e a `dashboard_details` com a ocupação |
| `src/server/rules/occupancy.ts` | criar: os minutos disponíveis de um período |
| `src/shared/validation/settings.ts`, `src/shared/api/settings.ts` | alterar: `{ days, simultaneousSlots }` |
| `src/server/services/settings.ts`, `src/server/repositories/business-hours.ts`, `src/server/repositories/business-settings.ts`, `src/app/api/admin/settings/business-hours/route.ts` | alterar |
| `src/components/admin/settings/availability-form.tsx`, `availability-values.ts` | alterar: o campo |
| `src/server/rules/dashboard-details.ts`, `src/server/rules/dashboard-analysis.ts`, `src/components/admin/dashboard/analysis-sections.tsx` | alterar |
| `supabase/seed-demo.sql`, `docs/plataforma/openapi.yaml` | alterar |
| `tests/rules/occupancy.test.ts`, `tests/validation/settings.test.ts`, `tests/rules/dashboard-details.test.ts` | criar e alterar |

O README de cada pasta tocada muda junto, quando a função dela mudar.

A pasta `memoria/tarefas/66-analise-por-ia/` (numeração anterior) não muda.

## Testes previstos

Escritos antes do código e vistos falhar, num commit próprio em cada PR de regras (decisões 0035 e 0052). Sem banco, servidor, navegador nem rede.

`tests/rules/dashboard-analysis.test.ts` (PR 3):

- finds the previous period by the calendar (L18): 2026-10-01 a 2026-10-31 → 2026-09-01 a 2026-09-30; 2026-01-01 a 2026-12-31 → 2025-01-01 a 2025-12-31; 2028-03-01 a 2028-03-31 → 2028-02-01 a 2028-02-29; um dia, 2026-10-21 → 2026-10-20; sete dias, 2026-10-15 a 2026-10-21 → 2026-10-08 a 2026-10-14; a virada do ano por dias, 2026-01-01 a 2026-01-07 → 2025-12-25 a 2025-12-31
- cuts a period that ends after today and compares the same days: hoje 2026-11-18, 2026-11-01 a 2026-11-30 → analisado até 2026-11-18, com 2026-10-01 a 2026-10-18; hoje 2027-03-30, 2027-03-01 a 2027-03-31 → com 2027-02-01 a 2027-02-28
- calculates the variation over the previous value: 10.000,00 → 12.500,00 = 25,0; 80 → 60 = −25,0; 3 → 4 = 33,3; anterior zero = `null`; taxa de cancelamento 10,0 → 15,0 = 5,0 pontos
- builds the comparison of the four indicators, with no previous values when the previous period has no appointments
- builds the revenue series by day up to 62 days and in blocks of seven days above it: 62 dias → 62 posições; 63 dias → 9 blocos, o último de 7; 366 dias → 53 blocos, o último de 2; os dois períodos alinhados por posição
- builds the input only with aggregated values: sem agenda, nome, e-mail, telefone, placa nem identificador, e o JSON da entrada não contém esses valores
- uses the status labels of RN017 in the input: `completed` → "Concluído"
- sends the fixed instructions and the input as JSON, with the prompt version of the mode
- accepts a valid summary analysis, with repeated spaces removed; rejects a response that is not JSON, a summary out of 1 to 600 characters, more than four highlights, an unknown indicator or a comment over 240 characters → `"INVALID_RESPONSE"`; rejects digits → `"NUMBERS_IN_TEXT"`; discards unknown fields

`tests/rules/dashboard-details.test.ts` (PR 6):

- keeps the five services with the largest value and sums the others as "Demais"
- calculates the share of paid appointments with a complementary or additional service, half up with two places: 1 de 3 = 33,33
- fills the seven weekdays and the hours with zero
- separates the payment surcharges from the discounts
- counts new and returning clients as RN040 defines (L4)
- gives zero rates, not a division error, in a period with no paid appointments

`tests/rules/dashboard-analysis.test.ts` (PR 7), casos novos:

- builds the detailed input with the details of RN040 and no personal data
- accepts a valid detailed analysis with the five sections, from one to three observations each, and up to four recommendations; rejects an unknown or repeated section, four observations in a section, five recommendations, texts over 240 characters → `"INVALID_RESPONSE"`; digits anywhere → `"NUMBERS_IN_TEXT"`

`tests/validation/dashboard.test.ts` (PR 3 e PR 7): as duas datas obrigatórias; período invertido ou acima de 366 dias; `detail` ausente vira `summary`; `detail` desconhecido → "Escolha um tipo de análise válido."

Texto copiado (PR 4 e PR 8): o período, os números formatados como RN035 e a nota de IA, na ordem da tela.

Dados novos (PRs 6 e 9 a 13):

- `tests/rules/dashboard-details.test.ts`: antecedência média com uma casa e as faixas (no mesmo dia, de 1 a 3 dias, de 4 a 7, mais de 7); motivos, com os sem motivo como "Não informado"; margem só com os pagos de custo informado, a contagem dos sem custo e o percentual com duas casas; categoria copiada e, sem cópia, a atual; avaliação média com duas casas e a quantidade de cada nota; ocupação com duas casas, acima de 100% quando passa, e sem cálculo sem minutos disponíveis
- `tests/validation/appointments.test.ts`: o motivo é obrigatório e da lista nos dois cancelamentos; o do cliente recusa "Não comparecimento" e "Indisponibilidade da empresa" → "Escolha um motivo da lista."; a nota é inteira, de 1 a 5 → "Escolha uma nota de 1 a 5."
- `tests/rules/pricing.test.ts`: o custo do porte no serviço por porte, o fixo no de valor fixo, nulo quando não informado, e o total e o subtotal sem mudança
- `tests/validation/catalog.test.ts`: custo opcional, de zero a R$ 99.999,99, na mesma forma do preço
- `tests/rules/appointment-review.test.ts`: aceita Concluído e Reagendado do próprio cliente; recusa outro status, já avaliado e depois de 30 dias da conclusão (30º dia aceita, 31º recusa, no fuso da empresa)
- `tests/rules/occupancy.test.ts`: os minutos de funcionamento de um dia, com e sem pausa, e de um dia fechado; um período de vários dias pela disponibilidade de cada dia da semana; vezes os atendimentos simultâneos
- `tests/validation/settings.test.ts`: `simultaneousSlots` inteiro de 1 a 20 → "Informe de 1 a 20 atendimentos simultâneos."

A função `dashboard_details`, as migrations, as rotas, o adaptador e as telas são conferidos à mão (decisão 0052), com SQL no banco local e o provedor simulado.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se você escolher outra, ele é refeito antes da construção.

### L1. O que fica da decisão 0055 depois da última rota de demonstração

**Problema.** A 0055 manda remover `src/lib/demo/`, o `NOT_IMPLEMENTED` e o `DemoNotice` com a última rota, mas `componentes.md`, `api.md`, `frontend.md`, `testes.md`, `estrutura-de-pastas.md`, `pull-request.md` e o modelo de PR descrevem o mecanismo, e os registros só têm os status `aceita` e `substituída por NNNN`.

**Opções:**

- [x ] **1. Tirar o mecanismo dos textos e manter a 0055 como histórico, com a seção "Encerramento" (recomendada).** Sem status novo.
- [ ] **2. Como a 1, com o status novo `encerrada`.** Deixa claro no índice, mas cria um status que `_templates/decisao.md` e `docs/decisoes/CONTEXT.md` precisariam descrever.

**Texto proposto (opção 1), no PR 5:**

- `docs/decisoes/0055-telas-de-demonstracao.md`, seção nova "Encerramento": "A última rota de demonstração, `POST /api/admin/dashboard/analysis`, foi construída na issue #1. `src/lib/demo/`, o código `NOT_IMPLEMENTED` e o `DemoNotice` foram removidos, e o cliente da API volta a falar só com a rede. A decisão fica como registro de como as telas foram construídas."
- Saem: a seção "Telas de demonstração" de `componentes.md`; a linha 501 e a frase do `NOT_IMPLEMENTED` de `api.md`; `demo/` e a linha "Rota ainda não construída" de `frontend.md`; o trecho das rotas de demonstração do cliente da API em `testes.md`; `demo/` de `estrutura-de-pastas.md`; a seção da 0055 de `pull-request.md` e o item do modelo de PR; a frase do aviso em `dashboard-do-painel.md`.

### L2. Modos resumido e detalhado

**Problema.** UC27 e RN039 descrevem um formato só: resumo e até quatro observações.

**Opções:**

- [ x] **1. Dois modos; a detalhada com cinco seções fixas e sugestões (recomendada).** Formato conferível (lista fechada de seções, limites de tamanho) e números do sistema por seção. A detalhada gasta cerca de três vezes mais tokens.
- [ ] **2. Detalhada em texto livre, mais longo.** Mais simples, mas sem como conferir a estrutura nem ligar o texto aos números.

**Texto proposto (opção 1), no PR 1:**

- `requisitos.md`, novo: "| RF091 | O sistema deve permitir ao funcionário escolher, antes de gerar a análise, entre uma análise resumida e uma detalhada, que inclui os indicadores de serviços, clientes, veículos, operação e pagamentos do período (RN040). | Desejável |"
- RN039 passa a: "A análise só interpreta os valores recebidos: não calcula nem apresenta números, que são sempre os exibidos pelo sistema, e nenhuma ação é executada a partir dela. A resumida tem um resumo de até 600 caracteres e até quatro observações de até 240 caracteres, cada uma ligada a um indicador. A detalhada tem, além do resumo e das observações, cinco seções (Receita, Serviços, Clientes e veículos, Operação e Pagamentos), cada uma com uma a três observações de até 240 caracteres, e até quatro sugestões de até 240 caracteres, apresentadas como hipóteses a avaliar. Todo o texto é em português do Brasil e sem algarismos. A resposta fora desse formato é descartada, e a análise é tratada como não gerada."
- `rotas.md`: `detail` (`summary`, o padrão, ou `detailed`) na entrada e os campos novos da resposta (seção "Contrato da API" deste plano); `mensagens-de-validacao.md`: "Escolha um tipo de análise válido." para `detail` desconhecido.
- UC27, passo 1: "O funcionário escolhe a análise resumida ou a detalhada e solicita a análise do período exibido."; passo 2: "... do período e do período anterior (RN038) e, na detalhada, os indicadores de RN040."

### L3. Indicadores da análise detalhada (RN040)

**Problema.** RN021 só define quatro indicadores, a receita por dia e os status. A análise detalhada precisa de indicadores que nenhum documento define.

**Opções:**

- [x ] **1. Os doze grupos abaixo, todos agregados (recomendada).** Cobrem o que o banco já guarda; nenhum identifica cliente, veículo ou funcionário. Exigem uma função nova no banco (PR 6).
- [ ] **2. Só serviços, pagamentos e clientes.** Menos trabalho, análise mais pobre.

**Texto proposto (opção 1):** `docs/agendamento/RN040-indicadores-da-analise-detalhada.md` (tema Indicadores), com a seção 7 de `calculos.md` repetindo as fórmulas:

"A análise detalhada usa, além de RN038, os indicadores abaixo, calculados pelo sistema no fuso da empresa. "Agendamentos do período" são os de data marcada no período, em qualquer status; "pagos do período" são os Concluído e Reagendado com a conclusão no período, como em RN021. Taxas e médias têm duas casas, com meio centavo para cima (RN012).

1. Serviços: os cinco serviços de maior valor nos pagos do período, pela soma do preço de cada serviço no agendamento, com a quantidade, e os demais somados como "Demais".
2. Categorias: o valor e a quantidade dos serviços dos pagos do período por categoria (L5).
3. Complementos: o percentual dos pagos do período com ao menos um serviço complementar ou adicional.
4. Veículos: os agendamentos do período por tipo e por porte do veículo, e o ticket médio dos pagos por porte.
5. Pagamentos: a quantidade e a receita dos pagos do período por forma de pagamento, e a soma dos acréscimos e a dos descontos (diferença entre o total e o subtotal).
6. Canal: os agendamentos do período registrados pelo próprio cliente e os registrados pelo painel.
7. Clientes: os clientes com agendamento no período, separados em novos e recorrentes (L4).
8. Retornos: os agendamentos do período que são reagendamento de um serviço concluído (RN020).
9. Dias da semana: os agendamentos e os cancelados do período pela data marcada, e a receita dos pagos pela data de conclusão, de segunda a domingo.
10. Horários: os agendamentos do período pela hora de início.
11. Cancelamentos: os cinco serviços mais presentes nos cancelados do período, com a quantidade.
12. Em aberto: a quantidade e a soma do total dos agendamentos do período em Agendado, Em espera, Em execução e Finalizado.

Os indicadores 3, 6, 7 e 8 vão também com o valor do período anterior e a variação. Nomes de clientes, placas, funcionários e identificadores nunca entram; os nomes de serviços e de categorias são do catálogo público."

- `requisitos.md`: RF091 (L2) cita RN040.

### L4. Cliente novo

**Problema.** Nada define cliente novo ou recorrente.

**Opções:**

- [ x] **1. Novo é o cliente cujo primeiro agendamento, em qualquer status, tem a data marcada no período (recomendada).** Mede quem chegou ao negócio no período, inclusive quem cancelou; uma consulta simples sobre `appointments`.
- [ ] **2. Novo é o cliente cujo primeiro agendamento concluído foi no período.** Mede quem foi atendido pela primeira vez, mas ignora quem marcou e não veio.

**Texto proposto (opção 1):** RN040, item 7: "Novo é o cliente cujo primeiro agendamento, em qualquer status, tem a data marcada no período; recorrente, o que já tinha agendamento antes dele."

### L5. Categoria dos serviços nos indicadores

**Problema.** O agendamento copia o nome, o tipo e o preço do serviço (RN037), mas não a categoria; a categoria de hoje pode não ser a da época.

**Opções:**

- [ x] **1. Usar a categoria atual do serviço, com a ressalva escrita (recomendada).** Sem migration de cópia; a troca de categoria é rara.
- [ ] **2. Copiar a categoria no agendamento.** Exata, mas muda RN037, a tabela `appointment_services`, as funções de gravação e os dados antigos.
- [ ] **3. Sem o indicador de categorias.**

**Texto proposto (opção 1):** RN040, item 2: "... por categoria, pela categoria atual do serviço: a categoria não é copiada no agendamento (RN037), então a troca de categoria de um serviço muda também os períodos anteriores."

### L6. Receita em períodos longos

**Problema.** Em 12 meses, a receita por dia leva 366 itens à IA, cerca de 5,5 mil tokens, perto do limite de 8 mil por minuto, e a comparação por dia fica ilegível no gráfico.

**Opções:**

- [x ] **1. Por dia até 62 dias; acima, em blocos de sete dias a partir da data inicial (recomendada).** Os dois períodos ficam alinhados, porque têm a mesma duração; 12 meses viram 53 blocos.
- [ ] **2. Semanas do calendário (segunda a domingo) ou meses.** Mais familiar, mas a primeira e a última ficam parciais e não se alinham entre os dois períodos.

**Texto proposto (opção 1):** RN038: "... a receita por dia, em períodos de até 62 dias, ou por blocos de sete dias contados a partir da data inicial, nos mais longos, para o período e o anterior; ..."; `calculos.md`, seção 6, com os exemplos dos testes; `servico-de-ia.md`, os novos tamanhos.

### L7. Números do sistema junto da análise

**Problema.** RN039 proíbe algarismos no texto, e `dashboard-do-painel.md` deixa fora da tela "a variação em relação ao período anterior nos cartões (a rota não devolve o período anterior)".

**Opções:**

- [ x] **1. O valor e a variação ao lado de cada observação, a tabela "Este período × período anterior" e o gráfico da receita dos dois períodos, dentro do cartão da análise (recomendada).** O texto continua sem números, e cada afirmação fica ao lado do valor que a sustenta. Os cartões dos indicadores não mudam.
- [ ] **2. Só o valor ao lado de cada observação.** Menos tela, sem visão da comparação.
- [ ] **3. A variação também nos cartões dos indicadores.** Exige o período anterior no `GET /api/admin/dashboard`, outra rota a mudar.

**Texto proposto (opção 1):**

- `requisitos.md`, novo: "| RF092 | O sistema deve exibir, junto à análise, os valores calculados pelo sistema a que cada observação se refere, a comparação dos indicadores com o período anterior e a receita dos dois períodos em gráfico. | Desejável |"
- `dashboard-do-painel.md`, seção "Análise do período": o texto da subseção "Tela" deste plano; em "Fora da tela", a frase passa a "... e a variação em relação ao período anterior nos cartões dos indicadores (ela aparece só na análise)."

### L8. Copiar e exportar a análise

**Problema.** Nada prevê copiar ou exportar a análise.

**Opções:**

- [ x] **1. "Copiar análise" (texto) e "Imprimir ou salvar em PDF" pela impressão do navegador (recomendada).** Nenhuma dependência; o PDF sai com os gráficos, que são SVG; o estilo de impressão esconde o que não é do relatório. Consequência: o leiaute do PDF depende do navegador.
- [ ] **2. A opção 1 e "Baixar texto" (`.txt`).** Um arquivo a mais, com o mesmo conteúdo do copiado.
- [ ] **3. PDF gerado por biblioteca (`jsPDF`, `@react-pdf/renderer`) ou no servidor.** Leiaute fixo, mas dependência nova, os gráficos redesenhados e, no servidor, um navegador sem interface na função da Vercel.

**Texto proposto (opção 1):**

- `requisitos.md`, novos: "| RF093 | O sistema deve permitir copiar o texto da análise, com o período, os valores do sistema e a identificação de que foi gerada por inteligência artificial. | Desejável |" e "| RF094 | O sistema deve permitir imprimir ou salvar em PDF o dashboard com a análise, sem a navegação, os controles e a agenda do dia. | Desejável |"
- UC27: "FA04 – Copiar a análise (passo 5): o funcionário copia a análise; o sistema leva o texto à área de transferência e confirma a cópia." e "FA05 – Imprimir a análise (passo 5): o funcionário pede a impressão; o sistema abre a impressão do navegador com o período, os indicadores, a análise e os gráficos."
- Decisão 0057 (seção "Decisões técnicas").

### L9. Versão das instruções e avaliação da análise

**Problema.** `servico-de-ia.md` não diz como saber qual versão das instruções gerou um texto nem como avaliar a qualidade das respostas quando as instruções ou o modelo mudam; os testes nunca chamam o provedor.

**Opções:**

- [ x] **1. Versão das instruções no registro e na resposta, e um roteiro de avaliação manual na pré-visualização (recomendada).** Sem custo nos testes automáticos; a avaliação roda quando as instruções ou o modelo mudam.
- [ ] **2. Avaliação automática no CI.** Contraria "os testes nunca chamam o provedor", exige a chave no CI e gasta a cota.

**Texto proposto (opção 1):**

- `servico-de-ia.md`, seção nova "Versão das instruções e avaliação": "As instruções de cada modo têm uma versão no código (`resumida-1`, `detalhada-1`), que volta na resposta e vai à linha `info` do registro. Mudar as instruções ou o modelo pede uma versão nova e a avaliação de `workflows/procedimentos/testes.md`."
- `workflows/procedimentos/testes.md`, seção nova "Avaliação da análise por IA": "Na pré-visualização, com o `seed-demo.sql`, o desenvolvedor gera os dois modos em seis períodos: o mês atual, o anterior, os últimos 7 dias, um dia, 12 meses e um período sem anterior. Para cada um, anota se foi gerada, o motivo da recusa, a duração e os tokens do registro, e confere: nenhuma afirmação contradiz os números da tela, causas aparecem só como hipótese e o português está correto. O resultado vai ao relatório da tarefa."

### L10. Antecedência dos agendamentos

**Problema.** O plano listava a antecedência como dado que o sistema não guarda, por engano: `appointments.created_at` existe, e o `seed-demo.sql` já a preenche (`notas.md`). RN040 não a inclui.

**Opções:**

- [ x] **1. Incluir em RN040 a antecedência média e a distribuição por faixa (recomendada).** Sem migration de coluna; mostra se os clientes marcam em cima da hora.
- [ ] **2. Não incluir.**

**Texto proposto (opção 1):** RN040, item novo: "13. Antecedência: a média, em dias com uma casa, entre a data do registro e a data marcada dos agendamentos do período, pelas datas de calendário no fuso da empresa, e a quantidade em cada faixa: no mesmo dia, de 1 a 3 dias, de 4 a 7 dias e mais de 7 dias." Com L10 a L15, a frase de RN040 "Os indicadores 3, 6, 7 e 8 vão também com o valor do período anterior e a variação." passa a "Os indicadores 3, 6, 7, 8, 13 (a média), 15 (o percentual da margem), 16 (a média) e 17 vão também com o valor do período anterior e a variação.", com os itens que forem aprovados.

### L11. Motivo do cancelamento

**Problema.** RN019 não pede motivo, e o sistema não o guarda.

**Opções:**

- [ x] **1. Lista fechada, obrigatória nos cancelamentos novos, com motivos por ator (recomendada).** Conferível, sem texto livre (que não poderia ir à IA, RS020); os cancelamentos antigos ficam como "Não informado".
- [ ] **2. Lista e um texto livre em "Outro".** Mais detalhe, mas o texto fica fora da análise e precisa de limite e de exibição.
- [ ] **3. Sem motivo.**

**Texto proposto (opção 1):**

- `docs/agendamento/RN041-motivo-do-cancelamento.md` (tema Status): "Todo cancelamento registra um motivo, escolhido numa lista fechada: Desistência do cliente, Imprevisto do cliente, Condições do tempo, Não comparecimento, Indisponibilidade da empresa e Outro. O cliente escolhe entre Desistência do cliente, Imprevisto do cliente, Condições do tempo e Outro; o funcionário, entre todos. O motivo não muda depois do cancelamento e aparece no detalhe do agendamento cancelado. Os cancelamentos anteriores a esta regra não têm motivo e aparecem como "Não informado"."
- RN019, frase nova no fim: "O cancelamento registra o motivo (RN041)."
- `requisitos.md`: "| RF095 | O sistema deve exigir, no cancelamento de um agendamento, a escolha do motivo, e exibi-lo no detalhe do agendamento cancelado (RN041). | Desejável |"
- UC07 FA01 e o cancelamento do UC12: "o cliente (o funcionário) escolhe o motivo e confirma o cancelamento".
- RN040, item novo: "14. Motivos de cancelamento: os cancelados do período por motivo, com "Não informado" para os sem motivo."
- `mensagens-de-validacao.md`: "Motivo do cancelamento ausente ou fora da lista | Escolha um motivo da lista."
- Telas: no diálogo "Cancelar agendamento", o campo "Motivo do cancelamento" (lista, obrigatório) antes do botão de confirmar; no detalhe do cancelado, "Motivo: <rótulo>".

### L12. Custo dos insumos e margem

**Problema.** O sistema não guarda custo, então não há margem; a gestão financeira está fora do MVP (`visao-geral.md`).

**Opções:**

- [ x] **1. Custo dos insumos por serviço, na mesma forma do preço, opcional, copiado no agendamento; margem bruta só com os pagos de custo informado (recomendada).** Mede o que cada serviço deixa sem entrar no financeiro (aluguel, salários).
- [ ] **2. Custo como um percentual do preço por serviço.** Mais simples, menos real: o insumo de um porte maior não cresce na mesma proporção do preço.
- [ ] **3. Despesas gerais da empresa.** É o módulo financeiro, fora do MVP.

**Texto proposto (opção 1):**

- `docs/catalogo/RN042-custo-dos-insumos.md` (tema Precificação): "O custo dos insumos de um serviço é o valor estimado dos produtos e materiais gastos em um atendimento, informado no cadastro do serviço na mesma forma do preço (RN009): um valor no serviço de valor fixo e um por porte no serviço por porte. É opcional, de zero a R$ 99.999,99. Ao registrar, editar ou reagendar um agendamento, o custo de cada serviço é copiado, como o preço (RN037). A margem bruta de um período é a receita dos pagos (RN021) menos a soma dos custos copiados nos serviços deles, contando só os pagos com o custo de todos os serviços informado; os outros são contados à parte, como "sem custo informado". A margem não inclui despesas gerais, como aluguel e salários."
- `docs/plataforma/visao-geral.md`, "Fora do escopo do MVP": "gestão financeira além do valor e da forma de pagamento de cada agendamento" passa a "gestão financeira além do valor, da forma de pagamento e do custo dos insumos de cada agendamento".
- `docs/catalogo/requisitos.md`: "| RF096 | O sistema deve permitir informar, no cadastro do serviço, o custo estimado dos insumos de um atendimento, por porte quando o preço for por porte (RN042). | Desejável |"
- `docs/plataforma/seguranca.md`: "| RS021 | Dados internos | O custo dos insumos dos serviços é dado interno da empresa e não deve ser enviado ao catálogo público nem à área do cliente. | As rotas públicas e as do cliente não selecionam as colunas de custo, e os tipos das respostas delas não têm o campo; o custo aparece só no cadastro do serviço no painel e na análise do dashboard. |"
- RN037: a cópia passa a incluir "o custo e o nome da categoria de cada serviço" (com L13).
- UC13 e UC14: o passo dos valores inclui o custo dos insumos, opcional.
- RN040, item novo: "15. Margem: a receita dos pagos com custo informado, a soma dos custos, a margem bruta (diferença) e o percentual dela sobre essa receita, e a quantidade de pagos sem custo informado (RN042)."
- `mensagens-de-validacao.md`: "Custo dos insumos | Informe um custo de R$ 0,00 a R$ 99.999,99."
- Tela do serviço: na etapa dos valores, "Custo dos insumos (opcional)" ao lado de cada valor, com a ajuda "Produtos e materiais gastos em um atendimento. Não aparece para o cliente."

### L13. Categoria copiada no agendamento

**Problema.** A L5 aprovou usar a categoria atual, porque o agendamento não copia a categoria. O PR 10 já muda as funções de agendamento para copiar o custo; copiar o nome da categoria junto custa pouco.

**Opções:**

- [x ] **1. Copiar o nome da categoria no agendamento; nos agendamentos anteriores à cópia, usar a categoria atual (recomendada).** A análise por categoria fica fiel à época.
- [ ] **2. Manter a L5 (só a categoria atual).**

**Texto proposto (opção 1):** RN040, item 2 passa a "Categorias: o valor e a quantidade dos serviços dos pagos do período por categoria, pelo nome da categoria copiado no agendamento (RN037); nos registrados antes da cópia, pela categoria atual do serviço."; `dados.md`, `appointment_services.category_name`: "Cópia do nome da categoria do serviço; vazia nos serviços sem categoria e nos agendamentos anteriores à cópia."

### L14. Avaliação do atendimento

**Problema.** O sistema não tem avaliação do cliente; o wireframe do dashboard tem "Avaliação média", deixado fora por não ter requisito.

**Opções:**

- [ x] **1. Nota de 1 a 5, sem comentário, uma vez por atendimento, até 30 dias depois da conclusão, dada pelo cliente e vista no detalhe nos dois lados (recomendada).** Simples de capturar e de conferir; nenhum texto livre.
- [ ] **2. Nota e comentário.** Mais rico, mas o comentário é texto livre do cliente: não vai à IA (RS020) e pede limite, exibição e cuidado com dado pessoal.
- [ ] **3. Sem avaliação.**

**Texto proposto (opção 1):**

- `docs/agendamento/RN043-avaliacao-do-atendimento.md` (tema Status): "O cliente pode avaliar, uma única vez, cada atendimento seu com o status Concluído ou Reagendado, com uma nota inteira de 1 a 5, até 30 dias depois da conclusão, contados pelas datas de calendário no fuso da empresa. A nota não pode ser alterada nem excluída e não tem comentário. Ela aparece no detalhe do agendamento, para o cliente e para o funcionário."
- `docs/agendamento/UC28-avaliar-atendimento.md` (ator Cliente; RF097; RN043): pré-condições: o cliente está autenticado, e o atendimento é dele, Concluído ou Reagendado, sem avaliação e com a conclusão há no máximo 30 dias. Fluxo: 1. O cliente abre o detalhe do atendimento no histórico. 2. O sistema exibe "Como foi o atendimento?", com as notas de 1 a 5. 3. O cliente escolhe a nota e envia. 4. O sistema grava a nota e a exibe no detalhe. FE01 – Avaliação indisponível (passo 3): o atendimento já foi avaliado ou o prazo terminou; o sistema informa e não grava.
- `requisitos.md`: "| RF097 | O sistema deve permitir ao cliente avaliar, com uma nota de 1 a 5, um atendimento concluído, e exibir a nota no detalhe do agendamento, no portal e no painel (RN043). | Desejável |"
- `rotas.md`: "`POST /api/me/appointments/:id/review`: entrada `rating*` (inteiro de 1 a 5); resposta 201 com o agendamento do cliente e a nota; 404 agendamento inexistente ou de outro cliente; 409 `REVIEW_NOT_ALLOWED`."
- `api.md`: "| 409 | `REVIEW_NOT_ALLOWED` | Este atendimento não pode mais ser avaliado. |"
- RN040, item novo: "16. Avaliação: a média das notas, com duas casas, e a quantidade de cada nota dos atendimentos concluídos no período, pela data de conclusão."
- `mensagens-de-validacao.md`: "Nota da avaliação | Escolha uma nota de 1 a 5."

### L15. Ocupação da agenda

**Problema.** RN016 e a decisão 0014 deixam o MVP sem controle de capacidade, e o sistema não sabe quantos atendimentos a empresa faz ao mesmo tempo.

**Opções:**

- [x ] **1. Número de atendimentos simultâneos nas configurações, só para medir a ocupação, sem bloquear agendamentos (recomendada).** RN016 e a decisão 0014 continuam valendo.
- [ ] **2. Controle de capacidade, recusando o agendamento acima das vagas.** Contraria a decisão 0014 e muda o agendamento inteiro.
- [ ] **3. Sem ocupação.**

**Texto proposto (opção 1):**

- `docs/configuracoes/RN044-ocupacao-da-agenda.md` (tema Disponibilidade): "A ocupação da agenda de um período é a soma da duração estimada dos agendamentos com a data marcada no período, exceto os cancelados, sobre os minutos disponíveis: para cada dia do período, os minutos de funcionamento do dia da semana na disponibilidade atual, sem a pausa (RN013), vezes o número de atendimentos simultâneos configurado, de 1 a 20. É informativa: não limita agendamentos (RN016) e pode passar de 100%. O percentual tem duas casas; sem minutos disponíveis, não é calculada. Como a disponibilidade não guarda histórico, um período passado é medido pela disponibilidade atual."
- `docs/configuracoes/requisitos.md`: "| RF098 | O sistema deve permitir definir o número de atendimentos simultâneos da empresa, de 1 a 20, usado só para medir a ocupação da agenda (RN044). | Desejável |"
- UC23: "o funcionário informa também o número de atendimentos simultâneos".
- `docs/configuracoes/rotas.md`: `GET` e `PUT /api/admin/settings/business-hours` passam a `{ days, simultaneousSlots }`, com `days` na forma da lista de hoje.
- RN040, item novo: "17. Ocupação: a ocupação da agenda do período (RN044)."
- `mensagens-de-validacao.md`: "Atendimentos simultâneos | Informe de 1 a 20 atendimentos simultâneos."
- Tela: na aba Disponibilidade, "Atendimentos simultâneos", com a ajuda "Quantos veículos a equipe atende ao mesmo tempo. Serve só para medir a ocupação da agenda; não limita os agendamentos."

### L16. Registro do fim da demonstração

**Problema.** A L1 aprovou uma seção "Encerramento" na decisão 0055, mas `_templates/decisao.md` só permite, num registro existente, trocar o status para `substituída por NNNN` (`notas.md`).

**Opções:**

- [ x] **1. Decisão nova 0058, que substitui a 0055 (recomendada).** Cabe no molde: a 0055 recebe só o status; a 0058 registra a remoção. Substitui o texto proposto na L1 para a 0055; o resto da L1 continua.
- [ ] **2. Manter a L1 (seção "Encerramento" na 0055).**

**Texto proposto (opção 1):** `docs/decisoes/0058-fim-das-telas-de-demonstracao.md`: Decisão: "As telas usam só as rotas reais. `src/lib/demo/`, o código `NOT_IMPLEMENTED` e o `DemoNotice` foram removidos com a última rota de demonstração, `POST /api/admin/dashboard/analysis` (issue #1), e o cliente da API volta a falar só com a rede." Alternativa descartada: "Manter o mecanismo para telas futuras." Justificativa: "A 0055 previa a remoção com a última rota; uma tela nova nasce junto com a rota dela, e o mecanismo sem uso seria código morto no cliente da API." A 0055 passa a `status: substituída por 0058`.

### L17. Lugar da função do texto copiado

**Problema.** O plano põe a função do texto copiado em `src/components/admin/dashboard/`, mas a decisão 0052 testa as funções de exibição de `src/shared/format/`, não código de `src/components/` (`notas.md`).

**Opções:**

- [ x] **1. `src/shared/format/analysis-text.ts`, com `tests/format/analysis-text.test.ts` (recomendada).** Testada como as outras funções de exibição.
- [ ] **2. Em `src/components/admin/dashboard/`, conferida à mão.**

**Texto proposto (opção 1):** nenhum texto de `docs/`; só o lugar do arquivo nos PRs 4 e 8.

### L18. Período de comparação pelo calendário e até o dia corrente

**Problema.** RN038 e `calculos.md`, seção 6 (já na `main`), comparam com um período de mesma quantidade de dias terminado no dia anterior: outubro inteiro (01/10 a 31/10) é comparado com 31/08 a 30/09, e não com setembro. E o período "Este mês", padrão do dashboard, vai até o último dia do mês: no dia 18, a análise compararia um mês pela metade com o mês anterior inteiro e apontaria uma queda que não existe. O relatório que o Yvan descreveu compara o dia com o dia anterior, o mês com o mês anterior e o ano com o ano anterior, como faria o analista da empresa.

**Opções:**

- [ ] **1. Comparação pelo calendário, até o dia corrente (recomendada).**
  - Período de meses inteiros do calendário (do dia 1 ao último dia de um mês: "Este mês", um trimestre, um ano) → os mesmos meses imediatamente anteriores: outubro com setembro; 2026 inteiro com 2025.
  - Outros períodos → a mesma quantidade de dias, terminando no dia anterior à data inicial: hoje com ontem; os últimos 7 dias com os 7 anteriores.
  - Período que termina depois do dia corrente → é analisado até o dia corrente, e o anterior, pelos mesmos dias: em 18/11/2026, "Este mês" compara 01/11 a 18/11 com 01/10 a 18/10; o dia que não existe no mês anterior passa ao último dia dele. Os agendamentos em aberto (RN040, item 12) continuam contando o período inteiro exibido, o que ainda está por vir.
  - Consequências: a tabela, o gráfico e o texto copiado mostram as datas dos dois períodos ("01/11 a 18/11 × 01/10 a 18/10"); os cartões dos indicadores do dashboard continuam com o período inteiro.
- [ ] **2. Manter a mesma quantidade de dias (RN038 atual).** Simples, mas o mês não compara com o mês anterior, e o mês em andamento compara com um mês inteiro.

**Texto proposto (opção 1), no PR 1:**

- RN038: "os do período anterior, de mesma quantidade de dias e terminado no dia anterior à data inicial" passa a "os do período anterior: num período de meses inteiros do calendário, os mesmos meses imediatamente anteriores (outubro com setembro; um ano com o ano anterior); nos demais, a mesma quantidade de dias, terminando no dia anterior à data inicial (um dia com o dia anterior). O período que termina depois do dia corrente é analisado até ele, e o anterior, pelos mesmos dias (em 18/11, 01/11 a 18/11 com 01/10 a 18/10); o dia que não existe no mês anterior passa ao último dia dele".
- `calculos.md`, seção 6, "Período anterior": os exemplos passam a 01/10/2026 a 31/10/2026 → 01/09/2026 a 30/09/2026; 01/01/2026 a 31/12/2026 → 01/01/2025 a 31/12/2025; 01/03/2028 a 31/03/2028 → 01/02/2028 a 29/02/2028; 21/10/2026 → 20/10/2026; 15/10/2026 a 21/10/2026 → 08/10/2026 a 14/10/2026; em 18/11/2026, 01/11/2026 a 30/11/2026 → analisado de 01/11 a 18/11, com 01/10 a 18/10; em 30/03/2027, 01/03/2027 a 31/03/2027 → 01/03 a 30/03, com 01/02 a 28/02.
- `calculos.md`, seção 6, "Série da receita": "O período e o anterior têm a mesma duração e se alinham por posição" passa a "O período e o anterior se alinham por posição; quando o anterior é mais curto (setembro diante de outubro), as últimas posições dele ficam vazias" (muda também o texto aprovado na L6).
- `rotas.md`: a resposta ganha `analyzedTo` (o último dia analisado, que é `to` ou o dia corrente, o que vier antes).
- `dashboard-do-painel.md` e o texto copiado: "Comparado com 01/09/2026 a 30/09/2026"; no período em andamento, "Analisado até 18/11/2026, comparado com 01/10/2026 a 18/10/2026".
- Issue #1, critério de aceitação: "os de 31/08/2026 a 30/09/2026" passa a "os de 01/09/2026 a 30/09/2026" (com a atualização do corpo, ponto 6).

## Decisões técnicas

- Seguidas: 0003, 0005 e 0036 (camadas, permissão na API, `src/server/ai/`); 0008 (esquema em `src/shared/validation/`); o padrão da `dashboard_figures`, da #51 (agregação no banco por função só de leitura, sem decisão própria); 0017; 0025 e 0026; 0029; 0030 e 0054; 0035 e 0052; 0042 (função sem privilégio público); 0043 (banco local); 0053; 0056 (Recharts sob demanda); 0014 e RN016, que continuam valendo com a ocupação só informativa (L15); 0055, substituída pela 0058 (L16).

| Decisão proposta | Alternativas descartadas | Justificativa | Nova ou substitui |
|---|---|---|---|
| 0058 (L16): as telas usam só as rotas reais; `src/lib/demo/`, `NOT_IMPLEMENTED` e `DemoNotice` são removidos; substitui a 0055 | manter o mecanismo para telas futuras | a 0055 previa a remoção com a última rota; tela nova nasce com a rota | substitui 0055 |
| 0057: a análise é exportada pela impressão do navegador, com estilo de impressão, e copiada como texto simples pela área de transferência; sem biblioteca de PDF | `jsPDF` ou `@react-pdf/renderer` (dependência nova e gráficos redesenhados); PDF no servidor com navegador sem interface (pesado na função da Vercel); arquivo `.txt` (L8, opção 2) | Sem dependência; o PDF sai do que a tela já mostra, com os gráficos SVG; o mesmo estilo serve a qualquer relatório futuro do painel. Aceito: o leiaute do PDF depende do navegador | nova |

Migrations compatíveis com o código publicado (`migration.md`): as funções de agendamento mantêm a assinatura e leem o custo dos itens de `p_items`; `save_service` ganha uma versão com os custos ao lado da atual, sem valores padrão, e a antiga sai numa migration posterior, depois da publicação; o corpo de `business-hours` muda junto com o formulário, no mesmo PR (decisão 0026).

Escolhas locais, sem registro: o serviço da análise no `dashboard.ts` existente; as instruções ao modelo e os esquemas JSON como constantes junto das regras; `buildDetails` num arquivo de regras próprio; o adaptador devolve o motivo da falha como valor; o texto copiado montado por uma função pura testada.

## Riscos e dúvidas

1. **Prazo da AV3.** Treze PRs, cada um revisado por outro integrante (decisão 0039), seis migrations aplicadas por você e a #2 dependendo da documentação. Mesmo com um PR incorporado por dia útil, o conjunto passa do início de dezembro. A ordem da tabela deixa o sistema inteiro em qualquer fronteira: a análise resumida (PRs 1 a 5), a detalhada com os dados de hoje (6 a 8) e cada dado novo completo (9 a 13). As duas opções do plano anterior foram marcadas juntas; esta substitui aquele ponto:
   - [x ] **1. Seguir a ordem da tabela, com os PRs de documentação (1 e 2) primeiro, para a #2 andar em paralelo; o que não couber até a AV3 continua depois, sem nada pela metade (recomendada).**
   - [ ] **2. Outra ordem** (escreva qual).
2. **Migrations.** Seis, todas aplicadas por você (`npx supabase db push`) antes da incorporação do PR de cada uma, como manda `migration.md`: `dashboard_details` (PR 6), motivo do cancelamento (PR 9), custo e categoria (PR 10), avaliações (PR 12), atendimentos simultâneos (PR 13) e a remoção da `save_service` antiga (depois do PR 11 publicado). O agente só as confere no banco local, o que depende do `.env.local`. O `seed-demo.sql` atualizado é carregado por você no SQL Editor depois de cada uma.
3. **Campos do pedido ao Groq.** Confiro na documentação do Groq, no PR 3, os nomes do esquema JSON estrito, do limite de saída e do raciocínio baixo (`response_format` com `json_schema`, `max_completion_tokens`, `reasoning_effort`) e se os tokens de raciocínio contam no limite de saída; o que for usado vai a `servico-de-ia.md`. Se divergir do texto atual, volto a você.
4. **Recusas por algarismo na detalhada.** Com mais texto, o modelo erra mais. Se a avaliação mostrar recusas frequentes, a correção é nas instruções (nova versão), não na regra; se não bastar, volta a você.
5. **Chave e variáveis.** O `.env.example`, a conta do Groq, a chave e as variáveis na Vercel ficam com você; sem elas, a análise responde 503 e o resto funciona.
6. **Corpo da issue.** O escopo cresceu além do texto da issue #1 no GitHub.
   - [x ] **Atualizar o corpo da issue** com uma seção "Ampliação aprovada em <data>", resumindo as entregas 1 a 5 e os sete PRs (o agente edita depois da aprovação, pelo `gh`). Feito em 18/11/2026.
   - [ ] **Acrescentar ao corpo da issue a segunda ampliação** (entrega 6, os treze PRs e os critérios novos), depois desta aprovação, pelo `gh`.

## Fora do escopo

- Geração automática ou agendada do relatório e o envio dele (e-mail, decisão 0015): o relatório é gerado quando pedido, de qualquer período.
- Guardar análises, inclusive uma diária para alimentar as mensais e anuais: a análise de um período longo usa os agregados do banco, que são exatos, e não textos de IA anteriores; guardar exigiria tabela, agendador e regra de validade e contraria RS020 ("entradas e respostas não são gravadas").
- Chat livre, texto digitado enviado à IA, consulta gerada pelo modelo e acesso do modelo ao banco.
- Limite próprio de chamadas, resposta em fluxo e envio da análise por e-mail (decisão 0015).
- Despesas gerais (aluguel, salários) e o resultado financeiro da empresa; comentário na avaliação; motivo do cancelamento em texto livre; controle de capacidade, que bloquearia agendamentos (decisão 0014); um status próprio de não comparecimento; desempenho por funcionário.
- A variação nos cartões dos indicadores (L7, opção 3).
- Outras funcionalidades de IA, inclusive nos módulos futuros de estoque e financeiro.
- Os `.docx` (issue #2).
- Testes automatizados da função do banco, da rota, do adaptador e do cartão (decisão 0052).
