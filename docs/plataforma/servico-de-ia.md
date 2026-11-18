---
titulo: Serviço de inteligência artificial
assunto: plataforma
origem: issue #66, plano memoria/tarefas/66-analise-por-ia/01_plano.md (L5 a L8, D1 e Evolução prevista); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L2, L6, L9)
relacionados: [RF089, RF090, RF091, RN038, RN039, RN040, UC27, RNF017, RNF018, RS016, RS018, RS019, RS020, 0029, 0030, 0054]
---

# Serviço de inteligência artificial

A análise do período no dashboard (UC27), resumida ou detalhada (RF091), é escrita por um modelo de linguagem de um serviço externo, chamado só pelo servidor (decisão 0054). Requisitos: RS019 e RS020 ([seguranca.md](seguranca.md)), RNF017 e RNF018 ([requisitos.md](requisitos.md)). Entrada e resposta: RN038, RN039, RN040 e `docs/agendamento/calculos.md`, seções 6 e 7.

## Provedor e modelo

| Item | Valor |
|---|---|
| Provedor | Groq, plano Free, sem cartão |
| Modelo | `openai/gpt-oss-120b` |
| Formato | Chat Completions, em `POST {AI_BASE_URL}/chat/completions`, com `Authorization: Bearer` |
| Pedido | `model`, `messages` (as duas mensagens), `response_format` (`type: "json_schema"`, com `json_schema` de `name`, `strict: true` e `schema`; no modo estrito, todo campo é obrigatório e `additionalProperties` é `false`), `temperature` 0,3, `max_completion_tokens` (2.048 na resumida) e `reasoning_effort: "low"`. O raciocínio do `gpt-oss` volta em `message.reasoning`, que não é lido nem registrado; a documentação não diz se ele conta no limite de saída, por isso o limite deixa folga; o texto vem em `choices[0].message.content`, e os tokens, em `usage.prompt_tokens` e `usage.completion_tokens`. Conferido na documentação do Groq em 18/11/2026. |

Limites do plano Free para o `openai/gpt-oss-120b`, conferidos em 21/10/2026 na página de limites do Groq (os da conta ficam nas configurações dela): 30 requisições e 8 mil tokens por minuto; 1.000 requisições e 200 mil tokens por dia. Com as instruções e a resposta, a análise resumida usa cerca de 1,5 mil tokens num mês e 2,5 mil em 12 meses, porque acima de 62 dias a receita vai em blocos de sete dias (RN038); a detalhada, de 3,5 mil a 4,5 mil. Todas cabem nos 8 mil tokens por minuto. O Groq não retém os dados das requisições por padrão, salvo os registros de abuso, por até 30 dias, e oferece retenção zero nas configurações da conta. Os limites e os termos dos planos gratuitos mudam sem aviso: confira-os nos dias antes de cada apresentação.

## Variáveis de ambiente

| Variável | Sigilosa | Valor |
|---|---|---|
| `AI_BASE_URL` | não | `https://api.groq.com/openai/v1` |
| `AI_MODEL` | não | `openai/gpt-oss-120b` |
| `AI_API_KEY` | sim | a chave do Groq, só na Vercel e no `.env.local` |

Lidas durante a requisição, nunca no build. Sem alguma delas, a análise responde indisponível, e o resto do sistema funciona (RNF017), inclusive no contêiner.

## Chamada e falhas

- O adaptador de `src/server/ai/` (`import "server-only"`) recebe as mensagens, o esquema da resposta e o limite de tokens de saída e devolve o texto da resposta e os tokens usados, ou o motivo da falha.
- A chamada é interrompida em 15 segundos (RNF018) e nunca é repetida automaticamente.
- Não há limite próprio de chamadas: o botão fica desativado durante a geração, nenhuma chamada é repetida, e o limite do provedor responde `AI_UNAVAILABLE`.
- Nada é gravado: nem a entrada, nem a resposta.

| Situação | Motivo no registro | Resposta da API |
|---|---|---|
| Variável ausente | `not_configured` | 503 `AI_UNAVAILABLE` |
| Sem resposta em 15 s | `timeout` | 503 `AI_UNAVAILABLE` |
| 429 do provedor | `rate_limited` | 503 `AI_UNAVAILABLE` |
| Outro erro do provedor ou da rede | `provider_error` | 503 `AI_UNAVAILABLE` |
| Resposta fora de RN039 | `invalid_response` | 503 `AI_UNAVAILABLE` |
| Período sem agendamentos | a IA não é chamada | 409 `INSUFFICIENT_DATA` |

## Registro (decisão 0029)

A falha grava uma linha `warn` (`dashboard_analysis_failed`) com o motivo, o status HTTP do provedor e a duração; a análise gerada, uma linha `info` (`dashboard_analysis_generated`) com o modelo, o modo, a versão das instruções, os tokens de entrada e de saída e a duração. Nunca a chave, as mensagens nem a resposta (RS018, RS019).

## Versão das instruções e avaliação

As instruções de cada modo têm uma versão no código (`resumida-1`, `detalhada-1`), que volta na resposta e vai à linha `info` do registro. Mudar as instruções ou o modelo pede uma versão nova e a avaliação de `workflows/procedimentos/testes.md` (Avaliação da análise por IA).

## Troca de provedor

Outro provedor com o formato Chat Completions e a saída por esquema JSON entra só pelas três variáveis, sem mudar o código, como a Gemini API (`https://generativelanguage.googleapis.com/v1beta/openai`). Os termos do plano dele precisam permitir os dados de RN038. A troca é uma decisão nova, que substitui a 0054, e atualiza esta página.

## Verificação

Os testes automatizados nunca chamam o provedor. Localmente, um provedor simulado no scratchpad responde no formato Chat Completions, nos modos de sucesso e de falha, pelo `AI_BASE_URL`, com uma chave inventada; o provedor real é conferido só na pré-visualização, pelo desenvolvedor (`workflows/procedimentos/testes.md`).

## Uso em funcionalidades futuras

O adaptador de `src/server/ai/` recebe as mensagens e o esquema da resposta e não conhece o dashboard. Uma análise nova, como as previstas para o estoque e o financeiro ([visao-geral.md](visao-geral.md), Evolução prevista), entra com a sua regra de dados agregados, as suas funções puras em `src/server/rules/` e a sua rota com a permissão da página, seguindo RS019 e RS020, sem mudar o adaptador.
