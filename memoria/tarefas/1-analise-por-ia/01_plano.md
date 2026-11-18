---
issue: 1
titulo: "Análise do período no dashboard, gerada por IA"
areas: [frontend, backend, banco, testes]
tipo: funcionalidade
requisitos: [UC27, UC09, RF089, RF090, RF040, RF041, RF042, RN038, RN039, RN021, RN035, RN037, RNF017, RNF018, RNF007, RS008, RS014, RS016, RS017, RS018, RS019, RS020]
status: em_execucao
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
5. Remoção de `src/lib/demo/`, do código `NOT_IMPLEMENTED` e do `DemoNotice`, porque esta é a última rota de demonstração (decisão 0055, L1).

A documentação de base da análise (decisão 0054, `servico-de-ia.md`, UC27, RN038, RN039, RF089, RF090, RNF017, RNF018, RS019, RS020, `calculos.md` seção 6, `rotas.md`) já está na `main`. Já existem o cartão `dashboard-analysis-card.tsx`, os tipos `DashboardAnalysis`, a lista `DASHBOARD_INDICATORS` e `calculateIndicators` no serviço `dashboard`; hoje o cartão recebe uma análise fixa de `src/lib/demo/dashboard.ts`.

## Base

- Ramificação `feat/1-ai-analysis`, criada de `origin/main` (5500d11), com o plano e as notas sem commit. Na etapa 02, cada PR abre a sua ramificação a partir da `origin/main` atualizada (ordem abaixo); este plano e as notas entram no PR 1.
- Próximos números livres, conferidos em `docs/`: RF091, RN040, RNF019, RS021, UC28 e a decisão 0057.
- A AV3 é no início de dezembro de 2026, e a #2 (documentos formais) depende da documentação desta tarefa e da decisão 0055 (ver "Riscos e dúvidas", ponto 1).

## Ordem da construção: sete PRs na issue #1

Cada PR fica perto de 400 linhas fora os testes, com a sua ramificação, e só começa depois da incorporação do anterior de que depende. Os seis primeiros usam `Refs #1`; o último, `Closes #1`.

| PR | Ramificação | Conteúdo | Depende de |
|---|---|---|---|
| 1. Documentação | `docs/1-ai-analysis-details` | os textos das lacunas L2 a L9, a decisão 0057, a memória da tarefa | nada; libera a #2 |
| 2. Rota da análise resumida | `feat/1-ai-analysis` | regras puras com TDD, esquema, códigos do catálogo, adaptador, serviço, rota, OpenAPI, versão das instruções no registro | PR 1 |
| 3. Cartão ligado | `feat/1-analysis-card` | o cartão na rota real (sai a entrada da lista de demonstração e o aviso), o número ao lado das observações, a tabela comparativa, o gráfico dos dois períodos, copiar, imprimir | PR 2 |
| 4. Fim da demonstração | `chore/1-remove-demo` | `src/lib/demo/`, `NOT_IMPLEMENTED`, `DemoNotice`, `api-client.ts` e o teste dele, os textos da L1 | PR 3 |
| 5. Indicadores detalhados | `feat/1-analysis-details-data` | a migration da função `dashboard_details`, o repositório, as regras puras dos indicadores de RN040 com TDD, `dados.md` | PR 1; a migration é aplicada pelo Yvan antes da incorporação |
| 6. Análise detalhada, servidor | `feat/1-detailed-analysis` | entrada, mensagens e conferência da análise detalhada com TDD, `detail` no esquema, serviço, rota e OpenAPI | PR 2 e PR 5 |
| 7. Análise detalhada, tela | `feat/1-detailed-analysis-card` | a escolha "Resumida / Detalhada", as seções com os números, as sugestões, a cópia e a impressão da detalhada | PR 3 e PR 6 |

Os PRs 1 a 4 entregam a análise resumida completa, com cópia e impressão, e o sistema sem demonstração; os PRs 5 a 7, a detalhada. Se o prazo apertar, a fronteira entre o 4 e o 5 é o ponto de corte (ponto 1 de "Riscos e dúvidas").

## Como funciona

### Contrato da API

`POST /api/admin/dashboard/analysis` (`rotas.md`), com `requirePermission("dashboard")`. `POST` porque é ação com custo, nunca repetida; nada é gravado.

