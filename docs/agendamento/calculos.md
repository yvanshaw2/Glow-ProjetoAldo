---
titulo: Funções puras do agendamento
assunto: agendamento
origem: Documentação de Arquitetura de Software, seção 4.2; Documentação de Análise do Sistema, seção 9
relacionados: [RN005, RN006, RN009, RN010, RN012, RN013, RN015, RN016, RN017, RN018, RN019, RN020, RN021, RN032, RN033, RN034, RN037, RN038, RN039, RN040, RN041, RN042, RN043, RN044]
---

# Funções puras do agendamento

Quatro conjuntos de regras do módulo `appointments` e as regras da análise do módulo `dashboard` são funções puras, sem banco, desenvolvidas com TDD (`docs/padroes/testes.md`). Recebem por parâmetro tudo de que precisam: itens do catálogo vigente, porte do veículo, percentual da forma de pagamento, disponibilidade (`business_hours`), fuso da empresa (`COMPANY_TIME_ZONE`, `America/Maceio`) e o instante atual (`now`). Nunca leem relógio, banco ou variáveis de ambiente. O serviço `appointments` busca esses dados, chama as funções e grava o resultado.

| Seção | Arquivo | Teste |
|---|---|---|
| 1. Preço | `src/server/rules/pricing.ts` | `tests/rules/pricing.test.ts` |
| 2. Transições de status | `src/server/rules/status-transitions.ts` | `tests/rules/status-transitions.test.ts` |
| 3. Datas e horários | `src/server/rules/scheduling.ts` | `tests/rules/scheduling.test.ts` |
| 4. Edição | `src/server/rules/editing.ts` | `tests/rules/editing.test.ts` |
| 6. Análise do dashboard | `src/server/rules/dashboard-analysis.ts` | `tests/rules/dashboard-analysis.test.ts` |
| 7. Indicadores da análise detalhada | `src/server/rules/dashboard-details.ts` | `tests/rules/dashboard-details.test.ts` |

Os indicadores (seção 5) não ficam em `rules/`: são agregações por período, e onde calculá-las (no banco ou no serviço `dashboard`) é decidido no plano da tarefa do dashboard.

## 1. Preço (RN009, RN010, RN012)

- Valor do item: `by_size` usa o preço do porte do veículo; `fixed` usa `fixed_price`; adicional é sempre fixo.
- Custo do item (RN042): pela mesma regra, o `cost` do porte ou o `fixed_cost`; vazio quando o serviço não tem custo. O custo não entra no subtotal nem no total: só é copiado no agendamento, com o valor.
- Subtotal: soma dos itens. Total: subtotal ajustado pelo percentual da forma (positivo acréscimo, negativo desconto). Desconto de 100% dá total zero.
- Cálculo em centavos inteiros: as funções recebem e devolvem reais, como o banco, a API e as telas, e convertem para centavos por dentro. Só o total é arredondado, uma vez, ao centavo mais próximo, e o meio centavo sobe: R$ 150,10 com acréscimo de 5% (R$ 157,605) dá R$ 157,61, e com desconto de 5% (R$ 142,595), R$ 142,60. Como o total nunca é negativo, é o mesmo resultado do `round` do PostgreSQL.
- Composição: ao menos um serviço principal ou complementar (RN005); adicional só com o principal a que está vinculado (RN006).
- Total por forma de pagamento do agendamento finalizado (RF053): a forma do agendamento mantém o percentual e o total gravados nele (RN037), e as outras três usam o percentual vigente sobre o subtotal.
- A mesma função serve ao novo agendamento, à edição, ao reagendamento (sempre pelo catálogo atual, RN020) e à conclusão com troca da forma de pagamento (RN018).

## 2. Transições de status (RN017 a RN020)

| De | Para | Quem | Rota |
|---|---|---|---|
| `scheduled` | `checked_in` | funcionário | `advance` |
| `checked_in` | `in_progress` | funcionário | `advance` |
| `in_progress` | `awaiting_payment` | funcionário | `advance` |
| `awaiting_payment` | `completed` | funcionário, confirmando ou trocando a forma | `complete` (grava `completed_at`) |
| `scheduled` | `cancelled` | cliente ou funcionário | `cancel` (grava `cancelled_at`) |
| `checked_in` | `cancelled` | funcionário | `cancel` |
| `completed` | `rescheduled` | cliente ou funcionário | `reschedule` (cria um novo `scheduled`) |

`cancelled` e `rescheduled` são finais. Um agendamento origina no máximo um reagendamento; o novo pode ser reagendado depois de concluído. Transição inválida: 409 `INVALID_STATUS`.

## 3. Datas e horários (RN013, RN015, RN016, RN034)

