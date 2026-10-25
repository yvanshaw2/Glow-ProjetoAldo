---
issue: 65
pull_request: 104
---

# Relatório: Telas de equipe e configurações do painel com dados de demonstração

Em quatro PRs: o #101, da base (`Refs #65`); o #102, das abas de configurações (`Refs #65`, sobre o #101); o #103, das listas de `/admin/staff` (`Refs #65`, sobre o #102); e o #104, dos formulários (`Closes #65`, este, sobre o #103). O relatório está completo, e o plano passou a `concluido` neste PR.

## O que foi feito

PR #101, base:

- **Tipos** `AdminStaffMember` e `AdminRole` (`src/shared/api/staff.ts`) e `PaymentFee` (`src/shared/api/settings.ts`).
- **Dados de demonstração** (decisão 0055): `src/lib/demo/staff.ts` (quatro cargos, um inativo, e cinco funcionários, um inativo, fictícios) e `src/lib/demo/settings.ts` (os sete dias e as quatro formas de pagamento do `seed.sql`); as leituras de equipe, cargos, disponibilidade e formas de pagamento respondem pela demonstração, e `POST` e `PATCH` de funcionários e cargos e os dois `PUT` das configurações são recusados com `NOT_IMPLEMENTED`.
- **Documentação:** `docs/equipe/equipe-do-painel.md` e `docs/configuracoes/configuracoes-do-painel.md` (novos), as linhas em `CONTEXT.md` e os campos das leituras em `rotas.md` de equipe e de configurações.

PR #102, abas de configurações:

- **"Disponibilidade"** (UC23, RF087, RN013): sete dias, cada um com o interruptor de aberto, a abertura, o encerramento e a pausa opcional, em listas de meia em meia hora.
- **"Formas de pagamento"** (UC24, RF088, RN012): quatro cartões, cada um com acréscimo ou desconto e o percentual com vírgula decimal.
- Aviso de demonstração e estados de carregamento, falha e sucesso no topo de cada aba; "Empresa" não mudou.

PR #103, listas de `/admin/staff`:

- **`/admin/staff`** (RF077, RF078, RF084): aviso de demonstração, abas "Funcionários" e "Cargos", listas em ordem alfabética com "Exibir inativos", cartões com situação, cargo e permissões.
- **Desativação e reativação** de funcionário e de cargo com confirmação (UC20 FA02, UC21 FA02, RN026).

PR #104, formulários:

- **Novo funcionário e edição** (UC19, UC20, RF079, RF080, RN024): duas etapas, dados e cargo; e-mail só para leitura na edição; cargo atual inativo continua na lista.
- **Novo cargo e edição** (UC21, RF082, RF083, RN025): duas etapas, identificação e as seis permissões na ordem de RN025, ao menos uma.
- Botões "Novo funcionário" e "Novo cargo" ao lado das abas e "Editar" nos cartões.

## Arquivos alterados

- `src/shared/api/staff.ts` (novo) e `settings.ts`; `src/lib/demo/staff.ts` e `settings.ts` (novos) e `routes.ts`.
- `src/app/(admin)/admin/staff/page.tsx` (novo).
- `src/components/admin/staff/` (novos): `staff-tabs.tsx`, `staff-list.tsx`, `staff-card.tsx`, `staff-form-dialog.tsx`, `staff-form-values.ts`, `staff-data-step.tsx`, `staff-role-step.tsx`.
- `src/components/admin/roles/` (novos): `role-list.tsx`, `role-card.tsx`, `role-form-dialog.tsx`, `role-form-values.ts`, `role-data-step.tsx`, `role-permissions-step.tsx`.
- `src/components/admin/settings/`: `settings-tabs.tsx` (alterado) e, novos, `settings-section.tsx`, `settings-notices.tsx`, `availability-form.tsx`, `availability-values.ts`, `payment-fees-form.tsx`, `payment-fees-values.ts`.
- `src/components/shared/`: `choice-group.tsx` e `inactive-switch.tsx` (movidos de `admin/catalog/`), `active-confirm.tsx` (novo) e `README.md`; `admin/catalog/service-data-step.tsx`, `service-form-dialog.tsx`, `category-list.tsx` e `service-list.tsx` (só os endereços de importação).
- `docs/equipe/equipe-do-painel.md` e `docs/configuracoes/configuracoes-do-painel.md` (novos), `CONTEXT.md` e `rotas.md` dos dois assuntos.

