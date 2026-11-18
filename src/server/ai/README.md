# `src/server/ai/` – Serviço de inteligência artificial

O adaptador do modelo de linguagem do produto (decisão 0054): `chat-completion.ts`, com `requestChatCompletion`, que faz uma chamada no formato Chat Completions, com `fetch` e sem SDK, pede a resposta por esquema JSON estrito e devolve o texto e os tokens usados, ou o motivo da falha. Lê `AI_BASE_URL`, `AI_MODEL` e `AI_API_KEY` a cada chamada; sem alguma delas, responde `not_configured`. Interrompe a chamada em 15 segundos e nunca a repete.

## Vai aqui

- o adaptador, que não conhece o dashboard: recebe as mensagens, o esquema e o limite de saída

## Não vai aqui

- as mensagens, o esquema da resposta e a conferência dela (→ `src/server/rules/`, como `dashboard-analysis.ts`)
- o registro da chamada (→ o serviço que a usa, sem a chave, as mensagens nem a resposta, RS018)
- SDK de IA ou chave escrita no código (RS016)

## Referências

- `docs/plataforma/servico-de-ia.md`
- `docs/plataforma/seguranca.md` (RS019, RS020)
- decisão 0054 (`docs/decisoes/`)