- **Entrada:** `from*`, `to*` (datas do período exibido, RN035) e `detail` (`summary`, o padrão, ou `detailed`, a partir do PR 6). Campos não previstos são descartados (RS013).
- **Resposta 200** (`DashboardAnalysis`): os campos de hoje (`from`, `to`, `previousFrom`, `previousTo`, `hasComparison`, `summary`, `highlights`, `generatedAt`) e mais:
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

- Antes de gerar: a escolha "Resumida / Detalhada" (`ChoiceGroup`, a partir do PR 7) e o botão "Gerar análise", como hoje.
- Resumida: o resumo; as observações, cada uma com o rótulo do indicador, o valor do sistema e a variação ("Receita: R$ 12.500,00, alta de 25,0% em relação ao período anterior"), com os ícones `TrendingUp`, `TrendingDown` ou `Minus`, decorativos, e a variação sempre escrita; a tabela "Este período × período anterior" (Indicador, Este período, Período anterior, Variação); o gráfico de linhas "Receita: este período e o anterior" (este em `--link`, o anterior em `--muted-foreground`, tracejado; eixo "Dia 1…" ou "Semana 1…"; tabela oculta para o leitor de tela, como os outros gráficos, decisão 0056). Sem comparação (UC27 FA03), sai a coluna e a linha do anterior, com o aviso de hoje.
- Detalhada: além disso, as cinco seções (`h3`), cada uma com as observações da IA e "Números da seção", as listas e quantidades de `details`, formatadas pela tela; e "Sugestões", com "Sugestões geradas por IA: avalie antes de colocar em prática."
- Depois de gerada: "Copiar análise" e "Imprimir ou salvar em PDF", ao lado de "Gerar novamente".
- Copiar: o texto simples abaixo, pela área de transferência do navegador; a região de status anuncia "Análise copiada." ou "Não foi possível copiar. Selecione o texto e copie manualmente."
- Imprimir: `window.print()`. Na impressão saem a navegação, o cabeçalho, os campos do período, os botões e a agenda do dia (tem nomes e placas e não é do período); ficam o período, os indicadores, a análise com os números e os gráficos, sempre com as cores do tema claro, sem quebrar um cartão entre páginas.

Texto copiado (exemplo da resumida):

```
Análise do período – 01/10/2026 a 31/10/2026
Comparado com 31/08/2026 a 30/09/2026

<resumo>

Observações
- Receita (R$ 12.500,00; alta de 25,0%): <comentário>

Gerado por inteligência artificial em 18/11/2026 às 14:32. Pode conter imprecisões: os números oficiais são os dos indicadores.
```

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um período com agendamentos, quando aciono "Gerar análise", então vejo, em até 20 s, um resumo e até quatro observações em português, sem algarismos, identificados como gerados por IA (UC27, RF089, RF090, RN039, RNF018) | testes de `parseAnalysis`; local, com o provedor simulado e o `seed-demo.sql`; com a chave real, só na pré-visualização, pelo Yvan |
| Dado o período de 01/10/2026 a 31/10/2026, quando a análise é gerada, então o serviço de IA recebe os indicadores dele e os de 31/08/2026 a 30/09/2026, sem nome, e-mail, telefone, placa, identificador nem a agenda do dia (RN038, RS020) | testes de `findPreviousPeriod` e `buildAnalysisInput` (resumida e detalhada); local: o provedor simulado grava o corpo, conferido contra os nomes e as placas do `seed-demo.sql` |
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

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`: o cartão nos estados inicial, carregando, resumida, detalhada, sem comparação, sem dados, falha e copiado, a 360 × 800 primeiro e a 1440 × 900, claro e escuro, pelo teclado, com os anúncios da região de status. E o roteiro de avaliação da L9, na pré-visualização, pelo Yvan.

### Como a verificação local é feita

Banco local, contas de teste, `next build` e `next start`, como nas tarefas anteriores, mais um **provedor simulado**: um servidor Node.js no scratchpad, em `http://127.0.0.1`, que responde no formato Chat Completions nos modos sucesso (resumida e detalhada), demora de 20 s, 429, 500, texto fora do JSON, algarismo no texto e observações demais, e grava o corpo recebido. O servidor recebe `AI_BASE_URL` com esse endereço, um `AI_MODEL` qualquer e uma chave inventada. O agente não usa a chave real nem chama o Groq. Como o agente não lê `.env.local`, a verificação com o banco local e a chamada real dependem do Yvan; o relatório registra o que não foi verificado.