## Testes executados

- `npm run check`: sem erros nem avisos em cada PR (414 testes) e `npx next build`.
- Nenhuma função pura de regra de negócio entrou, então não há teste novo (decisão 0052). Os módulos de demonstração foram conferidos por um teste temporário do Vitest (apagado): funcionários ativos em ordem alfabética, cinco com inativos, três cargos ativos e quatro com inativos, sete dias e quatro formas na ordem.
- Verificação local no navegador, com o banco local (`db reset`), o admin local e `next start` na porta 3060:
  - **`/admin/settings`:** três abas; "Empresa" sem aviso, gravando de verdade (nome salvo, lido de novo depois de recarregar, e o 409 `VERSION_CONFLICT` com duas abas, com a releitura); as outras duas com o aviso; o digitado em "Empresa" continua depois de visitar as outras abas. "Disponibilidade": sete dias com os valores do `seed.sql`, dia fechado esconde os horários e os recupera ao reabrir, pausa do sábado com 12:00 e 13:00, `NOT_IMPLEMENTED` no topo. "Formas de pagamento": quatro cartões, acréscimo e desconto, percentual limitado a três dígitos e duas casas, campo vazio indicado, `NOT_IMPLEMENTED` no topo.
  - **`/admin/staff`:** título, aviso, abas e botão por aba; quatro funcionários (cinco com inativos, "Reativar" no inativo); três cargos (quatro com inativos) com as permissões; "Novo funcionário" (quatro indicações de campo vazio no primeiro envio, foco no primeiro, segunda etapa com os cargos ativos, "Voltar" mantendo o digitado, `NOT_IMPLEMENTED` com a janela aberta); "Editar" (e-mail só leitura, cargo atual marcado); confirmações de desativação; "Novo cargo" (nome vazio indicado, seis permissões na ordem de RN025, "Selecione ao menos uma permissão." e a mensagem some ao marcar); edição de cargo com o aviso e as cinco permissões do Gerente marcadas.
  - **Sem transbordo** a 360 × 800 e 1440 × 900, claro e escuro, nas duas páginas e com as janelas abertas.
  - **Teclado, a 360 px:** as setas movem o foco entre as abas e Enter ou Espaço as ativa; Tab percorre o botão da aba e os botões de cada cartão; o foco fica preso nas janelas e nas confirmações; Enter no campo "Nome" do cargo avança para a etapa 2, e o foco vai ao título dela; Espaço marca as permissões e os interruptores; Enter e setas escolhem o horário na lista; setas mudam acréscimo e desconto; Esc devolve o foco ao botão de origem (janela de funcionário, de cargo, confirmação e edição).
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas oito capturas de página (as duas páginas nas quatro combinações de largura e tema, com o cookie do admin local) e 1,0 nas 60 capturas de estado (15 estados nas quatro combinações: lista de funcionários, com inativos, "Novo funcionário" vazio, com erros, etapa 2 e etapa 2 com a falha, edição, confirmação, lista de cargos, "Novo cargo" com o erro de permissão, edição de cargo, disponibilidade, disponibilidade com a falha, formas de pagamento e formas de pagamento com o erro e a falha).
  - **Desempenho (Lighthouse, navegação, `next start` local):** `/admin/staff` e `/admin/settings`, celular claro e escuro, LCP 3,3 s, CLS 0, TBT de 50 a 110 ms, desempenho 0,92; computador, LCP 0,7 s, CLS 0, desempenho 1. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores.
  - **Alteração temporária de `src/lib/demo`, `match.ts` e `api-client.ts` (desfeita por `git checkout -- src`):** falha da lista de funcionários, com "Tentar novamente" por Enter e duas leituras; listas vazias; carregamento lento de `/admin/staff` e das abas, sem transbordo; falha de "Disponibilidade" e de "Formas de pagamento", cada uma com "Tentar novamente"; falha da leitura de cargos dentro de "Novo funcionário", com nova tentativa; sem cargo ativo, com o botão "Ir para Cargos" levando à aba; gravação com sucesso (a janela fecha, a lista é lida de novo, o foco volta ao botão de origem; "Disponibilidade salva." e "Percentuais salvos."); `EMAIL_IN_USE` e `NAME_IN_USE` no topo das janelas, abertas; `VERSION_CONFLICT` na edição (aviso no topo, lista lida de novo e campo com o nome atual).
  - **Janela de categoria da #63:** o primeiro envio vazio indica os dois campos (o defeito do `mode: "onTouched"` da #64 não ocorre lá; P5 não foi acionado).
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, cookie e credenciais apagados).

