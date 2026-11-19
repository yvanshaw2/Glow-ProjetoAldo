# Notas: 1-analise-por-ia

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-11-18 – descoberta: o que já existe

- O PR de documentação (decisão 0054, `docs/plataforma/servico-de-ia.md`, UC27, RN038, RN039, RF089, RF090, RNF017, RNF018, RS019, RS020, `calculos.md` seção 6, `rotas.md`) já está na `main`. Só falta o PR de código.
- Já existem, feitos para esta tarefa: o cartão `dashboard-analysis-card.tsx` (chama `POST /api/admin/dashboard/analysis`, tem o `DemoNotice`), `DashboardAnalysis` em `src/shared/api/dashboard.ts`, `DASHBOARD_INDICATORS` e seus rótulos, `calculateIndicators` em `src/server/services/dashboard.ts` e `buildIndicators` em `rules/dashboard-indicators.ts`.
- `src/lib/demo/routes.ts` só tem a entrada desta rota: esta tarefa tira a última rota de demonstração. `tests/lib/api-client.test.ts` usa `demoPage` de `src/lib/demo/list.ts` e a lista simulada de demonstração.
- `.env.example` não é lido pelo agente nesta sessão (a leitura foi negada); o Yvan o edita, e o agente confere pelo hash.
- A pasta `memoria/tarefas/66-analise-por-ia/` é a da numeração anterior (plano antigo, já executado no PR de documentação) e não muda.
- A ramificação é `feat/1-ai-analysis`, criada de `origin/main` (5500d11).

## 2026-11-18 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com a lacuna L1 (o que fica da decisão 0055) e o ponto de aprovação sobre dividir em dois PRs (tamanho). Nenhuma caixa marcada; nada construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-11-18 – decisão: escopo ampliado ("Tudo na #1")

Na conversa, o Yvan perguntou sobre guardar uma análise diária, copiar e exportar, gráficos, mais detalhes do negócio e dois modos (resumida e detalhada). Recomendei não guardar a análise diária (resumo de resumos perde precisão; os agregados do banco já cobrem qualquer período; guardar exige tabela, agendador e contraria RS020) e propus fazer a #1 com copiar e imprimir e uma issue nova para a detalhada. Ele escolheu "Tudo na #1".

O plano foi reescrito: análise resumida com os números do sistema, a tabela e o gráfico dos dois períodos; análise detalhada com os indicadores novos de RN040 (função `dashboard_details`, migration); copiar e imprimir ou salvar em PDF (decisão 0057, proposta); versão das instruções e roteiro de avaliação; fim da demonstração. Sete PRs na #1, lacunas L1 a L9 e o ponto do prazo da AV3, com o corte proposto entre o PR 4 e o PR 5. Continua `aguardando_aprovacao`, sem caixas marcadas.

## 2026-11-18 – descoberta: dados disponíveis para a análise detalhada

- `appointments` não tem coluna de criação: não há como medir a antecedência do agendamento.
- `appointment_services` copia o nome, o tipo, o preço e a duração do serviço, mas não a categoria (L5).
- `created_by_staff_id` vazio indica agendamento feito pelo próprio cliente (canal, RN040 item 6).
- Próximos números livres: RF091, RN040, RNF019, RS021, UC28, decisão 0057.

## 2026-11-18 – decisão: plano aprovado

O Yvan gravou `status: aprovado` e marcou a opção 1 em L1 a L9 e a atualização do corpo da issue (ponto 6). Conferido no arquivo antes da etapa 02; o status passou a `em_execucao`. Dois registros, sem alterar o que ele gravou:

- `aprovado_por` ficou com a data (18/11/2026) e `aprovado_em` com a hora (17:41); o aprovador é o Yvan.
- No ponto 1 de "Riscos e dúvidas", as duas opções estão marcadas ("seguir a ordem, com o corte entre o PR 4 e o PR 5 se faltar tempo" e "tudo antes da AV3, sem corte"). Leitura adotada: seguir a ordem dos PRs buscando tudo antes da AV3; o corte só se o Yvan decidir. A pergunta vai a ele; não muda o PR 1.

## 2026-11-18 – decisão: corpo da issue #1 atualizado

