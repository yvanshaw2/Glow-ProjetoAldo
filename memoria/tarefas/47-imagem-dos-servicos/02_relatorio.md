---
issue: 47
pull_request: 125
---

# Relatório: Imagem dos serviços no Storage

## O que foi feito

- **Envio da imagem** (UC13 passo 4 e FE02, RS015): `POST /api/admin/services/image`, com `requirePermission("services")`, que recebe o arquivo no campo `file`, confere o tipo pelos primeiros bytes (JPEG, PNG ou WebP) e o tamanho (até 2 MB), grava no bucket `service-images` com nome gerado pelo servidor (`services/<uuid>.<jpg|png|webp>`) e devolve `imagePath` e `imageUrl`. Formato inválido ou sem arquivo: 400 em `file`; acima de 2 MB: 413; outro tipo de corpo: 415.
- **Cadastro e edição** (UC13, UC14): `POST` e `PATCH /api/admin/services` aceitam `imagePath` (só o caminho que o envio gera); no `PATCH`, `null` remove a imagem e a ausência a mantém; o serviço adicional o descarta. O caminho é gravado por `setServiceImage`, depois de `save_service`, sem migration.
- **Tela:** o campo de imagem tira o aviso de demonstração, envia o arquivo ao confirmar o formulário, mostra na edição a imagem atual pelo componente de imagem do Next.js (`remotePatterns` do Storage em `next.config.ts`, RNF006) e leva o erro da rota de volta à etapa do campo.
- **Tratamento único e cliente da API:** `handleRoute(route, { body: "multipart" })` confere o tipo e o tamanho (2 MB mais a folga do formato) e deixa a leitura do formulário à rota; `apiRequest` aceita `FormData`.
- **Defeito achado na verificação local e corrigido:** a requisição refeita pelo tratamento único falhava com a `NextRequest` do Next.js; agora é montada com `new Request(request.url, { method, headers, body })`.

## Arquivos alterados

- `src/app/api/admin/services/image/route.ts` — a rota de envio.
- `src/server/http/handler.ts` — a opção `body: "multipart"`; `src/server/http/README.md`.
- `src/server/rules/service-image.ts` — `findImageType` e `validateImageFile`; `src/server/rules/README.md`.
- `src/server/rules/services.ts` — `imagePath` na mesclagem da edição.
- `src/server/supabase/storage.ts` — `uploadServiceImage` e `getImageUrl`; `src/server/supabase/README.md`.
- `src/server/repositories/services.ts` — `setServiceImage`; o endereço da imagem pelo `getImageUrl`.
- `src/server/services/catalog.ts` — `uploadServiceImage` e a gravação do `imagePath` no cadastro e na edição.
- `src/shared/validation/catalog.ts`, `src/shared/api/catalog.ts` — o esquema de `imagePath` e o tipo `ServiceImage`.
- `src/lib/api-client.ts` — corpo `FormData`.
- `src/components/admin/catalog/` — `service-image-field.tsx`, `service-form-values.ts`, `service-form-resolver.ts`, `service-wizard.tsx`.
- `next.config.ts` — `images.remotePatterns` do Storage.
- `tests/rules/service-image.test.ts` (novo), `tests/rules/services.test.ts`, `tests/validation/catalog.test.ts`, `tests/http/handler.test.ts` e `tests/lib/api-client.test.ts`.
- `docs/catalogo/rotas.md`, `docs/catalogo/servicos-do-painel.md`, `docs/catalogo/dados.md`, `docs/padroes/api.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/plataforma/openapi.yaml`.
- `memoria/tarefas/47-imagem-dos-servicos/`.

## Testes executados

- `npm run check`: aprovado, com 34 arquivos e 688 testes, sem erros nem avisos.
- Local, com o Supabase local, o `seed-demo.sql`, `next build` e `next start` (o Storage local no lugar do real) e `verify-image-api.mjs`: 25 verificações aprovadas — 401, 403 (cliente, funcionário sem a permissão e sem `Origin`), PNG e JPEG de 1 MB, 2 MB exatos, 2 MB e um byte e 3 MB (413), PDF e arquivo vazio (400), sem o campo `file` (400), corpo JSON (415), nome gerado pelo servidor, nenhum objeto gravado nas recusas, `imagePath` no cadastro, na troca, na ausência, na remoção, com versão antiga (409, sem mexer na imagem) e no adicional, e o endereço público servindo a imagem.
- Local, `ui-image.mjs`, em 360 × 800 e 1440 × 900, nos temas claro e escuro: sem aviso de demonstração, arquivo de texto recusado na escolha, arquivo de texto com nome `.png` recusado pela rota com a mensagem no campo e a janela aberta, prévia sem enviar nada, falha do envio (500 interceptado) com a janela aberta e nada gravado, nova tentativa gravando a imagem, imagem atual da edição servida por `/_next/image`, Tab do campo a "Remover imagem" e o foco de volta ao campo, remoção gravada, serviço adicional sem o campo, sem rolagem horizontal. Nenhum erro no console além do `favicon.ico` e do 401 de `/api/auth/me` antes do login.
- Lighthouse de acessibilidade em `/admin/services` (navegação, celular e computador, claro e escuro): 1,00 nas quatro; LCP do celular 3,5 s, CLS 0 (computador: LCP 0,8 s). Em snapshot, 1,00 nos cinco estados (lista, janela sem imagem, imagem escolhida, imagem atual e arquivo inválido), nas quatro combinações.
- O `next/image` local exigiu `dangerouslyAllowLocalIP` e a porta do Supabase local numa cópia temporária do `next.config.ts`, revertida antes do commit. O `*.supabase.co` real não foi exercitado: fica para a pré-visualização.
- Manual na pré-visualização: a conferir pelo Yvan (cadastro com imagem JPEG, troca, remoção, PDF renomeado para `.png`, imagem de 3 MB e a exibição pelo `next/image` com o domínio do Supabase hospedado).

## Documentação atualizada

- Módulos: `docs/catalogo/rotas.md`, `servicos-do-painel.md` e `dados.md`; `docs/padroes/api.md`; `docs/plataforma/mensagens-de-validacao.md`; OpenAPI (a rota `uploadServiceImage`, `imagePath` no cadastro e na edição, `ServiceImage` e a resposta `PayloadTooLarge`).
- Lacunas resolvidas, todas com a opção 1:
  - L1 (campos) → `file`; `imagePath` e `imageUrl` → `rotas.md`;
  - L2 (tamanho) → 413 para o tamanho, 400 em `file` para o formato → `rotas.md`;
  - L3 (gravação do caminho) → atualização própria depois de `save_service`, sem migration → `dados.md`;
  - L4 (momento do envio) → ao confirmar o formulário → `servicos-do-painel.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum nesta tarefa (a atualização dos `.docx` com a lógica das demais issues fica para perto da AV3).

## Pendências

- Pré-visualização pelo Yvan, como na seção de testes.
- Limpeza dos arquivos sem uso no bucket (troca, remoção e falha depois do envio): fora do escopo da issue.
- #48 (página inicial e catálogo público), que depende desta issue.
