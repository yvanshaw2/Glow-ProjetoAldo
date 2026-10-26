---
issue: 43
pull_request: 119
---

# Relatório: Funcionários no painel: cadastrar, editar, desativar e reativar

Em dois PRs, como aprovado em P1: o #118, da API (`Refs #43`), e o #119, da tela (`Closes #43`), sobre o #118. Não há migration. O relatório está completo, e o plano passou a `concluido` neste PR.

## O que foi feito

PR #118, API:

- **Rotas** `GET` e `POST /api/admin/staff` e `PATCH /api/admin/staff/:id`, com `requirePermission("staff")` (UC19, UC20, RF077 a RF081, RF084, RN022 a RN024, RN026, RN027, RS003, RS004, RS008, RS010, RS011, RNF011):
  - lista por nome e sobrenome, 20 por página, sem a conta de administrador, com `includeInactive` (L5);
  - `POST` cria a conta no Auth e o perfil, ativo e com a troca da senha pendente, e remove a conta se o perfil falhar; `EMAIL_IN_USE` com "Já existe uma conta com este e-mail." (L1); o cargo precisa estar ativo (L2);
  - `PATCH` parcial, condicionado ao `updatedAt`, que edita, desativa e reativa; a conta de administrador responde 404 (L3); `email`, `password` e `id` são descartados; `jobTitle` vazio apaga (L4); manter o cargo atual inativo vale (L2).
- **Esquemas** `staffInputSchema`, `staffEditSchema`, `staffUpdateSchema` e `staffListQuerySchema`; repositório e serviço `staff.ts`; especificação OpenAPI.

PR da tela:

- **Aba "Funcionários" ligada às rotas:** saem as três entradas de `src/lib/demo/routes.ts`, `src/lib/demo/staff.ts` e o aviso da aba; o formulário usa os esquemas (`zodResolver`) e `clearErrors()` antes do envio; `EMAIL_IN_USE` aparece no topo e no campo, e a janela volta à etapa 1 com os dados mantidos e o foco no aviso; no conflito de versão a lista é lida de novo, também na confirmação.
- **Foco (L8):** depois de desativar sem "Exibir inativos", o foco vai ao interruptor; cancelar a confirmação devolve o foco a "Desativar".
- **Demonstração (L7):** o `seed-demo.sql` cadastra cinco funcionários fictícios (um inativo), com contas em `auth.users` sem senha.
- Nada em `/admin/staff` fica em demonstração.

## Arquivos alterados