## Arquivos

### PR 1, documentação

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

### PR 2, rota da análise resumida

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

### PR 3, cartão ligado

| Arquivo | Ação |
|---|---|
| `src/components/admin/dashboard/dashboard-analysis-card.tsx` | alterar: sai o `DemoNotice`; números, tabela, ações |
| `src/components/admin/dashboard/analysis-comparison.tsx` | criar: a tabela e o gráfico dos dois períodos (o gráfico carregado sob demanda, decisão 0056) |
| `src/components/admin/dashboard/analysis-text.ts` | criar: monta o texto copiado |
| `src/components/admin/dashboard/dashboard-view.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/globals.css` | alterar: classes de impressão e o tema claro na impressão |
| `src/components/admin/dashboard/README.md` | alterar |
| `src/lib/demo/routes.ts` | alterar: sai a entrada da análise (a lista fica vazia) |
| `tests/format/analysis-text.test.ts` ou o lugar que `tests/README.md` indicar | criar: o texto copiado |

### PR 4, fim da demonstração

| Arquivo | Ação |
|---|---|
| `src/lib/demo/` (`routes.ts`, `match.ts`, `list.ts`, `dashboard.ts`, `README.md`), `src/components/shared/demo-notice.tsx` | remover |
| `src/lib/api-client.ts` | alterar: sai a consulta à lista e `answerDemo` |
| `src/shared/errors/catalog.ts` | alterar: sai `NOT_IMPLEMENTED` |
| `src/lib/README.md`, `src/components/shared/README.md` | alterar |
| `tests/lib/api-client.test.ts`, `tests/lib/README.md`, `tests/README.md` | alterar: sai a simulação da lista (`vi.mock` de `@/lib/demo/routes`, que usa `demoPage` de `list.ts`) e o bloco "apiRequest with demo data" |
| `docs/padroes/api.md`, `componentes.md`, `frontend.md`, `testes.md`, `docs/plataforma/estrutura-de-pastas.md`, `docs/plataforma/openapi.yaml` (se tiver o 501), `docs/agendamento/dashboard-do-painel.md`, `workflows/procedimentos/pull-request.md`, `.github/pull_request_template.md`, `docs/decisoes/0055-telas-de-demonstracao.md` | alterar (L1) |

### PR 5, indicadores detalhados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_dashboard_details_function.sql` | criar, com `npx supabase migration new dashboard_details_function` |
| `src/server/repositories/dashboard.ts` | alterar: `findDashboardDetails` |
| `src/server/rules/dashboard-details.ts` | criar |
| `src/shared/api/dashboard.ts` | alterar: `DashboardDetails` |
| `src/shared/constants/dashboard-sections.ts` | criar: as cinco seções e os rótulos |
| `docs/agendamento/dados.md` | alterar: a função nova |
| `tests/rules/dashboard-details.test.ts` | criar |

### PR 6, análise detalhada no servidor

| Arquivo | Ação |
|---|---|
| `src/server/rules/dashboard-analysis.ts` | alterar: entrada, mensagens, esquema e conferência da detalhada |
| `src/server/services/dashboard.ts`, `src/shared/validation/dashboard.ts`, `src/shared/api/dashboard.ts` | alterar: `detail` |
| `docs/plataforma/openapi.yaml` | alterar: `detail`, `details`, `sections`, `recommendations` |
| `tests/rules/dashboard-analysis.test.ts`, `tests/validation/dashboard.test.ts` | alterar |

### PR 7, análise detalhada na tela

| Arquivo | Ação |
|---|---|
| `src/components/admin/dashboard/dashboard-analysis-card.tsx` | alterar: a escolha do modo, as seções e as sugestões |
| `src/components/admin/dashboard/analysis-sections.tsx` | criar: as seções e os números |
| `src/components/admin/dashboard/analysis-text.ts` | alterar: o texto da detalhada |
| testes do texto copiado | alterar |

A pasta `memoria/tarefas/66-analise-por-ia/` (numeração anterior) não muda.

## Testes previstos

Escritos antes do código e vistos falhar, num commit próprio em cada PR de regras (decisões 0035 e 0052). Sem banco, servidor, navegador nem rede.