- Início válido: dia aberto, de `opens_at` (inclusive) a `closes_at` (exclusive), fora da pausa, de `break_starts_at` (inclusive) a `break_ends_at` (exclusive), em múltiplo de 30 minutos e não anterior a `now`. Com expediente das 8h às 18h e pausa das 12h às 13h, 8h, 13h e 17h30 são aceitos, e 12h, 12h30 e 18h, recusados.
- Previsão de conclusão: distribuir a duração estimada pelos períodos de funcionamento a partir do início, pulando pausa, horário fora do expediente e dias fechados. Exemplo: dia das 8h às 18h com pausa das 12h às 13h, início às 16h e 4 horas de serviço → 2 horas no dia, 2 horas no próximo dia aberto → previsão às 10h desse dia. O trabalho que termina exatamente no encerramento ou no início da pausa tem a previsão nesse horário: início às 16h com 2 horas → 18h do mesmo dia.
- Sem controle de capacidade nem de conflito entre agendamentos (RN016). O cliente pode registrar a qualquer momento (RNF012); a disponibilidade restringe o horário marcado, não o momento do registro.

## 4. Edição (RN032, RN033)

- Cliente: só em `scheduled`, e só posterga: a nova data e o novo horário são posteriores aos marcados e no futuro.
- Funcionário: qualquer status; em `scheduled`, nunca no passado; em `checked_in`, `in_progress`, `awaiting_payment`, `completed` e `rescheduled`, nunca depois do momento da alteração; em `cancelled`, só a disponibilidade.
- As conferências de data só valem quando a data ou o horário mudam. A previsão é recalculada a partir da data marcada; se ela ficou fora do funcionamento, a contagem começa no próximo período.
- A edição nunca muda o status.
- Troca de veículo ou serviços recalcula todos os itens pelo catálogo atual e refaz a cópia do veículo; troca da forma aplica o percentual vigente; sem troca de veículo nem de serviços, os itens e as cópias gravados ficam, e sem troca da forma o percentual gravado fica. Subtotal, total, duração e previsão saem sempre da soma dos itens resultantes e da data resultante (RN037).

## 5. Indicadores do dashboard (RN021)

Os números do período são agregados no banco pela função `dashboard_figures` (só leitura), que devolve, por status, a quantidade dos agendamentos com a data marcada no período e, por dia de conclusão no fuso da empresa, a receita e a quantidade dos pagos; o serviço `dashboard` monta com eles os indicadores, a receita de todos os dias do período e os sete status (`rules/dashboard-indicators.ts`).

- Receita: soma de `total` dos agendamentos `completed` ou `rescheduled` com `completed_at` no período; receita por dia agrupada por `completed_at`.
- Ticket médio: receita dividida pela quantidade desses agendamentos.
- Taxa de cancelamento: cancelados sobre o total de agendamentos do período.
- Quantidade de agendamentos, taxa de cancelamento e agendamentos por status: o período é o da data marcada (`scheduled_at`), a quantidade conta todos os status, e a soma dos status é a quantidade. Sem agendamentos pagos, o ticket médio é zero.
- O ticket médio e a taxa de cancelamento têm duas casas decimais, arredondadas com meio centavo para cima, como o total (RN012).
- Agenda do dia (RF043): os agendamentos de qualquer status marcados para o dia corrente no fuso da empresa.
- Período padrão: mês atual; no máximo 12 meses (RN035).

## 6. Análise do dashboard (RN038, RN039)

- Período anterior: num período de meses inteiros do calendário (do dia 1 ao último dia de um mês), os mesmos meses imediatamente anteriores; nos demais, a mesma quantidade de dias, terminando no dia anterior à data inicial. 01/10/2026 a 31/10/2026 dá 01/09/2026 a 30/09/2026; 01/01/2026 a 31/12/2026 dá 01/01/2025 a 31/12/2025; 01/03/2028 a 31/03/2028 dá 01/02/2028 a 29/02/2028; 21/10/2026 dá 20/10/2026; 15/10/2026 a 21/10/2026 dá 08/10/2026 a 14/10/2026.
- Período em andamento: o que termina depois do dia corrente é analisado até ele (`analyzedTo`), e o anterior, pelos mesmos dias, com o dia que não existe no mês anterior passando ao último dia dele. Em 18/11/2026, 01/11/2026 a 30/11/2026 é analisado de 01/11 a 18/11, com 01/10 a 18/10; em 30/03/2027, 01/03/2027 a 31/03/2027 é analisado de 01/03 a 30/03, com 01/02 a 28/02. Os agendamentos em aberto (seção 7) contam o período inteiro.
- Variação: percentual sobre o valor anterior, com uma casa decimal (R$ 10.000,00 para R$ 12.500,00 dá 25,0); na taxa de cancelamento, a diferença em pontos percentuais (10,0% para 15,0% dá 5,0). Sem variação quando o valor anterior é zero.
- Comparação (RF092): a receita, a quantidade de agendamentos, o ticket médio e a taxa de cancelamento, cada um com o valor do período, o do anterior e a variação; sem agendamentos no período anterior, só o valor do período. A tela a mostra ao lado das observações, na tabela dos dois períodos e no gráfico, e o texto copiado a repete.
- Série da receita: por dia, em períodos de até 62 dias; nos mais longos, em blocos de sete dias contados a partir da data inicial, o último com os dias que sobram. O período e o anterior se alinham por posição; quando o anterior é mais curto (setembro diante de outubro), as últimas posições dele ficam vazias: 62 dias dão 62 posições; 63 dias, 9 blocos, o último de 7; 366 dias, 53 blocos, o último de 2.
- Entrada do modelo: os indicadores do período e do anterior, as variações, a série da receita e a quantidade de agendamentos por status, com os rótulos de RN017; na detalhada, também os indicadores de RN040 (seção 7). Nada da agenda do dia nem texto livre. Sem agendamentos no período anterior, a entrada marca a comparação como indisponível.
- Mensagens: uma de sistema, fixa no código e em português, com uma versão por modo (`resumida-1`, `detalhada-1`), e uma com a entrada em JSON.
- Resposta da resumida: JSON com `summary`, de 1 a 600 caracteres, e até quatro `highlights`, cada um com um indicador da lista (`revenue`, `appointmentCount`, `averageTicket`, `cancellationRate`, `revenueByDay`, `appointmentsByStatus`) e um `comment` de 1 a 240 caracteres.
- Resposta da detalhada: o mesmo, mais `sections`, com as cinco seções uma vez cada (`revenue`, `services`, `clients`, `operation`, `payments`), cada uma com `observations`, de uma a três, de 1 a 240 caracteres, e `recommendations`, até quatro, de 1 a 240 caracteres.
- Conferência: os textos são normalizados como os de RN035. A resposta fora do formato é recusada (`INVALID_RESPONSE`), como a que tem algarismo em qualquer texto (`NUMBERS_IN_TEXT`); campos não previstos são descartados.
- As funções recebem os indicadores já calculados pelo serviço `dashboard` e devolvem a recusa como valor, sem lançar erro.

