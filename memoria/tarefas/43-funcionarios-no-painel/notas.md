# Notas: 43-funcionarios-no-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-25 – descoberta: dependências conferidas

A #43 depende da #39 (cargos, PR #113) e da #65 (a aba "Funcionários" com dados de demonstração), as duas incorporadas. `git fetch` feito: `origin/main` em aa16bf8 (#44, PR #116), e o worktree (`claude/zealous-rhodes-1cba1f`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em aa16bf8, árvore limpa. Plano e notas sem commit, como nas etapas 01 anteriores; a etapa 02 cria `feat/43-staff` a partir da `origin/main`.

## 2026-10-25 – descoberta: o que já existe

- `shared/validation/staff.ts` só tem os esquemas de cargo; `shared/api/staff.ts` já tem `AdminStaffMember` e `AdminRole`; `repositories/staff.ts` só tem `findStaffAccount` e `clearStaffPasswordChange` (guard e troca de senha); `services/staff.ts` não existe.
- `createAccount` e `deleteAccount` (`server/auth/accounts.ts`) e o molde `createClient` (conta, perfil e remoção da conta com registro do `id` se a remoção falhar) já cobrem o cadastro; `AppError("EMAIL_IN_USE", { message })` aceita texto próprio (usado pelo cliente: "Já existe uma conta com este e-mail.").
- O banco já garante `uq_staff_email`, `ck_staff_email`, cargo obrigatório fora do administrador (`ck_staff_role_id`) e um só administrador. Não há função SQL a escrever: o perfil é uma tabela só, então **não há migration** nesta tarefa.
- O guard (`requirePermission` e `findStaffAccount`) lê situação, cargo e permissões a cada requisição, então a desativação e a troca de cargo valem na requisição seguinte (RS011) sem código novo.
- `fk_staff_id` aponta para `auth.users`: o `seed-demo.sql` não tem funcionários, e criá-los pelo SQL exige linhas em `auth.users` (L7).

## 2026-10-25 – descoberta: tela da #65 e o que sobra de demonstração

- `StaffFormDialog` não tem esquema: `rules` de "campo preenchido" em `staff-data-step.tsx` e a de `roleId` em `staff-role-step.tsx`; os nomes do formulário são os do corpo, então o `zodResolver` serve (como no cliente), sem resolvedor próprio.
- `StaffRoleStep` já lê os cargos reais (`pageSize=50`) e mantém o cargo atual inativo na edição.
- Só `routes.ts` importa `src/lib/demo/staff.ts`; os ids dos cargos dele não existem no banco. O `DemoNotice` da aba está em `staff-tabs.tsx`. Depois desta tarefa nada em `/admin/staff` fica em demonstração.
- `ActiveConfirm` (compartilhado, usado só pelo `StaffCard`) não leva o foco ao interruptor depois de desativar nem relê a lista no `VERSION_CONFLICT`; o `RoleCard` tem os dois (padrão a copiar).

## 2026-10-25 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L8 e os pontos P1 a P3 (opção recomendada primeiro, nenhuma marcada, para o Yvan marcar): mensagem de e-mail em uso do painel, cargo ativo conferido no servidor, administrador no `PATCH` como 404, `PATCH` parcial, ordem por nome e sobrenome, autodesativação permitida, funcionários de demonstração no `seed-demo.sql` por `auth.users` sem senha, foco no interruptor depois de desativar; dois PRs encadeados (API; tela com "Closes #43"). Nenhuma migration, dependência nem decisão técnica nova.

## 2026-10-25 – decisão: plano aprovado

O Yvan gravou `status: aprovado` (20:15 de 25/10/2026) com a opção 1 em L1 a L8 e P1 a P3. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificações `feat/43-staff` (PR 1, API: PR #118) e `feat/43-staff-screen` (PR 2, a tela, sobre a primeira), da `origin/main` (aa16bf8), sem vínculo. Testes escritos antes e vistos falhar (commit `9c21151`: 21 dos 41 falhando).

## 2026-10-25 – desvio: arquivo fora da lista, `step-form.tsx`

Depois de EMAIL_IN_USE (ou qualquer erro de campo de outra etapa) o `StepForm` volta à etapa 1 e o efeito do título da etapa tirava o foco do aviso do topo (`FormAlert`), contra o que o plano promete (foco no aviso na falha). O efeito agora não tira o foco quando ele já está num `[role="alert"]`. É compartilhado (`StepForm`), então vale também para os cargos, os serviços e os agendamentos; mudança de 4 linhas, acrescentada à lista do plano, **a confirmar pelo Yvan antes do PR 2**.

## 2026-10-25 – descoberta: Enter num campo não avança a etapa

O comentário do `StepForm` diz que Enter num campo antes da última etapa funciona como "Próximo", mas o botão "Próximo" é `type="button"` e o formulário não tem botão de envio nas etapas anteriores; com vários campos o navegador não faz o envio implícito, e o Enter não faz nada (conferido no roteiro de teclado: o foco fica no campo). Vale para todos os formulários em etapas; fora do escopo da #43 (o roteiro usa Tab até "Próximo" e Enter no botão). Candidato a tarefa à parte.

## 2026-10-25 – descoberta: detalhes das rotas

- A troca da senha no primeiro acesso muda o `updated_at` do funcionário (`clearStaffPasswordChange` grava `must_change_password`), então a tela que ficou aberta antes dessa troca recebe `VERSION_CONFLICT` ao editar; é o comportamento do RNF011 e a janela relê os dados.
- Duas criações do mesmo e-mail ao mesmo tempo: uma vale (201), a outra não grava nada (nem conta, nem perfil), mas responde 503, não 409: o próprio Supabase Auth devolve erro 500 de banco e o `createAccount` (#24) o trata como indisponibilidade. É o mesmo código do cliente (#42); não foi mexido.
- `PATCH` de cargo para um cargo inativo responde 400 em `roleId`, e reenviar o cargo atual inativo passa.
- O nome do funcionário é gravado com as iniciais maiúsculas de cada palavra ("Joana Maria"), pelo `personNameSchema`.
- `seed-demo.sql`: cinco funcionários, com linha em `auth.users` sem senha (colunas de texto do Auth em branco, não nulas); a carga repetida não duplica, o `getUserById` e a lista do Auth funcionam, e o login com eles é recusado (400).