`tests/rules/dashboard-analysis.test.ts` (PR 2):

- finds the previous period with the same number of days: 2026-10-01 a 2026-10-31 → 2026-08-31 a 2026-09-30; um dia, 2026-10-21 → 2026-10-20; a virada do ano; o ano bissexto, 2028-03-01 a 2028-03-31 → 2028-01-30 a 2028-02-29
- calculates the variation over the previous value: 10.000,00 → 12.500,00 = 25,0; 80 → 60 = −25,0; 3 → 4 = 33,3; anterior zero = `null`; taxa de cancelamento 10,0 → 15,0 = 5,0 pontos
- builds the comparison of the four indicators, with no previous values when the previous period has no appointments
- builds the revenue series by day up to 62 days and in blocks of seven days above it: 62 dias → 62 posições; 63 dias → 9 blocos, o último de 7; 366 dias → 53 blocos, o último de 2; os dois períodos alinhados por posição
- builds the input only with aggregated values: sem agenda, nome, e-mail, telefone, placa nem identificador, e o JSON da entrada não contém esses valores
- uses the status labels of RN017 in the input: `completed` → "Concluído"
- sends the fixed instructions and the input as JSON, with the prompt version of the mode
- accepts a valid summary analysis, with repeated spaces removed; rejects a response that is not JSON, a summary out of 1 to 600 characters, more than four highlights, an unknown indicator or a comment over 240 characters → `"INVALID_RESPONSE"`; rejects digits → `"NUMBERS_IN_TEXT"`; discards unknown fields

`tests/rules/dashboard-details.test.ts` (PR 5):

- keeps the five services with the largest value and sums the others as "Demais"
- calculates the share of paid appointments with a complementary or additional service, half up with two places: 1 de 3 = 33,33
- fills the seven weekdays and the hours with zero
- separates the payment surcharges from the discounts
- counts new and returning clients as RN040 defines (L4)
- gives zero rates, not a division error, in a period with no paid appointments

`tests/rules/dashboard-analysis.test.ts` (PR 6), casos novos:

- builds the detailed input with the details of RN040 and no personal data
- accepts a valid detailed analysis with the five sections, from one to three observations each, and up to four recommendations; rejects an unknown or repeated section, four observations in a section, five recommendations, texts over 240 characters → `"INVALID_RESPONSE"`; digits anywhere → `"NUMBERS_IN_TEXT"`

`tests/validation/dashboard.test.ts` (PR 2 e PR 6): as duas datas obrigatórias; período invertido ou acima de 366 dias; `detail` ausente vira `summary`; `detail` desconhecido → "Escolha um tipo de análise válido."

Texto copiado (PR 3 e PR 7): o período, os números formatados como RN035 e a nota de IA, na ordem da tela.

A função `dashboard_details`, a rota, o adaptador e o cartão são conferidos à mão (decisão 0052), com SQL no banco local e o provedor simulado.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se você escolher outra, ele é refeito antes da construção.

### L1. O que fica da decisão 0055 depois da última rota de demonstração

**Problema.** A 0055 manda remover `src/lib/demo/`, o `NOT_IMPLEMENTED` e o `DemoNotice` com a última rota, mas `componentes.md`, `api.md`, `frontend.md`, `testes.md`, `estrutura-de-pastas.md`, `pull-request.md` e o modelo de PR descrevem o mecanismo, e os registros só têm os status `aceita` e `substituída por NNNN`.

**Opções:**

- [x ] **1. Tirar o mecanismo dos textos e manter a 0055 como histórico, com a seção "Encerramento" (recomendada).** Sem status novo.
- [ ] **2. Como a 1, com o status novo `encerrada`.** Deixa claro no índice, mas cria um status que `_templates/decisao.md` e `docs/decisoes/CONTEXT.md` precisariam descrever.

**Texto proposto (opção 1), no PR 4:**

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

- [x ] **1. Os doze grupos abaixo, todos agregados (recomendada).** Cobrem o que o banco já guarda; nenhum identifica cliente, veículo ou funcionário. Exigem uma função nova no banco (PR 5).
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

## Decisões técnicas