Pelo `gh`, como `yvanshaw2`, acrescentada a seção "Ampliação aprovada em 18/11/2026" ao corpo da issue #1 (entregas, sete PRs e critérios novos), como pede o ponto 6 aprovado. O texto antigo ficou como estava.

## 2026-11-18 – dúvida: a seção "Encerramento" da 0055 (L1) e o molde de decisão

`_templates/decisao.md` diz que, quando outra decisão a substitui, a única alteração permitida num registro é `status: substituída por NNNN`; não prevê outra alteração. A L1 aprovada acrescenta uma seção "Encerramento" à 0055. Antes do PR 4, perguntar ao Yvan:

- **1. Seguir a L1 aprovada (seção "Encerramento" na 0055).** Já aprovado; abre exceção ao espírito do molde.
- **2. Decisão nova 0058, "Fim das telas de demonstração", que substitui a 0055 (recomendada).** Cabe no molde (a 0055 recebe só o status `substituída por 0058`); a 0058 registra a remoção e por quê.

## 2026-11-18 – desvio a confirmar antes do PR 3: lugar da função do texto copiado

O plano põe a função que monta o texto copiado em `src/components/admin/dashboard/analysis-text.ts`, com o teste "em `tests/format/` ou onde `tests/README.md` indicar". A decisão 0052 testa as funções de exibição de `src/shared/format/`, não código de `src/components/`. Proposta: `src/shared/format/analysis-text.ts`, com `tests/format/analysis-text.test.ts`.

## 2026-11-18 – descoberta: tamanho dos módulos de docs

Com o PR 1, `calculos.md` passa de cerca de 8,8 mil para 11,7 mil caracteres e `dashboard-do-painel.md` de 6,7 mil para 9,5 mil, acima do limite de cerca de 2 mil tokens de `docs/CONTEXT.md`; `rotas.md` já tinha 17 mil antes desta tarefa. Dividi-los está fora do plano: fica como sugestão de tarefa de documentação.

## 2026-11-18 – decisão: UC27, passo 5

Além do texto da L2, o passo 5 do UC27 passou a citar "os valores do sistema a que cada observação se refere e a comparação com o período anterior (RF092)", para o caso de uso refletir o RF092 da L7 aprovada. Arquivo do plano; só a frase é nova.

## 2026-11-18 – decisão: instruções ao modelo sem menção a demonstração

Orientação do Yvan: as instruções enviadas ao modelo (a mensagem de sistema, constante no código, no PR 2 e no PR 6) não mencionam dados fictícios, demonstração, teste nem projeto acadêmico, e também não ganham uma regra do tipo "os dados são reais": só não tocam no assunto. Nada muda em `docs/`; o modelo nunca lê os arquivos `.md`, só a mensagem de sistema e a entrada em JSON. Conferir no PR 2 e no PR 6.

## 2026-11-18 – descoberta: correção sobre a data de criação do agendamento

A entrada "dados disponíveis para a análise detalhada" disse que `appointments` não tem coluna de criação. Errado: a tabela tem `created_at` (migration inicial), não listada em `docs/agendamento/dados.md` porque o arquivo diz que "toda tabela tem `created_at`". O `seed-demo.sql` já a preenche de 1 a 6 dias antes da data marcada. A antecedência do agendamento é calculável; o plano a lista em "Fora do escopo" por esse engano, e incluí-la em RN040 pede a aprovação do Yvan.

## 2026-11-18 – decisão: segunda ampliação, dados novos do negócio ("Tudo na #1")

O Yvan pediu que a análise tenha de fato os dados que faltam, simulados no `seed-demo.sql` como os de hoje, e escolheu "Tudo na #1" em vez de issues separadas. Princípio combinado: nenhum dado existe só no seed; cada um tem banco, captura no fluxo real, exibição, simulação e indicador.

O plano ganhou a entrega 6, as lacunas L10 (antecedência), L11 (motivo do cancelamento), L12 (custo dos insumos e margem), L13 (categoria copiada), L14 (avaliação do atendimento), L15 (ocupação da agenda), L16 (decisão 0058 no lugar da seção "Encerramento" da 0055) e L17 (lugar da função do texto copiado), e passou a treze PRs, com um ponto 1 novo sobre o prazo. Voltou a `aguardando_aprovacao`; as caixas de L1 a L9 continuam marcadas, e as novas estão vazias. O PR 1 continua só com commits locais.

