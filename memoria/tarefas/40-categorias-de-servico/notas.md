# Notas: 40-categorias-de-servico

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-24 – descoberta

Conferências do planejamento, sem alterar o código do projeto:

- **Worktree.** `36-regras-do-agendamento-05611e`, na ramificação `claude/musing-euler-79cd9c`, em 18192be, igual à `origin/main` (#104, com a #65). O plano e as notas ficam sem commit, como nas etapas 01 anteriores. A etapa 02 cria `feat/40-categories` a partir da `origin/main`. Sem `node_modules` no worktree.
- **Banco.** `categories` já existe na migration inicial: `name` e `description` obrigatórios, `is_active` padrão verdadeiro, `uq_categories_name` em `lower(name)`, gatilho `trg_categories_updated_at` e `services.category_id` com `on delete restrict`. O `seed.sql` não cria categorias (só o `seed-demo.sql`). Sem migration.
- **Formatos prontos.** `entityNameSchema` (2 a 60), `plainTextSchema` com `DESCRIPTION_MAX_LENGTH` (500), `idSchema`, `paginationSchema` e `updatedAtSchema` já existem e são testados. Falta só o booleano da consulta (`includeInactive`).
- **Molde.** `settings/company` (#37) é a única rota real do painel: rota fina, serviço que lança `AppError("VERSION_CONFLICT")` quando o `update` condicionado ao `updated_at` não devolve linha, repositório que converte as colunas. Aqui o `PATCH` ainda precisa separar 404 de 409 (lê a linha quando o `update` não devolve nada).
- **Tela atual (#63).** A janela de categoria usa `mode: "onTouched"` e `validate` manual; `CategoryCard` envia o `updatedAt` do cartão na confirmação; `service-data-step.tsx` já lê `GET /api/admin/categories` com `pageSize` 50 (só as ativas), então passa às categorias reais sem mudar. O `DemoNotice` está em `page.tsx`, acima das duas abas; `componentes.md` já permite "no topo do painel da aba".
- **Demonstração.** `routes.ts` tem `GET`, `POST` e `PATCH` de categorias; `admin-catalog.ts` usa a lista `CATEGORIES` também nos serviços de demonstração, então só sai `answerAdminCategories`.
- **OpenAPI.** Tem as tags `auth`, `public` e `settings`, e as respostas `Unauthenticated`, `PanelForbidden` e `VersionConflict` da #37. Faltam a tag do catálogo e as respostas `NotFound` e `NameInUse`.
- **Roteiros de verificação.** Existem em `61-scripts-de-verificacao/` e no scratchpad da sessão da #65 (`helpers.mjs`, `verify-category.mjs`, `verify-keyboard.mjs`, `verify-states.mjs`, `lh-*`, `make-admin.mjs`); serão recriados com os caminhos deste worktree na etapa 02.

## 2026-10-24 – decisão

Plano gravado em `aguardando_aprovacao`, com as lacunas:

- L1, `PATCH` sem nenhum campo: recomendado 400 `VALIDATION_ERROR`;
- L2, conflito de versão na confirmação de desativar e reativar: recomendado aviso dentro da confirmação e cartão lido de novo.

- L3, mensagem do `includeInactive` inválido: recomendado "Informe true ou false.", em linha nova de `mensagens-de-validacao.md`.

E os pontos à parte: P1 (dois PRs: API e tela), P2 (ambiente de verificação) e P3 (arquivo fora da lista, com confirmação).

Nenhuma decisão técnica nova. Sem migration nem dependência nova. Nada foi construído.

Pontos explícitos para a aprovação:

- dois PRs encadeados ou um só (cerca de 420 linhas em `src/`);
- na pré-visualização, as categorias criadas gravam no banco de produção (decisão 0030);
- as chaves do banco local no `next start`, as contas de teste no banco local e o cookie de teste no Lighthouse.

## 2026-10-24 – desvio

- **Foco depois de desativar.** Com a rota real, a categoria desativada some da listagem que oculta as inativas, e com ela o botão que abriu a confirmação: o foco ia para o `body` (RNF005). `componentes.md` só diz que volta ao botão que abriu o diálogo; o caso do botão que some não está documentado. Implementado: `CategoryCard` recebe `isInactiveShown` e, ao desativar sem os inativos à mostra, leva o foco ao interruptor "Exibir inativos" do painel; nos demais casos o foco volta ao botão. Arquivo fora da lista aprovada: `category-list.tsx` (uma propriedade). Aguarda a confirmação do Yvan; texto proposto para `docs/padroes/componentes.md`, Diálogos: "Quando a ação tira da lista o item que abriu o diálogo, o foco vai ao controle da lista que o trouxe de volta, como o interruptor "Exibir inativos"."
- **Rotas verificadas** no banco local (`verify-categories-api.mjs`, tudo certo): 401/403/415/400/404/409, criação, edição, desativação, reativação, `includeInactive`, paginação, `VERSION_CONFLICT` com a linha `warn` no registro e a ordem "Água | Álcool | Brilho | Lavagem completa | Polimento | Zinco" (risco da ordem alfabética resolvido).
- **Roteiro de tela.** Duas abas do mesmo navegador: a que fica em segundo plano não conclui as animações do Base UI (o painel que sai continua montado), então o roteiro traz cada página à frente com `bringToFront`.