## Documentação atualizada

- Módulos: `docs/equipe/equipe-do-painel.md` e `docs/configuracoes/configuracoes-do-painel.md` (novos), `docs/equipe/CONTEXT.md`, `docs/equipe/rotas.md`, `docs/configuracoes/CONTEXT.md` e `docs/configuracoes/rotas.md`.
- Lacunas resolvidas: L1 → opção 1 (módulo novo, sem busca, edição em duas etapas) → `equipe-do-painel.md`; L2 → opção 1 → `rotas.md` de equipe e de configurações; L3 → opção 1 (dados fictícios só em `src/lib/demo/staff.ts`) → `equipe-do-painel.md`; L4 → opção 1 (vale `docs/` onde o wireframe diverge) → `configuracoes-do-painel.md`; L5 → opção 1 (`NOT_IMPLEMENTED` no topo da aba) → `configuracoes-do-painel.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A, com os campos das leituras de funcionários, cargos e formas de pagamento de `rotas.md`; nenhuma `RN` mudou, então a Análise do Sistema não precisa de ajuste.

## Pendências

- As rotas reais (#39 cargos, #41 disponibilidade e formas de pagamento, #43 funcionários): cada uma tira a sua entrada de `src/lib/demo/routes.ts` e o aviso da tela; seguem os campos de `rotas.md`. A #43 e a #39 também tiram `src/lib/demo/staff.ts`, e a #41 `settings.ts`.
- Validação que a tela não faz e as rotas fazem: formato de e-mail e regras da senha (#43), horário inconsistente, pausa fora do expediente e percentual fora do intervalo (#41), nome de cargo repetido (#39).
- A mensagem do catálogo para `EMAIL_IN_USE` ("Se você já tem conta, entre com ela.") foi escrita para o portal; a #43 decide se o painel ganha texto próprio (UC19 FE02 pede informar o conflito).
- O efeito da desativação de um cargo sobre o acesso dos funcionários vinculados (`dados.md` diz que o cargo inativo não concede permissões; RN026 só diz que não pode ser atribuído) é da #39.
- O foco depois de uma desativação com sucesso: na demonstração o cartão continua e o foco volta ao botão dele; com a rota real o cartão pode sair da visão com "Exibir inativos" desligado, e o foco cai no `body` (lacuna herdada da #61, para a #39 e a #43).
- LCP do celular de `/admin/staff` e `/admin/settings` em 3,3 s no Lighthouse local (limite de 2,5 s em `frontend.md`): medir na pré-visualização da Vercel.
- **Passo do Yvan:** conferir `/admin/staff` e `/admin/settings` em produção, logado como administrador, depois da incorporação do #104; os funcionários e os cargos de demonstração vêm do código, não do banco.