- API: `src/app/api/admin/staff/route.ts` e `[id]/route.ts` (novos); `src/server/services/staff.ts` (novo); `src/server/repositories/staff.ts`; `src/shared/validation/staff.ts` e `README.md`; `tests/validation/staff.test.ts`; `docs/plataforma/openapi.yaml`, `docs/equipe/rotas.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.
- Tela: `src/components/admin/staff/` (`staff-tabs`, `staff-form-dialog`, `staff-data-step`, `staff-role-step`, `staff-form-values`, `staff-card`, `staff-list`); `src/components/shared/active-confirm.tsx` e `step-form.tsx`; `src/app/(admin)/admin/staff/page.tsx`; `src/lib/demo/routes.ts` e `staff.ts` (apagado); `supabase/seed-demo.sql`; `docs/equipe/equipe-do-painel.md` e `dados.md`; `docs/plataforma/infraestrutura.md`.

Desvios do plano (ver `notas.md`): `step-form.tsx` (fora da lista original, confirmado antes do PR): o efeito do título da etapa não tira o foco de um aviso de falha que já o tem; o PR 1 ficou com cerca de 420 linhas em `src/` (previstas ~340).

## Testes executados

- `npm run check`: sem erros nem avisos (576 testes, 21 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rotas**, no banco local (`db reset` com as quatro migrations, `seed-demo.sql`, admin, dois funcionários e um cliente, `next start` na porta 3043), pelo roteiro `verify-staff-api.mjs`, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `staff` e para o cliente nas três operações; `POST` sem `Origin` 403; `text/plain` 415; nada gravado pelas recusadas; `no-store`;
  - lista sem o administrador, sem os inativos por padrão e com eles em `includeInactive`, por nome e sobrenome, `includeInactive=x` e `page=0` 400, `pageSize=100` volta 50; sem senha em campo algum;
  - critério 1: `POST` 201 ativo e normalizado, linha com o mesmo `id` da conta e troca pendente; primeiro login, `/api/auth/me` com `mustChangePassword`, o painel recusa com `PASSWORD_CHANGE_REQUIRED`, a troca da senha (204) libera o painel;
  - critério 2: 400 com uma mensagem por campo; corpo vazio pede o cargo;
  - critério 3: `EMAIL_IN_USE` para outro funcionário, para um cliente, para o administrador, com a caixa trocada e com espaços; nada gravado (nem linha, nem conta); falha do `insert` provocada por restrição temporária → 500, conta removida e nenhuma linha;
  - critério 4: cargo inativo e inexistente → 400 em `roleId`, nada gravado;
  - critério 5: `PATCH` no `id` do administrador → 404, linha intacta;
  - critério 6 e RS011: desativar → a requisição seguinte do funcionário recebe `ACCOUNT_INACTIVE`; some da lista e aparece com `includeInactive`; reativar devolve o acesso na requisição seguinte;
  - critério 7: trocar o cargo muda as permissões de `/api/auth/me` e passa `/api/admin/clients` de 200 a 403 na requisição seguinte;
  - critério 8 e RS011: retirar `staff` do cargo muda 200 para 403 na requisição seguinte;
  - edição: `updatedAt` antigo → 409 `VERSION_CONFLICT` sem gravar; só `updatedAt` → 400; `jobTitle` vazio apaga e ausente mantém; `email`, `password`, `id` e `isAdmin` descartados (e-mail e senha da conta no Auth intactos); manter o cargo inativo atual passa, e sair dele para um ativo também; 404 para id desconhecido e que não é UUID;
  - duas criações do mesmo e-mail ao mesmo tempo: uma 201 e a outra recusada sem gravar nada; a recusada responde 503 e não 409, porque o Auth devolve erro de banco (ver `notas.md`).
- **`seed-demo.sql`** no banco local: carregado duas vezes sem duplicar; os cinco funcionários aparecem na lista (um só com "Exibir inativos"), o Auth os lista e o login com eles é recusado.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro (`ui-staff.mjs`), tudo certo:
  - **Estados:** sem aviso de demonstração; carregamento (esqueleto), falha da leitura com "Tentar novamente", acesso negado, vazio; cargos em carregamento, com falha e sem cargo ativo (aviso e "Ir para Cargos" leva à aba); só os cargos ativos na etapa; falha do salvar (aviso no topo, dados mantidos); sem transbordo horizontal;
  - **Fluxos:** etapa 1 com uma mensagem por campo e o foco no primeiro; formatos de e-mail e senha; etapa 2 sem cargo escolhido; `EMAIL_IN_USE` com o aviso no topo e no campo, de volta à etapa 1 com os dados; cadastro com o cartão na lista; edição com o e-mail só para leitura, sem senha, cargo atual marcado; cargo inativo atual marcado com "(inativo)" e mantido; `VERSION_CONFLICT` com a janela aberta e a lista relida; desativar com a confirmação, falha dentro dela, conflito dentro dela, cartão que sai e foco no interruptor, "Exibir inativos" com "Inativo" e "Reativar", reativar; "Voltar" devolve o foco a "Desativar";
  - **Teclado** (`ui-keyboard-staff.mjs`): Tab até as abas e "Novo funcionário"; Enter abre a janela com o foco em "Cancelar"; ordem dos campos (Nome, Sobrenome, E-mail, Senha inicial, "Mostrar senha", Cargo na empresa); Esc devolve o foco; Tab até "Próximo" e Enter; foco no título da etapa; setas e Espaço no cargo; "Voltar" mantém os dados; "Cadastrar funcionário" por Enter; "Editar" com Esc devolvendo o foco; confirmação com o foco inicial em "Voltar" e o foco preso na janela; desativar leva o foco ao interruptor, que funciona por Espaço; `EMAIL_IN_USE` com o foco no aviso do topo;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/staff` (navegação) e 1,0 nas 52 capturas de estado (13 estados nas quatro combinações: lista, falha da leitura, vazio, etapas 1 e 2 do cadastro com e sem erros, falha do salvar, falha e ausência de cargos, edição nas duas etapas e confirmação de desativar);
  - **Desempenho (navegação, `next start` local):** celular LCP 3,3 s, CLS 0, TBT 70 a 80 ms, desempenho 0,92; computador LCP 0,7 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (as duas rotas e os esquemas de funcionário), `docs/equipe/rotas.md`, `equipe-do-painel.md` e `dados.md`, `docs/plataforma/mensagens-de-validacao.md` (duas mensagens), `docs/plataforma/infraestrutura.md` e `docs/padroes/testes.md`.
- Lacunas resolvidas, todas na opção 1: L1 (mensagem do painel) → `rotas.md` e `equipe-do-painel.md`; L2 (cargo ativo) → `rotas.md` e `mensagens-de-validacao.md`; L3 (administrador no `PATCH`: 404) → `rotas.md`; L4 (`PATCH` parcial) → `rotas.md`; L5 (ordem por nome e sobrenome) → `rotas.md`; L6 (autodesativação permitida, sem regra nova) → nenhuma mudança na documentação; L7 (funcionários no seed) → `equipe-do-painel.md`, `dados.md` e `infraestrutura.md`; L8 (foco depois de desativar) → `equipe-do-painel.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`/api/admin/staff`: o `PATCH` parcial, os 400 de cargo, o 404 do administrador e o 409 `EMAIL_IN_USE` com a mensagem do painel) e a seção de dados (as contas de demonstração sem senha); Análise do Sistema, UC19 passo 6 (cargo ativo) e UC20 (conta de administrador não editável).

## Pendências

- **Do Yvan:** carregar o `supabase/seed-demo.sql` no SQL Editor para ver os cinco funcionários de demonstração (a inserção em `auth.users` foi conferida no banco local; se falhar na produção, a L7 cai para a opção 2 ou 3); conferir logado, na pré-visualização, `/admin/staff` (lista, cadastro, edição, desativação, reativação) e o LCP do celular. Não há migration a aplicar. A pré-visualização usa o banco de produção (decisão 0030): os funcionários criados nela são contas reais no Auth.
- Fora desta tarefa, para tarefas à parte: o Enter num campo de formulário em etapas não avança (todos os `StepForm`); a recusa por corrida do mesmo e-mail responde 503 em vez de 409 (`createAccount`, também no cliente).
- Limite conhecido: a etapa do cargo lê até 50 cargos ativos (`MAX_PAGE_SIZE`); acima disso os demais não aparecem.
