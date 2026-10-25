---
issue: 44
pull_request: 116
---

# Relatório: Serviços no painel: principal, complementar e adicional, com preços e vínculos

Em dois PRs, como aprovado em P1: o #115, da API e da migration (`Refs #44`), e o #116, da tela (`Closes #44`), este, sobre o #115. O relatório está completo, e o plano passou a `concluido` neste PR.

## O que foi feito

PR #115, API e migration:

- **Migration** `save_service`: grava o serviço, os valores por porte e os vínculos numa transação; com `p_id` e uma versão velha devolve `null` sem escrever; só o `service_role` a executa (decisão 0042).
- **Rotas** `GET` e `POST /api/admin/services` e `GET`, `PATCH` e `DELETE /api/admin/services/:id`, com `requirePermission("services")` (UC13, UC14, RF058 a RF066, RN006 a RN009, RN030, RN031, RN035, RS008, RS010, RNF010, RNF011):
  - lista por nome, 20 por página, sem os excluídos, com `type`, `includeInactive` e a busca por trecho do nome; o serviço de categoria inativa consta (RN031);
  - detalhe com os valores por porte, os vínculos (sem serviços excluídos) e `imageUrl`;
  - `POST` dos três tipos, sempre ativo, com os campos de outro tipo descartados, categoria ativa (L2) e vínculos conferidos (L3);
  - `PATCH` parcial, mesclado ao serviço atual e validado como o cadastro (L5), condicionado ao `updatedAt`; 404, 409 `VERSION_CONFLICT` e `NAME_IN_USE`;
  - `DELETE` marca `deleted_at`, mantém valores e vínculos e libera o nome; os agendamentos ficam intactos (RN030).
- **Esquemas** `serviceInputSchema`, `serviceUpdateSchema`, `serviceListQuerySchema` e a regra pura `mergeServiceUpdate`.
- **Especificação OpenAPI** das cinco operações.

PR #116, tela:

- **Aba "Serviços" ligada às rotas:** saem as cinco entradas de `src/lib/demo/routes.ts`, o arquivo `admin-catalog.ts` e o aviso da aba; o formulário usa o `serviceInputSchema` por um resolvedor próprio; `NAME_IN_USE` e a falha do salvar aparecem no topo da janela, com os dados mantidos; no conflito de versão o aviso fica no topo e o formulário recebe os dados atuais.
- **Imagem (L1):** o campo continua com a prévia e leva o aviso de demonstração dentro dele até a #47.
- **Foco (L6):** depois de desativar, vai a "Exibir inativos"; depois de excluir, ao campo de busca; cancelar a confirmação devolve o foco a "Excluir".
- A demonstração dos serviços vem do banco (`supabase/seed-demo.sql`, que já os tinha e não mudou).

## Arquivos alterados

