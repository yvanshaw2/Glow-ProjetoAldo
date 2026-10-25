---
issue: 65
titulo: "Telas de equipe e configurações do painel com dados de demonstração"
areas: [frontend]
tipo: funcionalidade
requisitos: [UC19, UC20, UC21, UC23, UC24, RF077, RF078, RF079, RF080, RF081, RF082, RF083, RF084, RF087, RF088, RN012, RN013, RN024, RN025, RN026, RN027, RNF002, RNF003, RNF004, RNF005, RNF008, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 18:56 - 24/10/2026
---

# Plano: Telas de equipe e configurações do painel com dados de demonstração

## Objetivo

Construir, com dados de demonstração (T9 de `memoria/tarefas/66-analise-por-ia/proposta-das-issues.md`, decisão 0055), as abas de `/admin/staff` e as duas abas que faltam em `/admin/settings`:

- **Funcionários** (UC19, UC20, RF077 a RF081, RF084): listagem com a opção de exibir inativos, formulário de cadastro em duas etapas (dados e cargo), edição, e desativação e reativação com confirmação.
- **Cargos** (UC21, RF077, RF078, RF082, RF083, RN024 a RN026): listagem com a opção de exibir inativos, formulário em duas etapas (nome e descrição; as seis permissões na ordem de RN025, ao menos uma), edição, e desativação e reativação com confirmação.
- **Disponibilidade** (UC23, RF087, RN013): os sete dias, cada um com a situação aberto ou fechado, a abertura, o encerramento e a pausa opcional.
- **Formas de pagamento** (UC24, RF088, RN012): os quatro percentuais, cada um como acréscimo ou desconto.

A aba "Empresa" (#37) continua gravando de verdade. A gravação de qualquer outro formulário ou ação mostra o aviso de `NOT_IMPLEMENTED`, e nada é gravado. Nenhuma rota, migration ou esquema de validação, nenhum import de `src/server/` e nenhuma dependência nova.

## Base conferida

- Issue #65 aberta, sem PR aberto. `origin/main` e a ramificação desta sessão (`claude/keen-mclean-5a8e42`, worktree `56-base-da-demonstracao-e6d9a4`, nome herdado e não renomeável) em fc6bd58 (#99, a #64), com a árvore limpa.
- Dependência cumprida: a #65 depende só da #56 (T9 da proposta e a issue), e a base da demonstração e as telas até a #64 estão na `main`. As rotas (#39, #41 e #43) estão abertas e sem código: `src/app/api/admin/` não tem rota de equipe, de cargos, de disponibilidade nem de formas de pagamento. Só `GET` e `PUT /api/admin/settings/company` existem (#37).
- Existem: `src/components/admin/staff/` e `roles/` (só `README.md`), `src/app/(admin)/admin/staff/` (só `README.md`, sem `page.tsx`), `settings/page.tsx` e `settings-tabs.tsx` (uma aba, "Empresa", com `keepMounted`), `company-settings-form.tsx` (sucesso como `role="status"`, 409 com releitura), `PERMISSIONS`, `PERMISSION_LABELS`, `WEEKDAY_LABELS` e `PAYMENT_METHOD_LABELS` em `src/shared/constants/`, `BusinessDay` e `CompanySettings` em `src/shared/api/settings.ts`, `formatPercent`, `formatBusinessHours`, `TIME_SLOT_MINUTES`, e, das telas anteriores, `FormDialog`, `ConfirmDialog`, `StepForm`, `PaginatedList` (busca e "Limpar filtros" opcionais), `FormField` (`rules`), `FormAlert`, `DemoNotice`, `EmptyState`, `InactiveSwitch`, `CategoryCard` e `CategoryList` (o molde de cartão com situação, "Editar" e "Desativar" ou "Reativar" confirmados) e `CatalogTabs` (o molde das abas com botão de criar).
- O `seed.sql` tem a conta de administrador e os valores iniciais das configurações (sete dias: segunda a sexta das 08:00 às 18:00 com pausa das 12:00 às 13:00, sábado das 08:00 às 12:00, domingo fechado; as quatro formas de pagamento sem ajuste). **Nem o `seed.sql` nem o `seed-demo.sql` têm funcionários ou cargos** (L3).
- Wireframes abertos no painel do navegador (celular; os de desktop têm o mesmo esqueleto): `staffManagment1Mobile` (título "Funcionários", abas "Funcionários" e "Cargos" com o botão "Convidar" ao lado, interruptor "Exibir inativos", cartão com nome, etiqueta "Ativo", e-mail, "Função", "Admissão", etiqueta do cargo e "Editar" e "Desativar"), `staffManagment2Mobile` (cartão de cargo com nome, etiqueta "Ativo", descrição, "N permissões", as permissões em etiquetas com "+N", "Editar" e "Desativar"), `newRoleModalStep2Mobile` e `newStaffModalStep2Mobile` (janela ancorada embaixo com a indicação "Identificação" e "Permissões" ou "Informações" e "Cargo"), `availabilityMobile` (uma linha por dia com interruptor, sigla do dia, "Abre" e "Fecha" e "Fechado" no domingo) e `paymentMethodsMobile` (um cartão por forma, com explicação e o campo de percentual com "−" e "+"). As miniaturas das janelas só mostram o cabeçalho; o conteúdo vem de `docs/` (L1 e L4). Divergências do wireframe (outro sistema) tratadas nas lacunas: sem a pausa e com 17:00 (L4), regras de sinal por forma de pagamento (L4), "Admissão" e "Convidar" (L1).

## Critérios de aceitação e verificação

Os critérios da issue vêm primeiro; os comuns das telas de demonstração (decisão 0055) vêm depois. Pela decisão 0052, telas e componentes são verificados à mão; os passos são os do "Roteiro manual" abaixo, no banco local e no `next start` com `NEXT_PUBLIC_*` do banco local (como a #61 a #64). Nenhuma função pura de regra de negócio será criada; se alguma surgir na construção (por exemplo, a lista de horários de meia em meia hora), ela ganha teste antes do código e o plano é atualizado.

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado `/admin/settings`, quando troco de aba, então "Empresa" continua gravando de verdade (o formulário lê e grava `/api/admin/settings/company`) e as outras duas mostram o aviso de demonstração no topo do painel da aba | Passo manual M1 e M2 (o 409 e a gravação real da Empresa conferidos no banco local) |
| Dado a troca de abas, quando digito numa aba e volto a ela, então o que foi digitado continua (`rotas.md` de configurações) | Passo manual M2 |
| Dado o cadastro de cargo, quando preencho o nome e avanço, então a segunda etapa mostra as seis permissões na ordem de RN025 (Dashboard, Agendamentos, Serviços, Clientes, Funcionários e Configurações) | Passo manual M6 (a ordem vem de `PERMISSIONS`, e a conferência é feita sobre o texto da tela) |
| Dado o cadastro de cargo, quando avanço sem nome, então o campo é indicado e a segunda etapa não abre (UC21 FE01); quando confirmo sem permissão, então a tela indica que ao menos uma é obrigatória (UC21 FE03, RN025) | Passo manual M6 |
| Dado `/admin/staff`, quando alterno entre "Funcionários" e "Cargos", então a lista da aba aparece, sem a conta de administrador, e o botão de criar muda de "Novo funcionário" para "Novo cargo" (UC20 passos 1 e 2, RF077, RF084) | Passo manual M3 |
| Dado uma das listas, quando ligo "Exibir inativos", então os inativos entram com a etiqueta "Inativo" e o botão "Reativar", e ao desligar saem (UC20 FA01, UC21 FA03, RF078) | Passo manual M3 e M4 |
| Dado o cadastro de funcionário, quando preencho nome, sobrenome, e-mail, senha e a descrição opcional e avanço, então a segunda etapa lista só os cargos ativos (UC19 passos 3 e 4, RN024, RN026), e a confirmação mostra o aviso de `NOT_IMPLEMENTED` no topo da janela, que continua aberta | Passo manual M5 |
| Dado a edição de funcionário, quando abro, então os campos vêm preenchidos, o e-mail só para leitura e o cargo atual marcado, mesmo que esteja inativo (UC20 passos 3 a 5, RF080) | Passo manual M5 |
| Dado a desativação de funcionário ou de cargo, quando a aciono, então a confirmação diz o efeito (sem acesso ao painel; sem poder ser atribuído) e o envio mostra `NOT_IMPLEMENTED` dentro dela; a reativação é confirmada do mesmo modo (UC20 FA02, UC21 FA02, RN026, RF081, RF083) | Passo manual M7 |
| Dado `/admin/settings`, aba "Disponibilidade", quando abro, então vejo os sete dias, de domingo a sábado, com a situação, a abertura, o encerramento e a pausa de cada um, como no `seed.sql` (UC23 passos 2 e 3, RF087) | Passo manual M8 |
| Dado a disponibilidade, quando fecho um dia, então os horários dele somem e ficam guardados se o dia for reaberto; quando ligo a pausa, então aparecem o início e o fim (UC23 passo 3) | Passo manual M8 |
| Dado a disponibilidade, quando confirmo, então aparece o aviso de `NOT_IMPLEMENTED` no topo da aba e nada é gravado | Passo manual M8 |
| Dado as formas de pagamento, quando abro, então vejo crédito, débito, Pix e dinheiro, cada uma com "Acréscimo" ou "Desconto" e o percentual, e o percentual zero não exige a escolha (UC24 passos 2 e 3, FA01, RF088, RN012) | Passo manual M9 |
| Dado as formas de pagamento, quando confirmo, então aparece o aviso de `NOT_IMPLEMENTED` e nada é gravado | Passo manual M9 |
| Dado qualquer janela ou formulário, quando uso só o teclado (Tab, Shift+Tab, setas nas abas e nos botões de opção, Espaço nas permissões, Enter, Esc), então alcanço e aciono tudo, o foco é visível e Esc devolve o foco ao botão de origem (WCAG 2.1.1, 2.4.7) | Passo manual M11 |
| Dado `EMAIL_IN_USE`, `NAME_IN_USE` e `VERSION_CONFLICT`, quando a gravação os devolve, então a mensagem aparece no topo da janela e, no conflito, a leitura é refeita; e o sucesso fecha a janela e lê a lista de novo (UC19 FE02, UC21 FE02, RNF011) | Passo manual M10, por alteração temporária de `src/lib/demo` (a demonstração recusa toda gravação) |
| Dado carregamento, lista vazia ou falha da leitura, então aparecem o esqueleto, a mensagem de vazio e o aviso com "Tentar novamente", nas duas listas e nas duas abas de configurações (`componentes.md`) | Passo manual M10, com a alteração temporária de `src/lib/demo` e `api-client.ts` como na #61 (`globalThis.__demo`, desfeita por `git checkout -- src`) |
| Dado a tela a 360 × 800 e a 1440 × 900, no tema claro e no escuro, então não há transbordo horizontal | Passo manual M12 |
| Dado a tela, o Lighthouse de acessibilidade não tem auditoria reprovada, e o LCP e o CLS do celular são medidos | Passo manual M12 (Lighthouse em `navigation` com o cookie do admin local para `/admin/staff` e `/admin/settings`, e em `snapshot` para os estados) |
| Dado o aviso, então "Dados de demonstração…" aparece abaixo do título em `/admin/staff` e no topo das abas "Disponibilidade" e "Formas de pagamento", nunca na aba "Empresa"; e a tela não importa `src/server/` nem cria rota, migration ou esquema | `npm run check` e `git diff --stat` conferidos antes de cada PR |

### Roteiro manual

- **M1.** `/admin/settings` como o admin local: três abas ("Empresa", "Disponibilidade" e "Formas de pagamento"); "Empresa" sem aviso, lendo e gravando no banco local (alterar o nome e conferir a gravação e a releitura, e o 409 com duas abas abertas); as outras duas com o aviso.
- **M2.** Digitar em "Empresa", ir às outras abas e voltar: o digitado continua; idem em "Disponibilidade" e "Formas de pagamento".
- **M3.** `/admin/staff`: título "Funcionários", aviso, as duas abas, "Novo funcionário" e "Novo cargo" conforme a aba; a lista de funcionários sem a conta de administrador; a lista de cargos.
- **M4.** "Exibir inativos" nas duas listas (liga, desliga, a etiqueta e o botão mudam); busca não há (L1); paginação "1–N de N".
- **M5.** "Novo funcionário": primeira etapa (campos, "Mostrar senha", "Cancelar", validação de vazios), "Próximo", segunda etapa (só cargos ativos, "Voltar" mantendo o digitado), `NOT_IMPLEMENTED` no envio; "Editar" (e-mail só leitura, cargo atual, inclusive inativo).
- **M6.** "Novo cargo": nome e descrição, "Próximo" sem nome, segunda etapa com as seis permissões na ordem de RN025, envio sem permissão e com permissões, `NOT_IMPLEMENTED`; "Editar" cargo com as permissões marcadas.
- **M7.** "Desativar" e "Reativar" de funcionário e de cargo: confirmação, "Voltar", "Desativar" e o aviso dentro da confirmação, com o foco voltando ao botão.
- **M8.** "Disponibilidade": sete dias, fechar e reabrir, pausa, "Salvar disponibilidade", aviso.
- **M9.** "Formas de pagamento": quatro cartões, acréscimo e desconto, percentual zero, vírgula decimal, "Salvar percentuais", aviso.
- **M10.** Carregamento lento, falha com "Tentar novamente", lista vazia, sucesso das gravações (a janela fecha, a lista é lida de novo, o foco volta ao botão de origem), `EMAIL_IN_USE`, `NAME_IN_USE` e `VERSION_CONFLICT`, por alteração temporária sem commit.
- **M11.** Teclado completo de `/admin/staff` e de `/admin/settings`: abas por setas, listas, cada janela, a confirmação, o interruptor de cada dia e as permissões.
- **M12.** 360 × 800 e 1440 × 900, claro e escuro; Lighthouse; LCP e CLS do celular nas duas páginas; `/admin` e `/admin/clients` não mudaram.

## Arquivos

Cada um na pasta cujo `README.md` o admite.

| Arquivo | Ação |
|---|---|
| `src/shared/api/staff.ts` | criar: `AdminStaffMember` e `AdminRole` (leituras de `GET /api/admin/staff` e `/roles`) |
| `src/shared/api/settings.ts` | alterar: `PaymentFee` (leitura de `GET /api/admin/settings/payment-fees`); `BusinessDay` já serve à disponibilidade |
| `src/lib/demo/staff.ts` | criar: cargos e funcionários de demonstração e as respostas de `GET /api/admin/staff` e `/roles` (L3) |
| `src/lib/demo/settings.ts` | criar: as respostas de `GET /api/admin/settings/business-hours` e `/payment-fees`, com os valores do `seed.sql` |
| `src/lib/demo/routes.ts` | alterar: as quatro leituras; `POST /api/admin/staff`, `PATCH /api/admin/staff/:id`, `POST /api/admin/roles`, `PATCH /api/admin/roles/:id`, `PUT /api/admin/settings/business-hours` e `PUT /api/admin/settings/payment-fees` sem `load` |
| `src/app/(admin)/admin/staff/page.tsx` | criar |
| `src/components/admin/staff/staff-tabs.tsx` | criar: abas "Funcionários" e "Cargos" com o botão de criar da aba |
| `src/components/admin/staff/staff-list.tsx`, `staff-card.tsx` | criar: a listagem e o cartão do funcionário |
| `src/components/admin/staff/staff-form-dialog.tsx`, `staff-form-values.ts`, `staff-data-step.tsx`, `staff-role-step.tsx` | criar: a janela de cadastro e de edição, em duas etapas |
| `src/components/admin/roles/role-list.tsx`, `role-card.tsx` | criar: a listagem e o cartão do cargo |
| `src/components/admin/roles/role-form-dialog.tsx`, `role-form-values.ts`, `role-data-step.tsx`, `role-permissions-step.tsx` | criar: a janela de cadastro e de edição, em duas etapas |
| `src/components/admin/staff/active-confirm.tsx` (ou o `CategoryCard` generalizado) | criar: "Desativar" e "Reativar" com `ConfirmDialog`, para funcionário e cargo (P3) |
| `src/components/admin/settings/settings-tabs.tsx` | alterar: as duas abas novas, cada uma com o `DemoNotice` no topo |
| `src/components/admin/settings/availability-form.tsx`, `availability-day-row.tsx` | criar: o formulário dos sete dias |
| `src/components/admin/settings/payment-fees-form.tsx`, `payment-fee-field.tsx` | criar: o formulário dos quatro percentuais |
| `src/components/admin/{staff,roles,settings}/README.md` | alterar: só se a lista de "Vai aqui" mudar |
| `docs/equipe/equipe-do-painel.md` | criar: módulo da tela (L1, L2, L3) |
| `docs/configuracoes/configuracoes-do-painel.md` | criar: módulo das abas Disponibilidade e Formas de pagamento (L4) |
| `docs/equipe/CONTEXT.md`, `docs/equipe/rotas.md`, `docs/configuracoes/CONTEXT.md`, `docs/configuracoes/rotas.md` | alterar: linha dos módulos novos e os campos das leituras (L2) |

Arquivos de ponto de contato com outras telas de demonstração: `src/lib/demo/routes.ts` (todas as telas) e `src/shared/api/settings.ts` (a aba "Empresa" e o portal usam `CompanySettings`, `BusinessDay` e `PublicCompany`, que não mudam). `CategoryCard`, `CategoryList` e `InactiveSwitch` (`src/components/admin/catalog/`) são o molde; nenhum deles é alterado, e a escolha de generalizar um deles está em P3. Se a etapa de construção mexer em arquivo fora desta lista, ele vai para as notas e para esta lista, e o Yvan confirma o desvio.

Arquivos fora da lista acima, acrescentados na construção (desvios registrados em `notas.md`, a confirmar pelo Yvan):

| Arquivo | Ação |
|---|---|
| `src/components/shared/choice-group.tsx` | movido de `admin/catalog/`: passou a servir ao catálogo, às formas de pagamento e à escolha do cargo |
| `src/components/shared/inactive-switch.tsx` | movido de `admin/catalog/`: passou a servir ao catálogo e às listas de equipe e de cargos |
| `src/components/shared/active-confirm.tsx` | criado em `shared/` (a lista dizia `admin/staff/`): usado pelos cartões de funcionário e de cargo |
| `src/components/admin/catalog/service-data-step.tsx`, `service-form-dialog.tsx`, `category-list.tsx`, `service-list.tsx` | alterados só nos endereços de importação dos dois componentes movidos |
| `src/components/admin/settings/settings-section.tsx`, `settings-notices.tsx`, `availability-values.ts`, `payment-fees-values.ts` | criados: leitura com aviso, sucesso e falha das duas abas, e a conversão dos valores dos formulários (no lugar de `availability-day-row.tsx` e `payment-fee-field.tsx`, que ficaram dentro dos formulários) |
| `src/components/shared/README.md` | alterado: lista dos componentes de `shared/` |

Não foram alterados, apesar de listados: `src/components/admin/{staff,roles,settings}/README.md` (a lista de "Vai aqui" não mudou), `category-form-dialog.tsx` (P5 não foi acionado) e `active-confirm.tsx` em `admin/staff/`.

## Testes previstos

Nenhum teste automatizado novo: a tela não cria função pura de regra de negócio (decisão 0052: telas, componentes e dados de demonstração são verificados à mão), e as regras RN012, RN013, RN024 a RN027 ficam no servidor, nas tarefas das rotas (#39, #41 e #43). O `npm run check` (formatação, tipos, lint e os testes existentes) roda antes de cada PR. O `staff.ts` e o `settings.ts` de demonstração são conferidos por um teste temporário do Vitest com `apiRequest` (apagado), como o `admin-catalog.ts` na #63 e o `admin-clients.ts` na #64.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se você escolher outra, ele é refeito antes da construção.

### L1. Conteúdo da página `/admin/staff`

**Problema.** Nenhum módulo de `docs/equipe/` define os textos, a ordem dos controles, o cartão, as janelas, as confirmações e os estados da página: só UC19 a UC21, as regras e o wireframe (outro sistema, com "Convidar", "Admissão" e "Função", que o Glow não tem em `dados.md`; `staff` só tem `first_name`, `last_name`, `email`, `role_id`, `job_title`, `is_active` e `updated_at`). `rotas.md` só tem a tela `/admin/staff`, sem subrota, então a edição só pode ser janela. A edição (UC20 passo 4 e 5) e as etapas dela não são descritas, e a busca não existe nos UC (RF077 e RF078 só pedem a alternância e os inativos).

**Opções:**

- [x] **1. Novo módulo `docs/equipe/equipe-do-painel.md`, sem busca e com a edição nas mesmas duas etapas (recomendada).** Como `clientes-do-painel.md` e `servicos-do-painel.md`; a tela segue o texto abaixo, sem rota nova.
- [ ] **2. Com busca por nome e e-mail na lista de funcionários.** Acrescenta um requisito que a documentação não tem (`GET /api/admin/staff` só recebe `includeInactive`); fica para quando o número de funcionários pedir.
- [ ] **3. Deixar a tela definir os textos.** O código passaria a ser a única fonte, contra `guia/regras.md`.

**Texto proposto (opção recomendada)**, em `docs/equipe/equipe-do-painel.md` (novo; linha no `CONTEXT.md` do assunto):

- **Página.** Título "Funcionários"; abaixo, o aviso de demonstração, as abas "Funcionários" e "Cargos" (RF077) e, ao lado delas a partir de 768 px e abaixo no celular, o botão da aba: "Novo funcionário" ou "Novo cargo". A aba escolhida fica na página, sem mudar o endereço, e começa em "Funcionários". Cada aba lê a sua lista quando aberta, com o interruptor "Exibir inativos" desligado (RF078). Acesso: permissão `staff` (RN025).
- **Lista de funcionários (UC20 passos 1 e 2, FA01).** Interruptor "Exibir inativos"; ordem alfabética pelo nome completo; a conta de administrador nunca aparece (RN027, RF084); 20 por página, com a faixa "1–5 de 5" (RNF008). O cartão tem o nome completo, a etiqueta "Ativo" ou "Inativo", o e-mail, a descrição do cargo (`job_title`, se houver), o nome do cargo do sistema e os botões "Editar" e "Desativar" ou "Reativar" (com o nome do funcionário para o leitor de tela). Uma coluna no celular e duas a partir de 1280 px. Estados: carregamento (esqueleto); vazio "Nenhum funcionário cadastrado" e "Cadastre um funcionário para ele aparecer aqui."; falha (aviso com "Tentar novamente").
- **Lista de cargos (UC21 passos 1 e 2, FA03).** Mesmo interruptor e mesma paginação, ordem alfabética pelo nome. O cartão tem o nome, a etiqueta "Ativo" ou "Inativo", a descrição (se houver), "N permissões", as permissões em etiquetas com o nome da página de RN025 e "Editar" e "Desativar" ou "Reativar". Vazio: "Nenhum cargo cadastrado" e "Os cargos dos funcionários aparecem aqui.".
- **Novo funcionário (UC19, RF079, RN023, RN024).** Janela "Novo funcionário", ancorada embaixo no celular, com a indicação das etapas "Informações" e "Cargo". Etapa 1: "Nome", "Sobrenome", "E-mail", "Senha inicial" (descrição "De 8 a 72 caracteres, com letra maiúscula, número e caractere especial. O funcionário troca a senha no primeiro acesso.", com o botão de mostrar) e "Cargo na empresa (opcional)" (descrição "Texto livre, como 'Recepcionista'. Não altera as permissões."). Botões "Cancelar" e "Próximo". Etapa 2: "Escolha o cargo do sistema." com os cargos ativos em botões de opção (nome, descrição e "N permissões"), "Voltar" e "Cadastrar funcionário" ("Cadastrando…"). Sem cargo ativo, o aviso "Não há cargo ativo. Cadastre um cargo antes de cadastrar funcionários." com o botão que leva à aba "Cargos" (UC19, pré-condição). A falha aparece no topo da janela; um erro do e-mail leva à etapa 1 (UC19 FE02).
- **Editar funcionário (UC20 passos 3 a 6, RF080).** Janela "Editar funcionário" com as mesmas duas etapas, sem a senha: "Nome", "Sobrenome", "Cargo na empresa (opcional)" e o "E-mail" só para leitura (descrição "O e-mail de acesso não pode ser alterado."); na etapa 2, o cargo atual vem marcado, mesmo inativo, com a etiqueta "Inativo", e os demais são os ativos. Botões "Cancelar", "Próximo", "Voltar" e "Salvar alterações" ("Salvando…"). No 409 `VERSION_CONFLICT`, o aviso fica no topo e os dados são lidos de novo (RNF011).
- **Desativar e reativar funcionário (UC20 FA02, RF081, RN026).** Confirmação "Desativar este funcionário?", "O funcionário perde o acesso ao painel administrativo. Você pode reativá-lo depois.", botões "Voltar" e "Desativar" ("Desativando…"). Reativar: "Reativar este funcionário?", "O funcionário volta a acessar o painel com o cargo atual.", "Voltar" e "Reativar" ("Reativando…"). A falha aparece dentro da confirmação; com sucesso, a lista é lida de novo.
- **Novo cargo (UC21, RF082, RN025).** Janela "Novo cargo" com a indicação "Identificação" e "Permissões". Etapa 1: "Nome" e "Descrição (opcional)"; "Cancelar" e "Próximo"; nome vazio é indicado e não avança (FE01). Etapa 2: "Escolha as páginas que o cargo pode acessar." com as seis permissões na ordem de RN025, cada uma em caixa de seleção com o nome da página e a explicação "Consultar, criar, editar e excluir em <página>." (RN025: acesso completo); "Voltar" e "Cadastrar cargo" ("Cadastrando…"). Sem nenhuma marcada, o envio indica "Selecione ao menos uma permissão." (FE03). `NAME_IN_USE` (FE02) aparece no topo e leva à etapa 1.
- **Editar cargo (UC21 FA01, RF083).** Janela "Editar cargo" com as mesmas etapas e os dados atuais; o aviso "As alterações valem para todos os funcionários deste cargo." no topo da etapa 2. "Salvar alterações" ("Salvando…"); `VERSION_CONFLICT` e `NAME_IN_USE` como acima.
- **Desativar e reativar cargo (UC21 FA02, RN026).** "Desativar este cargo?", "O cargo deixa de poder ser atribuído a funcionários. Os funcionários que já o têm continuam com ele.", "Voltar" e "Desativar"; reativar: "Reativar este cargo?", "O cargo volta a poder ser atribuído a funcionários.". Na L1 fica registrado que o efeito da desativação do cargo sobre o acesso dos funcionários vinculados é da rota (#39): `RN026` só diz que o cargo desativado "não pode ser atribuído"; `dados.md` diz que "cargo inativo não concede permissões".

### L2. Campos das leituras de equipe e de cargos

**Problema.** `rotas.md` de equipe diz "lista de funcionários, com cargo e situação" e "lista de cargos, com suas permissões", sem os campos, a ordem nem a paginação; `PATCH /api/admin/staff/:id` aceita `isActive` mas não diz o que a resposta traz. As telas e a demonstração precisam de um formato único, que a #39 e a #43 seguem.

**Opções:**

- [x] **1. Definir os campos em `rotas.md` (recomendada).** Sem rota nova; mesmo padrão da L2 da #64.
- [ ] **2. Deixar para as rotas (#39 e #43).** A tela e a demonstração definiriam o formato sozinhas, e as rotas teriam de segui-lo ou mudar as telas.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `GET /api/admin/staff`: "Resposta: **200** lista paginada de `id`, `firstName`, `lastName`, `email`, `jobTitle` (ou `null`), `roleId`, `roleName`, `isActive` e `updatedAt`, em ordem alfabética pelo nome completo; sem a conta de administrador (RN027)."
- `PATCH /api/admin/staff/:id` e `POST /api/admin/staff`: "Resposta: o funcionário, com os campos da lista."
- `GET /api/admin/roles`: "Resposta: **200** lista paginada de `id`, `name`, `description` (ou `null`), `permissionKeys` (na ordem de RN025), `isActive` e `updatedAt`, em ordem alfabética pelo nome. O cadastro de funcionário lê os cargos ativos (`includeInactive` ausente) em uma página de até 50, o máximo de RNF008."
- `POST` e `PATCH /api/admin/roles`: "Resposta: o cargo, com os campos da lista."
- `docs/configuracoes/rotas.md`, `GET /api/admin/settings/payment-fees`: "Resposta: **200** as quatro formas na ordem crédito, débito, Pix e dinheiro, com `paymentMethod` e `percent` (com sinal, de −100 a 100)." O `PUT` devolve o mesmo corpo. `business-hours` já usa os campos de `BusinessDay`, sem `updatedAt`; nem o `PUT` de disponibilidade nem o de formas de pagamento têm `VERSION_CONFLICT`, porque `rotas.md` não pede `updatedAt` neles.

### L3. Dados de demonstração de funcionários e cargos

**Problema.** `docs/padroes/componentes.md` manda usar "os nomes, as placas e os serviços fictícios do `supabase/seed-demo.sql`" e a issue repete que os dados saem dele, mas o `seed-demo.sql` não tem funcionários nem cargos (só clientes, veículos, serviços e agendamentos), e o `seed.sql` só tem a conta de administrador. As telas precisam de funcionários e cargos para existirem.

**Opções:**

- [x] **1. Dados fictícios só em `src/lib/demo/staff.ts`, sem tocar o seed (recomendada).** Quatro cargos (Gerente: dashboard, agendamentos, serviços, clientes e configurações; Atendente: agendamentos e clientes; Detalhista: agendamentos; Auxiliar, inativo: serviços) e cinco funcionários (Rafaela Nogueira, Gerente, "Gerente de operações"; Thiago Barbosa, Atendente, "Recepcionista"; Camila Vasconcelos, Atendente; Leandro Prado, Detalhista, "Técnico de estética automotiva"; Murilo Teixeira, Detalhista, inativo), com e-mails `@example.com` e os ids no mesmo esquema do seed (`md5('glow-demo:<chave>')` como UUID). A conta de administrador não entra (RN027), e o cargo inativo e o funcionário inativo dão exemplo de "Exibir inativos". As rotas reais não leem esses dados.
- [ ] **2. Acrescentar funcionários e cargos ao `seed-demo.sql`.** Fica igual ao que o professor verá em produção, mas cria usuários no Supabase Auth em um script de dados de teste, fora do escopo de uma tela.

**Texto proposto (opção recomendada):** `docs/equipe/equipe-do-painel.md`, seção "Dados de demonstração": "Os funcionários e os cargos de demonstração são fictícios e vivem só em `src/lib/demo/staff.ts` (decisão 0055); o `seed-demo.sql` não os tem. As rotas #39 e #43 retiram esses dados e o aviso da tela." A nota de `componentes.md` fica como está.

### L4. Conteúdo das abas "Disponibilidade" e "Formas de pagamento", e o wireframe

**Problema.** Nenhum módulo de `docs/configuracoes/` define os textos, a ordem dos controles, o botão de gravar, os estados nem o sucesso das duas abas (a "Empresa" foi definida no código da #37). O wireframe contradiz `docs/`: a disponibilidade dele não tem a pausa (RF087, RN013) e fecha às 17:00 e 13:00 (o `seed.sql` fecha às 18:00 e 12:00), e as formas de pagamento dele têm regras por forma ("débito e crédito não aceitam desconto", "dinheiro não aceita acréscimo") e um botão de gravar por forma, enquanto UC24 e `dados.md` deixam qualquer forma ter acréscimo ou desconto, e a tela grava as quatro de uma vez (`PUT` com a lista).

**Opções:**

- [x] **1. Novo módulo `docs/configuracoes/configuracoes-do-painel.md`, com o texto abaixo; vale `docs/` onde o wireframe diverge (recomendada).** Sem rota nova.
- [ ] **2. Seguir o wireframe nas regras de sinal e no botão por forma.** Contradiz UC24, RN012 e `rotas.md`, e a rota (#41) aceitaria o que a tela proíbe.
- [ ] **3. Deixar a tela definir os textos.** O código passaria a ser a única fonte, contra `guia/regras.md`.

**Texto proposto (opção recomendada)**, em `docs/configuracoes/configuracoes-do-painel.md` (novo; linha no `CONTEXT.md` do assunto):

- **Abas.** "Empresa", "Disponibilidade" e "Formas de pagamento" (RF085), nessa ordem; a aba escolhida e o digitado em cada uma ficam como em `rotas.md`. Enquanto as rotas `business-hours` e `payment-fees` usarem os dados de demonstração (decisão 0055), o aviso de demonstração fica no topo do painel de cada uma dessas duas abas, e a "Empresa" não o tem.
- **Disponibilidade (UC23, RF087, RN013).** Texto de apoio "Defina os dias e os horários em que a empresa atende." Sete linhas, de domingo a sábado, cada uma com o interruptor "<dia> aberto" (descrição visível "Aberto" ou "Fechado"), "Abre às" e "Fecha às" e o interruptor "Pausa" com "Início da pausa" e "Fim da pausa". Os horários são listas de meia em meia hora (RN035) das 00:00 às 23:30. Dia fechado esconde os horários e a pausa, e guarda o que havia se for reaberto; dia aberto novo vem com 08:00 e 18:00, sem pausa. Botão "Salvar disponibilidade" ("Salvando…"), no fim; falha no topo; sucesso "Disponibilidade salva." como status. Carregamento com o lugar reservado; falha com "Tentar novamente".
- **Formas de pagamento (UC24, RF088, RN012).** Texto de apoio "Defina o acréscimo ou o desconto aplicado ao valor do agendamento em cada forma de pagamento." Quatro cartões (Crédito, Débito, Pix e Dinheiro), cada um com "Ajuste" (Acréscimo ou Desconto, botões de opção) e "Percentual" (de 0 a 100, vírgula decimal, duas casas, sufixo "%"); o percentual zero é "sem ajuste", e o desconto de 100% ou menos é o limite (FE01). Botão "Salvar percentuais" ("Salvando…"); falha no topo; sucesso "Percentuais salvos." como status. Valor guardado: o percentual com sinal, negativo para desconto (`dados.md`).
- **Dados de demonstração.** Os do `seed.sql`: os sete dias do texto acima e as quatro formas sem ajuste.

### L5. Aviso do `NOT_IMPLEMENTED` e o sucesso nas abas de configurações

**Problema.** `componentes.md` diz que, no formulário que continua na tela, o sucesso aparece no topo como status; a demonstração nunca tem sucesso (toda gravação é recusada), e a tela mostra a falha `NOT_IMPLEMENTED` no topo da aba. O sucesso, o 409 e as falhas da gravação só são vistos por alteração temporária. Não é lacuna de texto, mas registra o que a tela faz.

**Opções:**

- [x] **1. A tela mostra o `FormAlert` de `NOT_IMPLEMENTED` no topo da aba, como a "Empresa" mostra as falhas, e o sucesso por alteração temporária (recomendada).** Sem texto novo além do de L4.
- [ ] **2. Um aviso próprio da demonstração no lugar do `FormAlert`.** Dois componentes para a mesma coisa.

**Texto proposto:** nenhum além do de L4.

## Decisões técnicas

- Seguidas: 0022 (exclusão lógica; funcionário e cargo só são desativados), 0027 (React Hook Form), 0039 (tarefas de ponta a ponta), 0041 (wireframes de referência), 0049 (shadcn sobre Base UI), 0052 (testes à mão para telas) e 0055 (telas de demonstração), mais `componentes.md` (diálogos, listagem, formulário em etapas), `frontend.md` e `design.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Janelas e confirmações montadas.** As janelas de edição e as confirmações ficam sempre montadas, com o gatilho do cartão, como no `CategoryCard`; o foco volta ao botão de origem, verificado em M11.
- **`mode: "onTouched"` do formulário de categoria.** Na #64 o primeiro envio do formulário de cliente indicava só o primeiro campo vazio com `mode: "onTouched"`; a janela de categoria da #63 usa o mesmo `mode`. As novas janelas usam a validação padrão no envio, e a de categoria é conferida em M10; se tiver o mesmo defeito, o ajuste de `category-form-dialog.tsx` entra no último PR como arquivo fora da lista, com o Yvan confirmando (P5).
- **Validação só da tela.** O formulário confere só o obrigatório (`rules` do React Hook Form): formato de e-mail e regras da senha entram com o esquema em #43; o horário inconsistente e a pausa fora do expediente (UC23 FE01 e FE02) e o percentual fora do intervalo (UC24 FE01) em #41; o nome repetido de cargo (`NAME_IN_USE`) em #39. As listas de horários só oferecem horas cheias e meias, e o campo de percentual aceita só dígitos e vírgula.
- **Mensagens do catálogo.** `EMAIL_IN_USE` ("Este e-mail não pode ser usado. Se você já tem conta, entre com ela.") foi escrita para o cadastro público e aparece no painel em UC19 FE02, onde o sistema "informa o conflito" (mesma lacuna da L4 da #64). A tela mostra a mensagem do catálogo, e a #43 decide se o painel ganha texto próprio; `NAME_IN_USE` e `VERSION_CONFLICT` são conferidos na tela em M10 e as mensagens, ajustadas às dos cargos se destoarem.
- **Dados que mudam sozinhos.** As gravações não gravam; as listas ficam como o demonstrado. A releitura, o sucesso e os 409 são verificados por alteração temporária antes do último PR, como na #62 a #64.
- **Cargo inativo com funcionário vinculado.** A demonstração tem o Murilo Teixeira inativo no cargo Detalhista (ativo) e nenhum funcionário ativo em cargo inativo; a edição mostra o cargo atual inativo com a etiqueta se um dia ocorrer (L1). O efeito sobre o acesso é da #39.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local (3,2 s na #64); é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo seu.
- **Sem conta de administrador na lista.** A demonstração nunca devolve a conta de administrador (RN027, RF084); com a rota, a regra é do servidor.

## Divisão em PRs e pontos à parte

O total previsto em `src/` passa de 400 linhas (cerca de 1.300 a 1.600 com tipos, dados, duas listas, quatro formulários em etapas, as confirmações e as duas abas), então proponho **quatro PRs encadeados**, cada um verificado e com `npm run check` verde, o último com "Closes #65" e `memoria/tarefas/65-…` só nele, como na #61 a #64.

### P1. Divisão em PRs

- [x] **1. Quatro PRs (recomendada).**
  - **PR 1 – base:** tipos, dados de demonstração de equipe, cargos, disponibilidade e formas de pagamento, entradas de `routes.ts`, `rotas.md` (L2) e os dois módulos novos (L1, L3, L4) (~300 linhas em `src/`).
  - **PR 2 – abas de configurações:** "Disponibilidade" e "Formas de pagamento" em `settings-tabs.tsx`, com o aviso (~450 linhas).
  - **PR 3 – listas de `/admin/staff`:** página, abas, as duas listas e cartões, desativação e reativação com confirmação, e o interruptor de inativos (~400 linhas).
  - **PR 4 – formulários de `/admin/staff`:** cadastro e edição de funcionário e de cargo, em duas etapas (~500 linhas).
- [ ] **2. Três PRs, juntando as listas e os formulários de `/admin/staff`.** Um PR de cerca de 900 linhas, difícil de revisar.
- [ ] **3. Um PR só.** Mais de 1.300 linhas de uma vez.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** Docker Desktop aberto; `npx supabase start` e `db reset` (carrega o `seed-demo.sql`); admin local criado por `make-admin.mjs` (senha gerada, não registrada); `next build` e `next start -p 3060` com as variáveis do banco local; cookie do admin no Lighthouse (CLI 13.5, `navigation` para as páginas e `snapshot` para os estados); alterações temporárias de `src/lib/demo` e `src/lib/api-client.ts` sem commit, desfeitas por `git checkout -- src`. Os roteiros são recriados a partir dos de `61-scripts-de-verificacao/` no scratchpad da sessão, com os caminhos do worktree. Tudo é feito antes de marcar o último PR como pronto, inclusive o teclado completo e o LCP e o CLS do celular; no fim, `npx supabase stop`. A gravação real da aba "Empresa" é conferida no banco local.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da gravação real da "Empresa".

### P3. Desativação e reativação: componente novo ou generalizar o `CategoryCard`

- [x] **1. Um componente pequeno novo (`active-confirm.tsx`), com `ConfirmDialog` e o `PATCH` de `isActive`, usado pelos cartões de funcionário e de cargo (recomendada).** Não mexe no catálogo da #63, que a verificação dela já cobriu.
- [ ] **2. Generalizar o botão de `CategoryCard` e levá-lo a `src/components/shared/`.** Evita um terceiro caso parecido, mas toca `/admin/services`.

### P4. O que fica para você conferir

- [ ] A tela em produção logada (Vercel), depois da incorporação do último PR: passo seu, listado no relatório; e, se o professor for ver a demonstração, o `seed.sql` de produção já cria os sete dias e as quatro formas, mas não os funcionários e os cargos de demonstração: eles vêm do código.

### P5. Ajuste do `mode: "onTouched"` da janela de categoria, se confirmado o defeito

- [x] **1. Corrigir em `category-form-dialog.tsx` no último PR, se M10 confirmar (recomendada).** Uma linha, com o aviso no relatório.
- [ ] **2. Só registrar na issue da #63 / nas notas.** Deixa o defeito do primeiro envio.

## Fora do escopo

- As rotas de funcionários, cargos, disponibilidade e formas de pagamento (#39, #41 e #43), com `EMAIL_IN_USE`, `NAME_IN_USE`, a gravação da senha inicial e a regra de que o cargo desativado não concede permissões.
- A aba "Empresa" (#37), que não muda.
- Busca de funcionários e de cargos, "Admissão", troca de senha de funcionário pelo painel e reenvio de convite: sem requisito em `docs/equipe/`.
- Validação de formato, de horários e de percentual (esquemas Zod): entram com as rotas.
