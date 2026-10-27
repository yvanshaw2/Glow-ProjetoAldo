---
issue: 47
titulo: "Imagem dos serviços no Storage"
areas: [frontend, backend, testes]
tipo: funcionalidade
requisitos: [UC13, UC14, RS008, RS015, RS016, RNF006]
status: concluido
aprovado_por: yvan
aprovado_em: 09:45 - 27/10/2026
---

# Plano: Imagem dos serviços no Storage

## Objetivo

Permitir enviar a imagem de um serviço principal ou complementar no cadastro (UC13, passo 4 e FE02) e na edição (UC14), guardada no bucket `service-images` do Supabase Storage. A rota `POST /api/admin/services/image` confere o tipo pelo conteúdo do arquivo e o tamanho (JPEG, PNG ou WebP, até 2 MB; RS015), grava com nome gerado pelo servidor e devolve o caminho e o endereço público. O campo de imagem do formulário (criado na #63 só com a prévia) passa a enviar o arquivo, e o cadastro e a edição gravam o `imagePath`, com troca e remoção. A imagem já gravada aparece pelo componente de imagem do Next.js (RNF006). Não há migration: a coluna `image_path` e o bucket já existem (decisão 0044).

## Base

- Worktree `37-dados-da-empresa-1b1de5`, ramificação `claude/angry-neumann-a99adb`, igual à `origin/main` (9fb11a2, com a #44, a #63 e a #51 incorporadas). Plano e notas sem commit, como nas etapas 01 anteriores.
- Dependências da issue: #44 (rotas de serviços) e #63 (campo de imagem com a prévia) estão na `main`.
- O que já existe: coluna `services.image_path`; bucket com leitura pública, 2 MB e os três tipos; `imageUrlOf` no repositório (endereço público a partir do caminho); `ServiceImageField` com a prévia e o aviso de demonstração; `save_service` não recebe o caminho da imagem (o comentário da migration diz que ela é "salva por rota própria").
- `docs/padroes/api.md` já abre a exceção do envio de imagem (corpo que não é JSON e limite de 2 MB), mas o tratamento único (`src/server/http/handler.ts`) lê todo corpo de gravação como JSON de até 100 KB: o envio de imagem exige uma saída própria nele.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado uma imagem JPEG de 1 MB, quando a envio no cadastro de um serviço principal, então a prévia aparece e o serviço é gravado com a imagem (UC13) | Local, na tela e pelo roteiro: o serviço volta com `imageUrl` e o arquivo existe no bucket do Supabase local |
| Dado um PDF, ou um arquivo de outro tipo renomeado para `.png`, quando o envio, então recebo a mensagem de formato inválido e nada é gravado no bucket (UC13 FE02, RS015) | Teste de `findImageType` (assinaturas dos bytes); local, pelo roteiro: 400 com `fields.file` e nenhum objeto novo no bucket |
| Dado uma imagem de 3 MB, quando a envio, então recebo a mensagem de tamanho excedido (UC13 FE02, RS015) | Teste de `validateImageFile`; local, pelo roteiro: 413 `PAYLOAD_TOO_LARGE` e, na tela, a mensagem do campo (L2) |
| Dado um serviço com imagem, quando troco a imagem na edição, então o painel passa a mostrar a nova (UC14) | Local, na tela: abre a edição com a imagem atual, escolhe outra, salva e reabre |
| Dado um serviço com imagem, quando removo a imagem na edição, então o serviço passa a não ter imagem (UC14) | Teste de `mergeServiceUpdate` (`imagePath: null`); local, na tela |
| Dado um serviço adicional, quando o cadastro, então não há campo de imagem (UC13 FA01) | Local, na tela; teste do esquema: `imagePath` do adicional é descartado (RS013) |
| Dado um funcionário sem a permissão `services`, um cliente ou ninguém com sessão, quando chama a rota, então recebe 403, 403 ou 401 (RS008) | Local, pelo roteiro, com as contas de teste; sem `Origin`, 403 |
| Dado um `imagePath` que não foi gerado pelo envio (outro bucket, `..`, outra extensão), quando o cadastro o recebe, então a resposta é 400 em `imagePath` (RS015) | Teste do esquema `imagePath` |
| Dado a imagem de um serviço, quando a página a exibe, então ela passa pelo componente de imagem do Next.js, com o domínio do Storage liberado (RNF006) | Local, na tela: o endereço servido é o de `/_next/image` (Riscos e dúvidas, domínio do Storage) |

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`: o campo de imagem nos estados (vazio, escolhida, enviando, inválida, atual na edição e removida), a 360 × 800 primeiro e a 1440 × 900, claro e escuro, pelo teclado, e o Lighthouse de acessibilidade sem auditoria reprovada. LCP e CLS de página: não há página nova (o formulário é uma janela do `/admin`).

## Como funciona

### Contrato da rota (`docs/catalogo/rotas.md`)

`POST /api/admin/services/image`, `requirePermission("services")` (RS008).

- **Entrada:** `multipart/form-data` com o campo `file` (L1). Outros campos são ignorados.
- **Conferências** (RS015), pela função pura `validateImageFile`: o arquivo existe; o tamanho tem até 2 MB (2.097.152 bytes); o tipo vem da assinatura dos primeiros bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF`… `WEBP`), nunca do nome nem do `Content-Type` do arquivo.
- **Gravação:** no bucket `service-images`, no caminho `services/<uuid>.<jpg|png|webp>`, com o nome gerado pelo servidor (`crypto.randomUUID`) e o tipo detectado como `contentType`; sem sobrescrever (`upsert: false`).
- **Resposta 201:** `{ imagePath, imageUrl }`. Erros: 400 `VALIDATION_ERROR` com `fields.file` (ausente ou formato inválido); 413 `PAYLOAD_TOO_LARGE` (acima de 2 MB); 415 (não é `multipart/form-data`); 401; 403; 500 se o Storage falhar (o detalhe só no registro).

### Cadastro e edição

- `POST` e `PATCH /api/admin/services` passam a aceitar `imagePath` (principal e complementar; o adicional o descarta). No `PATCH`, ausente mantém a imagem; `null` a remove (UC14).
- O esquema aceita só o caminho que o envio gera: `services/<uuid>.(jpg|png|webp)`.
- O caminho é gravado por uma atualização própria do repositório (`setServiceImage`), depois de `save_service`, sem migration (L3 abaixo explica a alternativa). Na edição, a versão (`updatedAt`) continua conferida por `save_service`, e a resposta é lida depois da imagem.
- Não há limpeza do arquivo antigo no bucket (fora do escopo da issue).

### Backend

| Camada | Arquivo | Faz |
|---|---|---|
| Tratamento único | `src/server/http/handler.ts` | opção `body: "multipart"` em `handleRoute`: não lê o corpo como JSON, exige `multipart/form-data` (415) e recusa acima de 2 MB mais a folga do formato (413) |
| Rota | `src/app/api/admin/services/image/route.ts` | `POST`: guard, `request.formData()`, `validateImageFile`, envio ao Storage e `respondCreated` |
| Regras | `src/server/rules/service-image.ts` | `findImageType(bytes)` e `validateImageFile({ size, bytes })`, puras |
| Storage | `src/server/supabase/storage.ts` | `uploadServiceImage({ bytes, type })` com o cliente de serviço; devolve o caminho; falha vira erro lançado |
| Repositório | `src/server/repositories/services.ts` | `setServiceImage(id, path \| null)` e a leitura de `imageUrl` já existente |
| Serviço | `src/server/services/catalog.ts` | `createService` e `updateService` gravam o `imagePath` depois de `save_service` |
| Regras | `src/server/rules/services.ts` | `mergeServiceUpdate` leva `imagePath` |
| Validação | `src/shared/validation/catalog.ts` | `imagePathSchema` e o campo opcional nos esquemas do serviço |

### Tela

- `src/lib/api-client.ts`: `apiRequest` aceita `FormData` no corpo (envia como está, sem `Content-Type` fixo para o navegador pôr o `boundary`), sem mexer no JSON.
- `ServiceImageField`: tira o aviso de demonstração. Ao escolher o arquivo, a prévia aparece na hora, como hoje, e o envio acontece ao confirmar o formulário (não ao escolher), para não deixar arquivo no bucket de quem desiste (L4). Estados: enviando (botão de salvar com "Salvando…", como o formulário), falha do envio (a mensagem no campo, o formulário continua aberto). Na edição, o campo mostra a imagem atual pelo `next/image` (alt "Imagem atual do serviço"), com "Trocar" (escolher outro arquivo) e "Remover imagem".
- `service-form-values.ts`: o valor `image` passa a `{ kind: "new", file, previewUrl } | { kind: "saved", url } | null`, e `toRequestBody` leva o `imagePath` (novo, vindo do envio) ou `null` (removida).
- `service-form-dialog.tsx`/`service-wizard.tsx`: o envio antes do `POST`/`PATCH`; falha de um dos dois mostra o aviso do formulário e não repete a chamada sozinha (`api.md`).
- `next.config.ts`: `images.remotePatterns` do domínio do Storage (Riscos e dúvidas).

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/services/image/route.ts` | criar |
| `src/app/api/admin/services/image/README.md` | criar |
| `src/server/http/handler.ts`, `src/server/http/README.md` | alterar: opção de corpo multipart |
| `src/server/rules/service-image.ts`, `src/server/rules/README.md` | criar e alterar |
| `src/server/rules/services.ts` | alterar: `imagePath` na mesclagem |
| `src/server/supabase/storage.ts`, `src/server/supabase/README.md` | criar e alterar |
| `src/server/repositories/services.ts` | alterar: `setServiceImage` |
| `src/server/services/catalog.ts` | alterar: gravar o `imagePath` |
| `src/shared/validation/catalog.ts` | alterar: `imagePath` |
| `src/shared/api/catalog.ts` | alterar: tipo da resposta do envio |
| `src/lib/api-client.ts` | alterar: corpo `FormData` |
| `src/components/admin/catalog/service-image-field.tsx` | alterar: envio, imagem atual, sem aviso de demonstração |
| `src/components/admin/catalog/service-form-values.ts`, `service-wizard.tsx` | alterar: valor da imagem e envio antes da gravação |
| `src/components/admin/catalog/service-form-resolver.ts` | alterar: o erro `file` e `imagePath` da API vai ao campo `image` (fora da lista original, confirmado no PR) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as duas mensagens da imagem (fora da lista original, confirmado no PR) |
| `next.config.ts` | alterar: `images.remotePatterns` |
| `tests/rules/service-image.test.ts` | criar |
| `tests/rules/services.test.ts` | alterar: `imagePath` na mesclagem |
| `tests/validation/catalog.test.ts` | alterar: `imagePath` |
| `tests/http/handler.test.ts` | alterar: corpo multipart |
| `tests/lib/api-client.test.ts` | alterar: corpo `FormData` |
| `docs/plataforma/openapi.yaml` | alterar: o caminho `POST /api/admin/services/image`, `imagePath` nos corpos e `ServiceImage` |
| `docs/catalogo/rotas.md`, `servicos-do-painel.md` | alterar: o contrato do envio (L1, L2) e a tela sem o aviso |
| `docs/padroes/api.md` | alterar: o limite do envio de imagem no tratamento único (L2) |
| `memoria/tarefas/47-imagem-dos-servicos/` | plano, notas e, no fim, `02_relatorio.md` |

### Em comum com outras tarefas

- `src/lib/api-client.ts` e `src/server/http/handler.ts`: arquivos transversais; uma tarefa aberta que os altere conflita (conferir os PRs abertos antes de construir).
- `next.config.ts`: a #48 (página pública) lê as mesmas imagens, mas não altera o arquivo.
- `src/lib/demo/`: a rota de envio não está na lista de demonstração (a #63 não a pôs), então nada sai de lá.

## Testes previstos

Sem banco, rede nem navegador (decisões 0035 e 0052).

`tests/rules/service-image.test.ts`:

- detects a JPEG, a PNG and a WebP by the first bytes
- ignores the name and the declared type of the file
- rejects a PDF, a text file and an SVG → `null` type
- rejects a file renamed to `.png` that is not an image
- rejects an empty file and one shorter than the signature
- accepts a file of exactly 2 MB and rejects one byte more → `"TOO_LARGE"`
- reports the size before the format of a file over 2 MB

`tests/rules/services.test.ts`, novos casos:

- keeps the image when the update has no `imagePath`
- replaces the image with the new path
- removes the image with `null`

`tests/validation/catalog.test.ts`, novos casos:

- accepts the path the upload generates
- rejects another bucket, a `..`, a different extension and a path without the uuid → "Informe uma imagem válida."
- discards `imagePath` of an additional service (RS013)

`tests/http/handler.test.ts`, novos casos:

- reads no JSON body of a route with a multipart body
- answers 415 when the content type of such a route is not multipart
- answers 413 above the limit of the image, and still 413 above 100 KB for the JSON routes

`tests/lib/api-client.test.ts`, novo caso:

- sends a `FormData` body as is, with no JSON content type

Rota, Storage, serviço e campo são conferidos à mão (decisão 0052), com o Supabase local.

## Documentação

- `docs/catalogo/rotas.md`: o campo `file`, a resposta `imagePath` e `imageUrl`, os erros 400 e 413, e `imagePath` na entrada do cadastro e da edição (no lugar de "a imagem é gravada pela rota de envio (#47); até lá o serviço é cadastrado sem imagem").
- `docs/catalogo/servicos-do-painel.md`: o campo de imagem sem o aviso de demonstração, com os estados novos e a mensagem de tamanho.
- `docs/padroes/api.md`: o limite de 2 MB e a saída do tratamento único.
- OpenAPI, no mesmo PR (`api.md`).
- Nenhuma decisão nova. Os `.docx` não mudam nesta tarefa.

## Lacunas na documentação

Cada lacuna traz o problema, as opções e o texto proposto, que corresponde à opção recomendada. Marque com `x` a opção escolhida.

### L1. Campo e resposta do envio

**Problema.** `rotas.md` diz "arquivo em `multipart/form-data`" e "caminho e endereço da imagem", sem os nomes dos campos.

**Opções:**

- [x] **1. Campo `file`; resposta `{ imagePath, imageUrl }` (recomendada).** O mesmo nome do `imageUrl` das leituras e do `imagePath` que o cadastro recebe; o corpo do envio entra direto no corpo do cadastro.
- [ ] **2. Campo `image`; resposta `{ path, url }`.** Mais curto, mas os nomes mudam entre o envio e o cadastro.

**Texto proposto:** `rotas.md`, `POST /api/admin/services/image`: "Entrada: o arquivo, no campo `file` de `multipart/form-data`. Resposta: **201** `imagePath` e `imageUrl`; 400 formato inválido, em `file`; 413 acima de 2 MB." E, no cadastro e na edição, "`imagePath` (principal e complementar; `null` na edição remove a imagem)".

### L2. Tamanho excedido: 400 ou 413

**Problema.** `rotas.md` responde 400 para "formato ou tamanho inválido", e `api.md` responde 413 para imagem acima de 2 MB; a issue pede a mensagem de tamanho excedido.

**Opções:**

- [x] **1. 413 `PAYLOAD_TOO_LARGE` para o tamanho; 400 com `fields.file` para o formato (recomendada).** Segue `api.md` e o catálogo de erros que já existe. A tela mostra a mesma mensagem do campo ("Use uma imagem JPEG, PNG ou WebP de até 2 MB.") nos dois casos.
- [ ] **2. 400 com `fields.file` nos dois casos.** Uma resposta só, mas contraria `api.md` e deixa o 413 sem uso para imagens.

**Texto proposto:** `rotas.md`, "Resposta: **201** …; 400 formato inválido; 413 acima de 2 MB." `api.md` não muda além da frase sobre o tratamento único.

### L3. Como gravar o caminho da imagem

**Problema.** `save_service` não recebe `image_path`; o comentário da migration diz que a imagem é salva "por rota própria", e a issue manda gravar o `imagePath` no cadastro e na edição.

**Opções:**

- [x] **1. Atualização própria depois de `save_service`, sem migration (recomendada).** `setServiceImage` grava só a coluna `image_path`. Uma gravação a mais, e uma falha entre as duas deixaria o serviço salvo sem a imagem (a tela avisa e a pessoa tenta de novo). Evita migration, que o Yvan teria de aplicar.
- [ ] **2. Migration que acrescenta `p_image_path` a `save_service`.** Uma transação só, mas exige migration (uma nova função, com o `drop` da antiga) aplicada pelo Yvan antes da pré-visualização e mexe numa função já em uso.

**Texto proposto:** `docs/catalogo/dados.md`, depois da frase do bucket: "O caminho é gravado por uma atualização própria, depois de `save_service`."

### L4. Quando o arquivo é enviado

**Problema.** Nem o UC13 nem `servicos-do-painel.md` dizem se o arquivo sobe ao escolhê-lo ou ao salvar.

**Opções:**

- [x] **1. Ao confirmar o formulário (recomendada).** Quem desiste não deixa arquivo no bucket, e a limpeza de arquivos sem uso fica mesmo fora do escopo. O envio acontece uma vez, antes do `POST` ou do `PATCH`.
- [ ] **2. Ao escolher o arquivo.** A prévia vem do servidor e erros de formato aparecem na hora, mas cada escolha ou desistência deixa um arquivo órfão.

**Texto proposto:** `servicos-do-painel.md`, Imagem: "O arquivo é enviado ao confirmar o cadastro ou a edição; a prévia é local."

## Decisões técnicas

- Seguidas: 0003, 0005 e 0036 (rota, serviço, repositório e a permissão na API); 0008 (um esquema para a rota e o formulário); 0017 (código em inglês, textos em português); 0025 e 0026 (Problem Details; rota nova sem mudar contrato existente); 0035 e 0052 (TDD nas regras e nos esquemas; rota, Storage e campo à mão); 0044 (o bucket vem da migration inicial); 0055 (a rota de envio não estava na lista de demonstração).
- Nenhuma nova. Escolhas locais, sem registro: a opção `body: "multipart"` do `handleRoute`; o caminho `services/<uuid>.<ext>`; o envio de arquivo pelo `apiRequest` com `FormData`; a assinatura dos bytes como prova do tipo, sem biblioteca nova.

## Riscos e dúvidas

- **Domínio do Storage no `next/image`.** O endereço público é `https://<projeto>.supabase.co/storage/v1/object/public/service-images/...`, e o `next.config.ts` não pode depender de `SUPABASE_URL` no build (a imagem do contêiner é construída sem as variáveis). Proposta: `remotePatterns` fixo para `*.supabase.co` com o caminho `/storage/v1/object/public/service-images/**`. Localmente, o otimizador do Next recusa o endereço do Supabase local (IP privado); a verificação local usa uma variável só de `.env.local`/ambiente do build local para liberar IP local, não definida na Vercel nem no contêiner. Se preferir, a verificação local confere só o endereço público do Storage e deixa o `next/image` para a pré-visualização: diga qual.
- **Tamanho do multipart.** O corpo traz o arquivo mais o cabeçalho do formato, então o limite de corpo da rota é de 2 MB mais uma folga de 4 KB; a conferência exata do arquivo (2.097.152 bytes) é a da função pura.
- **Arquivo órfão.** Troca, remoção e falha depois do envio deixam arquivo no bucket; a limpeza está em "Fora do escopo", como a issue diz.
- **Conflito.** `api-client.ts` e `handler.ts` são arquivos transversais; antes de construir, conferir os PRs abertos.
- **Sem migration e sem dependência nova.**

## Fora do escopo

- Limpeza de arquivos sem uso no bucket.
- Imagem para o serviço adicional, ou mais de uma imagem por serviço.
- Recorte, redimensionamento ou conversão da imagem no servidor.
- O catálogo público e a página inicial (#48).
- Testes automatizados da rota, do Storage e do campo (decisão 0052).