## 2026-11-18 – decisão: o relatório como o do analista da empresa (L18)

O Yvan descreveu a ideia: o relatório da IA faz o papel do funcionário que analisa o dashboard e outros dados e entrega ao dono o relatório do período, comparando o dia com o dia anterior, o mês com o mês anterior e o ano com o ano anterior, para poupar o tempo e o custo desse funcionário. Conferindo o plano contra isso:

- Coerente: a análise sob demanda de qualquer período, os dados além do dashboard (RN040 e L10 a L15), as seções e as sugestões da detalhada, os números do sistema ao lado do texto.
- Incoerente, corrigido pela L18 (nova): RN038 compara com um período de mesma quantidade de dias (outubro com 31/08 a 30/09), e "Este mês" em andamento seria comparado com o mês anterior inteiro.
- Registrado no plano: a seção "Instruções ao modelo" (o modelo no lugar do analista que relata ao dono) e, em "Fora do escopo", a geração automática ou agendada e o envio do relatório (decisão 0015): ele é gerado quando pedido.

## 2026-11-18 – decisão: plano aprovado com a segunda ampliação

O Yvan gravou `status: aprovado` e marcou a opção 1 de L10 a L18 e do ponto 1. Conferido no arquivo; o status passou a `em_execucao`. Os campos `aprovado_por` e `aprovado_em` ficaram como na primeira aprovação. A segunda caixa do ponto 6 ("Acrescentar ao corpo da issue a segunda ampliação") ficou vazia: o corpo da issue #1 não foi alterado de novo, e o exemplo do critério de aceitação de lá continua "31/08/2026 a 30/09/2026", diferente da L18. Fica para o Yvan decidir.

## 2026-11-18 – descoberta: período em andamento e o botão da análise

Com a L18, um período em andamento é analisado só até o dia corrente. O botão "Gerar análise" continua disponível pelo período exibido (que pode ter só agendamentos futuros, como "Este mês" no dia 1); nesse caso, a rota responde 409 `INSUFFICIENT_DATA`, e o cartão mostra a mensagem dela. RN038 e `rotas.md` passaram a dizer "período analisado".

## 2026-11-18 – decisão: PR 2, documentação dos dados novos