- `supabase/migrations/20261025182500_save_service_function.sql` (novo).
- `src/app/api/admin/services/route.ts` e `[id]/route.ts` (novos); `src/server/repositories/services.ts` (novo); `src/server/services/catalog.ts`; `src/server/rules/services.ts` (novo); `src/shared/validation/catalog.ts` e `formats.ts` (`REQUIRED_MESSAGE` exportada).
- `src/components/admin/catalog/`: `service-form-resolver.ts` (novo), `service-wizard.tsx`, `service-form-dialog.tsx`, `service-data-step.tsx`, `service-prices-step.tsx`, `service-image-field.tsx`, `service-card.tsx`, `service-active-button.tsx`, `service-list.tsx`, `catalog-tabs.tsx` e o `README.md`; `src/app/(admin)/admin/services/page.tsx`.
- `src/lib/demo/routes.ts` e `admin-catalog.ts` (apagado).
- `tests/validation/catalog.test.ts`, `tests/rules/services.test.ts` (novo) e os `README.md` de `tests/rules/`, `src/server/rules/` e `src/shared/validation/`.
- `docs/plataforma/openapi.yaml`, `docs/catalogo/rotas.md`, `dados.md`, `UC13-cadastrar-servico.md` e `servicos-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.

Desvios do plano (ver `notas.md`): `formats.ts` exportou `REQUIRED_MESSAGE`; o `ServiceWizard` não é mais remontado por `key` no conflito; o foco usa `document.querySelector` no painel, então `paginated-list.tsx` não mudou; o PR 1 ficou com cerca de 680 linhas em `src/` (previstas ~520).

## Testes executados

- `npm run check`: sem erros nem avisos (555 testes, 57 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rotas e função SQL**, no banco local (`db reset` com as quatro migrations, `seed-demo.sql`, admin, dois funcionários e um cliente, `next start` na porta 3044), pelo roteiro `verify-services-api.mjs`, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `services` e para o cliente nas cinco operações; `POST` sem `Origin` 403; `text/plain` 415; nada gravado pelas recusadas; `no-store`;
  - lista (16 ativos, 17 com inativos, nunca o excluído, por nome, `type` com cada valor e inválido 400, `pageSize=100` volta 50, `page=0` 400, busca de 101 caracteres 400); busca por trecho sem diferenciar maiúsculas; `%`, `_`, `\`, vírgula, parêntese e aspas são texto (o `*` amplia o resultado, ver `notas.md`);
  - critérios 1 a 3: principal por porte com dois adicionais (201 ativo, quatro valores, vínculos nos dois lados, `startingPrice`), adicional sem categoria, descrição nem valores por porte e vinculado ao principal, complementar sem vínculos, principal de valor fixo sem valores por porte;
  - critério 4: valor zero, negativo, ausente em um porte, principal sem categoria, categoria inexistente e inativa, duração 4, vínculo inexistente, de tipo errado e de serviço excluído, tipo inválido: 400 com a mensagem no campo; nada gravado;
  - critério 6: `NAME_IN_USE` com a caixa trocada e com espaços, duas gravações do mesmo nome ao mesmo tempo (uma 201, uma 409), nada gravado pelas recusadas;
  - critério 7: desativar, listar com e sem `includeInactive`, reativar, com valores e vínculos intactos; `updatedAt` antigo 409 `VERSION_CONFLICT` sem gravar; só `updatedAt` 400; troca de por porte para fixo e de volta (valores certos no banco, sem a antiga); troca sem os novos valores 400; vínculos trocados e esvaziados; `type` no corpo ignorado; categoria inativa mantida na edição (RN031) e recusada na troca;
  - critério 8: `DELETE` de "Lavagem simples" (58 itens de agendamento) 204; some da lista e do detalhe, `PATCH` e `DELETE` repetidos 404, agendamentos, itens e cópias intactos, linha com `deleted_at`; o adicional excluído sai dos vínculos do principal, e o nome pode ser usado de novo;
  - critério 9 e RS011: a retirada de `services` do cargo muda o 200 para 403 na requisição seguinte;
  - `save_service` direto: chave de valor ausente, valor zero e vínculo de tipo errado → erro e nada gravado; serviço fixo ignora `p_prices`; versão velha → `null`; `anon` sem permissão para executar.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro (`ui-services.mjs`), tudo certo:
  - **Estados:** carregamento (esqueleto, requisição retida), falha da leitura com "Tentar novamente" e releitura, acesso negado (403 com a mensagem da API), vazio sem filtro e com busca ("Limpar filtros" leva o foco à busca), sem categoria ativa ("Cadastre uma categoria antes de criar este serviço." e "Ir para as categorias" leva à aba), adicional sem principal cadastrado ("Nenhum serviço principal cadastrado."), falha do salvar (aviso no topo, janela aberta, dados mantidos), falha do desativar e do excluir, sem aviso de demonstração na aba e com ele dentro do campo de imagem, sem transbordo horizontal;
  - **Fluxos:** escolha do tipo; principal em três etapas com as mensagens de cada etapa e o foco no primeiro campo inválido; cadastro com valores por porte e dois adicionais (aparece em "A partir de R$ 50,00"); edição com os valores e os vínculos carregados; `NAME_IN_USE` com o aviso no topo e os dados mantidos; `VERSION_CONFLICT` com duas janelas (aviso no topo e o formulário com o dado gravado pela outra); adicional em uma etapa e complementar em duas, com valor fixo; desativar (o cartão sai e o foco vai a "Exibir inativos"), exibir inativos ("Inativo" e "Reativar"), reativar; excluir com o texto da confirmação, "Voltar" devolvendo o foco a "Excluir", falha dentro da confirmação e exclusão com o foco na busca;
  - **Teclado** (`ui-keyboard-services.mjs`): Enter abre a janela com o foco dentro; setas na escolha do tipo e Tab até "Continuar"; Esc devolve o foco a "Novo serviço"; ordem da etapa 1 (categoria, forma de precificação, duração, nome, descrição, imagem, "Cancelar", "Próximo"); "Próximo" vazio leva o foco à categoria; categoria por teclado; o foco vai ao título de cada etapa; caixas de vínculo por Espaço; falha do salvar com o foco no aviso do topo; "Editar" com Esc devolvendo o foco; "Desativando…" mantém o foco (`aria-disabled`) e depois o foco vai ao interruptor; "Excluir" com o foco inicial em "Voltar", Esc devolve o foco a "Excluir", e a exclusão leva o foco à busca;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/services` (navegação) e 1,0 nas 68 capturas de estado (17 estados nas quatro combinações: lista, busca sem resultado, falha da leitura, vazio, janela de tipo, principal nas etapas 1 a 3 e com os erros, falha do salvar, sem categoria, adicional e com erros, complementar, edição e confirmação de exclusão);
  - **Desempenho (navegação, `next start` local):** celular LCP 3,3 s, CLS 0, TBT 110 a 150 ms, desempenho 0,9; computador LCP 0,7 a 0,8 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (as cinco operações e os esquemas de serviço), `docs/catalogo/rotas.md`, `dados.md`, `UC13-cadastrar-servico.md` e `servicos-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md` (duas mensagens) e `docs/padroes/testes.md`.