## 7. Indicadores da análise detalhada (RN040)

Agregados no banco pela função `dashboard_details` (só leitura), chamada para o período e para o anterior, que devolve as quantidades e as somas de RN040 no fuso da empresa; `rules/dashboard-details.ts` monta com elas as taxas, os cinco maiores e "Demais", os sete dias da semana e as horas, com zero onde não há agendamento.

- Serviços e cancelamentos: os cinco maiores por valor (serviços dos pagos) e por quantidade (serviços dos cancelados); empate pelo nome copiado. O valor de um serviço é o `price` dele no agendamento, antes do acréscimo ou desconto da forma de pagamento.
- Categorias: pelo `category_name` copiado no agendamento (RN037); vazio, pela categoria atual do serviço.
- Complementos: pagos com ao menos um serviço `complementary` ou `additional` sobre os pagos; 1 de 3 dá 33,33.
- Ticket médio por porte: receita dos pagos de cada porte sobre a quantidade deles; zero sem pagos.
- Acréscimos e descontos: a soma de `total − subtotal` dos pagos, separada em positivos e negativos.
- Canal: `created_by_staff_id` vazio é o próprio cliente; preenchido, o painel.
- Clientes novos: o primeiro agendamento do cliente, em qualquer status, tem a data marcada no período; recorrentes, os demais com agendamento no período.
- Retornos: agendamentos do período com `rescheduled_from_id` preenchido.
- Dias da semana e horários: pela data marcada (agendamentos e cancelados) e pela conclusão (receita), no fuso da empresa, de segunda a domingo e das 0 às 23 horas.
- Em aberto: `scheduled`, `checked_in`, `in_progress` e `awaiting_payment` com a data marcada no período.
- Antecedência: dias de calendário entre `created_at` e `scheduled_at`, no fuso da empresa; média com uma casa e as faixas 0, de 1 a 3, de 4 a 7 e mais de 7. Registrado em 01/10 para 01/10 dá 0; em 01/10 para 05/10, 4.
- Motivos: os cancelados por `cancellation_reason`, com os vazios como "Não informado" (RN041).
- Margem (RN042): só os pagos em que todos os serviços têm `cost`; margem = soma de `total` menos soma de `cost`, e o percentual sobre a soma de `total`, com duas casas. R$ 200,00 de receita e R$ 60,00 de custo dão R$ 140,00 e 70,00%. Os pagos com algum serviço sem custo são contados à parte; sem pagos com custo, a margem não é calculada.
- Avaliação (RN043): as notas de `appointment_reviews` dos atendimentos com `completed_at` no período; média com duas casas e a quantidade de cada nota; sem notas, não é calculada.
- Ocupação (RN044): soma de `estimated_duration_minutes` dos agendamentos não cancelados do período sobre os minutos disponíveis vezes `simultaneous_slots`; os minutos de um dia são `closes_at − opens_at` menos a pausa, pelo dia da semana na disponibilidade atual, e zero no dia fechado (`rules/occupancy.ts`). Um dia útil das 08:00 às 18:00 com pausa de uma hora dá 540 minutos; com 3 atendimentos simultâneos, 1.620; 810 minutos agendados dão 50,00%. Sem minutos disponíveis, não é calculada.
- Taxas e médias com duas casas, meio centavo para cima (RN012); sem base, zero.

## Persistência

`create_appointment`, `update_appointment` e `reschedule_appointment` são funções SQL que gravam, em uma transação, o agendamento, a cópia dos dados e os serviços; o reagendamento também muda o original para `rescheduled` (`dados.md`). `dashboard_figures` e `dashboard_details` são as funções de leitura: agregam no banco o que passaria do limite de linhas de uma consulta.