Ramificação `docs/1-business-data`, de `origin/main` (ebf1009, com o PR #12 incorporado). Os textos de L10 a L15 entraram nos arquivos da lista do plano, sem arquivo fora dela. Detalhes que o plano não fixava, escritos para a construção seguir:

- `GET /api/me/appointments/:id` ganha `canReview` (se o cliente ainda pode avaliar, calculado pelo servidor por RN043), para a tela não repetir a regra; e `cancellationReason` e `rating` nos dois detalhes.
- Com o corpo `{ days, simultaneousSlots }`, o campo com erro de `business-hours` passa de `1.closesAt` a `days.1.closesAt`; o formulário muda junto, no PR 13.
- Textos de tela propostos: "Motivo: <motivo>" e "Motivo: Não informado"; "Sua avaliação: <nota> de 5", "Como foi o atendimento?", "Enviar avaliação", "Avaliação enviada."; no painel, "Avaliação do cliente: <nota> de 5" ou "ainda não avaliado"; "Custo dos insumos (opcional)" e "Atendimentos simultâneos", com as ajudas da L12 e da L15.
- L16 (decisão 0058) fica para o PR 5, junto da remoção; L17 não tem texto de `docs/`.

## 2026-11-18 – decisão: PR 3 dividido em 3a e 3b

O PR 3 (rota da análise resumida) passou de 1.000 linhas fora os testes; o Yvan escolheu dividi-lo em dois:

- **3a, regras** (`feat/1-analysis-rules`, de `origin/main` com o #13): os testes em vermelho, a refatoração da conferência do período, `src/server/rules/dashboard-analysis.ts`, `dashboardAnalysisSchema`, os tipos de `DashboardAnalysis` e os campos novos na resposta de demonstração. Cerca de 510 linhas fora os testes: as regras (391) são um arquivo só.
- **3b, rota** (`feat/1-ai-analysis`): o catálogo de erros, o adaptador de `src/server/ai/`, o serviço, a rota, a OpenAPI e `servico-de-ia.md`. Abre depois da incorporação do 3a, atualizada com a `main`.

Escolhas do 3a que o plano não fixava:

- **Nome da função:** o plano citava `findPreviousPeriod`; com a L18 ela devolve o período analisado e o anterior, e virou `findComparisonPeriods`.
- **Período futuro:** um período que começa depois do dia corrente não tem nada a analisar (`null`); o serviço do 3b responde 409 `INSUFFICIENT_DATA`, sem chamar a IA.
- **Série com o anterior mais longo** (fevereiro diante de janeiro): os pontos seguem as posições do período analisado, e os dias a mais do anterior ficam fora do gráfico; os totais da comparação os incluem. `calculos.md` só fala do anterior mais curto.
- **Arquivo fora da lista do plano:** `src/lib/demo/dashboard.ts`, com os campos novos de `DashboardAnalysis` na resposta de demonstração (`analyzedTo`, `detail`, `promptVersion`, `comparison` sem valores, `revenueSeries` vazia e os nulos da detalhada), para o tipo compilar enquanto o cartão usa a demonstração (até o PR 4).

Verificação do 3a: `npm run check` aprovado, 822 testes em 38 arquivos; 29 testes novos das regras e 5 do esquema.

## 2026-11-19 – decisão: PR 3b, rota da análise resumida

Ramificação `feat/1-ai-analysis`, atualizada com a `main` depois do #14. Leva o catálogo de erros (`INSUFFICIENT_DATA` e `AI_UNAVAILABLE`), o adaptador de `src/server/ai/`, `generateDashboardAnalysis`, a rota, a OpenAPI, `servico-de-ia.md` e os README.

- **Campos do Groq (risco 3 do plano):** conferidos na documentação em 18/11/2026: `response_format` com `json_schema` estrito (`name`, `strict: true`, `schema`; todo campo obrigatório e `additionalProperties: false`), `max_completion_tokens` (o `max_tokens` está obsoleto), `reasoning_effort: "low"`, o raciocínio do `gpt-oss` em `message.reasoning`, o texto em `choices[0].message.content`, os tokens em `usage.prompt_tokens` e `usage.completion_tokens`, e 429 no limite. A documentação não diz se o raciocínio conta em `max_completion_tokens`; o limite da resumida ficou em 2.048. Registrado em `servico-de-ia.md`.
- **Fora da lista do plano:** a linha de `tests/rules/README.md` foi desfeita antes do PR, e o arquivo ficou como na `main`; nenhum arquivo fora do plano no 3b.

## 2026-11-19 – descoberta: verificação do PR 3b

- `npm run check`: aprovado.
- Provedor simulado, conferido à mão (decisão 0052) por um teste do Vitest fora do repositório, com o repositório do dashboard simulado: o pedido no formato Chat Completions, com os campos acima e o `Bearer`; `not_configured` sem chamar nada; 429, 500, resposta sem conteúdo e falha de rede; o corte em 15 s, numa chamada só; outubro comparado com setembro; 409 `INSUFFICIENT_DATA` sem chamada, no período sem agendamentos e no futuro; 503 `AI_UNAVAILABLE` com só o motivo no registro, sem a chave, o texto da resposta, as instruções nem o raciocínio; sem comparação quando o anterior não tem agendamentos. 8 de 8.
- `next build`: compilou, conferiu os tipos e gerou as páginas, com a rota nova; parou no fim com a mensagem "SecurityFatalError" do Next.js 16.4.1, que recomenda atualizar e pede para repetir o comando. É saída da ferramenta: não foi seguida, e a atualização do Next.js fica para o Yvan decidir.
- Não verificado: a rota com o banco local e as contas de teste (exige o `.env.local`, que o agente não lê) e a chamada real ao Groq (só na pré-visualização, pelo Yvan, com as variáveis `AI_*` na Vercel e no `.env.example`).

## 2026-11-19 – decisão: PR 4, cartão ligado à rota

Ramificação `feat/1-analysis-card`, de `origin/main` com o #15. O cartão chama a rota real (a entrada sai de `src/lib/demo/routes.ts`, que fica vazia até o PR 5) e perde o aviso de demonstração; ganha os valores do sistema ao lado das observações, a tabela "Este período × período anterior", o gráfico da receita dos dois períodos, "Copiar análise" e "Imprimir ou salvar em PDF". A função do texto copiado ficou em `src/shared/format/analysis-text.ts`, com testes em `tests/format/` (L17).

- **Arquivo fora da lista do plano:** `src/components/admin/dashboard/dashboard-charts.tsx`, que recebe o desenho do gráfico dos dois períodos (`RevenueComparisonChart`), para o Recharts continuar num só módulo carregado sob demanda (decisão 0056). Os README de `src/shared/format/` e `tests/format/` mudaram por terem arquivo novo.
- **Região de status do cartão:** passou de invisível a texto pequeno visível, porque também mostra o resultado da cópia ("Análise copiada." ou a falha), que precisa ser visto.
- **Impressão:** o tema escuro passou a valer só na tela (`@media screen and (prefers-color-scheme: dark)`), e o bloco `@media print` tira as sombras dos cartões e põe uma linha; a linha "Período exibido" só aparece na impressão, porque o seletor de período sai dela.
- **Verificação:** `npm run check` aprovado, 832 testes em 39 arquivos (10 novos do texto copiado). Não verificado: a tela na pré-visualização local (360 × 800 e 1440 × 900, temas, teclado, Lighthouse), a cópia e a impressão em PDF, porque abrir `/admin` exige a sessão do banco local, que depende do `.env.local`. Fica para a pré-visualização da Vercel, com as variáveis `AI_*`.

## 2026-11-19 – dúvida: dados fictícios de um ano (pedido do Yvan, depois do PR 5 ou do fim da issue)

O Yvan pediu que o sistema tenha dados fictícios coerentes com uma pequena estética automotiva de uma cidade como Maceió: cerca de um ano de histórico e um mês à frente, para o dashboard e a agenda do dia terem dados todos os dias até a apresentação. Combinado fazer depois do PR 5 ou depois de toda a issue.

O que existe hoje em `supabase/seed-demo.sql`: agendamentos de 90 dias antes da carga a 14 dias depois, de 2 a 4 nos dias cheios e 1 ou 2 nos dias curtos, nos horários de `business_hours`; reagendamentos de alguns concluídos 28 dias depois; carregar de novo só acrescenta os dias ainda sem agendamentos, e os status são decididos pela data no momento da carga. A planejar (lacuna nova, com a aprovação do Yvan): a janela de 365 dias antes e 30 depois; volume, preços, sazonalidade (verão e chuvas de Maceió), mistura de formas de pagamento, clientes recorrentes; e o que acontece com os agendamentos futuros que passam da data sem mudar de status entre uma carga e outra (recarregar para avançá-los ou deixá-los como estão).

## 2026-11-19 – decisão: PR 5, fim da demonstração

Ramificação `chore/1-remove-demo`, de `origin/main` com o #16. Saíram `src/lib/demo/`, `src/components/shared/demo-notice.tsx`, a consulta à lista de demonstração em `apiRequest` e o `NOT_IMPLEMENTED` do catálogo; `tests/lib/api-client.test.ts` perdeu a simulação da lista (`vi.mock` de `@/lib/demo/routes` com `demoPage`) e os 13 casos dela, e ficou com 20. A decisão 0058 (L16) substitui a 0055, que só recebeu o status. Os textos de L1 saíram de `api.md`, `componentes.md`, `frontend.md`, `testes.md`, `estrutura-de-pastas.md`, `pull-request.md`, do modelo de PR e de `dashboard-do-painel.md`; o `relacionados` de `api.md`, `componentes.md` e `frontend.md` passou de 0055 a 0058.

- **Arquivos fora da lista do plano:** as páginas de tela que citavam o aviso ou as "telas de demonstração" na lista de referências: `docs/agendamento/agendamentos-do-painel.md`, `agendar-servico.md`, `docs/catalogo/servicos-do-painel.md`, `docs/clientes/area-do-cliente.md`, `clientes-do-painel.md`, `docs/configuracoes/configuracoes-do-painel.md` e `docs/equipe/equipe-do-painel.md`. Só saiu a menção; nada mais mudou.
- **Verificação:** `npm run check` aprovado, 819 testes em 39 arquivos; nenhuma menção a `lib/demo`, `DemoNotice`, `NOT_IMPLEMENTED` ou ao aviso de demonstração fora da memória e das decisões 0055 e 0058.