- Seguidas: 0003, 0005 e 0036 (camadas, permissão na API, `src/server/ai/`); 0008 (esquema em `src/shared/validation/`); o padrão da `dashboard_figures`, da #51 (agregação no banco por função só de leitura, sem decisão própria); 0017; 0025 e 0026; 0029; 0030 e 0054; 0035 e 0052; 0042 (função sem privilégio público); 0043 (banco local); 0053; 0056 (Recharts sob demanda); 0055 (encerrada pela L1).

| Decisão proposta | Alternativas descartadas | Justificativa | Nova ou substitui |
|---|---|---|---|
| 0057: a análise é exportada pela impressão do navegador, com estilo de impressão, e copiada como texto simples pela área de transferência; sem biblioteca de PDF | `jsPDF` ou `@react-pdf/renderer` (dependência nova e gráficos redesenhados); PDF no servidor com navegador sem interface (pesado na função da Vercel); arquivo `.txt` (L8, opção 2) | Sem dependência; o PDF sai do que a tela já mostra, com os gráficos SVG; o mesmo estilo serve a qualquer relatório futuro do painel. Aceito: o leiaute do PDF depende do navegador | nova |

Escolhas locais, sem registro: o serviço da análise no `dashboard.ts` existente; as instruções ao modelo e os esquemas JSON como constantes junto das regras; `buildDetails` num arquivo de regras próprio; o adaptador devolve o motivo da falha como valor; o texto copiado montado por uma função pura testada.

## Riscos e dúvidas

1. **Prazo da AV3.** Sete PRs, cada um revisado por outro integrante (decisão 0039), e a #2 ainda depende desta. Proposta: o PR 1 primeiro, para a #2 começar em paralelo; os PRs 2 a 4 em seguida (análise resumida completa, sem demonstração); os PRs 5 a 7 depois. Se o prazo apertar, a detalhada fica para depois da AV3 sem deixar nada pela metade.
   - [ x] **1. Seguir a ordem acima, com o corte entre o PR 4 e o PR 5 se faltar tempo (recomendada).**
   - [ x] **2. Tudo antes da AV3, sem corte.**
2. **Migration (PR 5).** A função `dashboard_details` é aplicada por você (`npx supabase db push`) antes da incorporação, como manda `migration.md`; o agente só a confere no banco local, e isso depende do `.env.local`.
3. **Campos do pedido ao Groq.** Confiro na documentação do Groq, no PR 2, os nomes do esquema JSON estrito, do limite de saída e do raciocínio baixo (`response_format` com `json_schema`, `max_completion_tokens`, `reasoning_effort`) e se os tokens de raciocínio contam no limite de saída; o que for usado vai a `servico-de-ia.md`. Se divergir do texto atual, volto a você.
4. **Recusas por algarismo na detalhada.** Com mais texto, o modelo erra mais. Se a avaliação mostrar recusas frequentes, a correção é nas instruções (nova versão), não na regra; se não bastar, volta a você.
5. **Chave e variáveis.** O `.env.example`, a conta do Groq, a chave e as variáveis na Vercel ficam com você; sem elas, a análise responde 503 e o resto funciona.
6. **Corpo da issue.** O escopo cresceu além do texto da issue #1 no GitHub.
   - [x ] **Atualizar o corpo da issue** com uma seção "Ampliação aprovada em <data>", resumindo as entregas 1 a 5 e os sete PRs (o agente edita depois da aprovação, pelo `gh`).

## Fora do escopo

- Guardar análises, inclusive uma diária para alimentar as mensais e anuais: a análise de um período longo usa os agregados do banco, que são exatos, e não textos de IA anteriores; guardar exigiria tabela, agendador e regra de validade e contraria RS020 ("entradas e respostas não são gravadas").
- Chat livre, texto digitado enviado à IA, consulta gerada pelo modelo e acesso do modelo ao banco.
- Limite próprio de chamadas, resposta em fluxo e envio da análise por e-mail (decisão 0015).
- Indicadores que o sistema não guarda: custo e margem, antecedência do agendamento, motivo do cancelamento, satisfação e ocupação da agenda (decisão 0014); desempenho por funcionário.
- A variação nos cartões dos indicadores (L7, opção 3).
- Outras funcionalidades de IA, inclusive nos módulos futuros de estoque e financeiro.
- Os `.docx` (issue #2).
- Testes automatizados da função do banco, da rota, do adaptador e do cartão (decisão 0052).