- Lacunas resolvidas: L1 → opção 1 (campo de imagem com o aviso de demonstração, `imagePath` fora do corpo) → `rotas.md` e `servicos-do-painel.md`; L2 → opção 1 (categoria ativa quando escolhida) → `rotas.md` e `mensagens-de-validacao.md`; L3 → opção 1 (vínculos conferidos, leituras ignoram o excluído) → `rotas.md`, `dados.md` e `mensagens-de-validacao.md`; L4 → opção 1 (trecho do nome) → `rotas.md`; L5 → opção 1 (`PATCH` parcial mesclado) → `rotas.md`; L6 → opção 1 (foco depois de desativar e excluir) → `servicos-do-painel.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`/api/admin/services`: o corpo por tipo, o `PATCH` parcial, os 400 de categoria e vínculos e o 409 `VERSION_CONFLICT`) e a seção de dados (a exclusão lógica mantém valores e vínculos; a `save_service`); Análise do Sistema, UC13 passo 10 (categoria ativa e vínculos de serviços cadastrados).

## Pendências

- **Do Yvan:** aplicar a migration `20261025182500_save_service_function.sql` com `npx supabase db push` (antes de incorporar o #115 e antes de conferir a tela na pré-visualização); carregar o `supabase/seed-demo.sql` no SQL Editor, se ainda não carregou, para os serviços de demonstração; conferir logado, na pré-visualização, `/admin/services` (lista, cadastro dos três tipos, edição, desativação, reativação e exclusão) e o LCP do celular. A pré-visualização usa o banco de produção (decisão 0030): os serviços criados nela são dados reais.
- Imagem do serviço (envio, prévia real, remoção e `image_path`), com o aviso de demonstração no campo: #47. Catálogo público: #48. Serviços do agendamento pelo painel e pelo cliente: #49 e #107.
- Limite conhecido: as listas de vínculo do formulário leem até 50 serviços por tipo (`MAX_PAGE_SIZE`); acima disso os demais não aparecem para vincular.
