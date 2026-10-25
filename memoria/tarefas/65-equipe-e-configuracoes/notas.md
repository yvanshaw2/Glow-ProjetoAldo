# Notas: 65-equipe-e-configuracoes

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-24 – descoberta: dependências conferidas

A #65 é a T9 de `memoria/tarefas/66-analise-por-ia/proposta-das-issues.md` e depende só da #56, incorporada. `origin/main` e a ramificação da sessão (`claude/keen-mclean-5a8e42`, worktree `56-base-da-demonstracao-e6d9a4`, nome herdado e não renomeável) em fc6bd58 (#99, a #64), árvore limpa; nenhum PR aberto. As rotas (#39, #41 e #43) estão abertas e sem código; só `GET` e `PUT /api/admin/settings/company` existem (#37). Plano e notas sem commit, como nas etapas 01 anteriores.

## 2026-10-24 – descoberta: notas de passagem lidas

Lidos o plano, as notas e o relatório da #64, o plano da #63 e as notas da #61 (`side-session-notes/local_c7eddc37-…`, dados de outra sessão): janelas sempre montadas com o gatilho `hidden`, `FormAlert` no topo com o foco, `aria-label` nos `combobox`, as armadilhas da verificação (heredoc com apóstrofo, `$$` em `String.replace`, `puppeteer click()` fora da tela, `triple click` em `input[type=search]`, espaço não separável em `formatCurrency`, `next build` com patch quebrado) e os achados da #64 (`mode: "onTouched"` do React Hook Form, mensagens do catálogo escritas para o portal). Os roteiros de `61-scripts-de-verificacao/` não foram copiados nesta etapa; a etapa 02 os recria no scratchpad com os caminhos deste worktree.

## 2026-10-24 – descoberta: código reaproveitável

- `CategoryCard`, `CategoryList`, `CategoryFormDialog`, `InactiveSwitch` e `CatalogTabs` (#63) são o molde de cartão com situação, "Exibir inativos", confirmação de desativação e reativação, e abas com o botão de criar. O `ServiceWizard` e o `StepForm` dão o formulário em duas etapas. `settings-tabs.tsx` tem uma aba e `keepMounted`; `company-settings-form.tsx` tem o sucesso como status e a releitura do 409.
- `src/app/(admin)/admin/staff/` só tem o `README.md`: a página é nova. Nenhum módulo de demonstração de equipe ou de configurações existe em `src/lib/demo/`.
- `PERMISSIONS` já está na ordem de RN025; `WEEKDAY_LABELS`, `PAYMENT_METHOD_LABELS`, `formatPercent` e `TIME_SLOT_MINUTES` existem.

## 2026-10-24 – descoberta: wireframes

PDFs de `staffPages/staffManagment/` e `adminPainelConfs/` abertos no painel do navegador (celular; a visualização estática não rolou, então as janelas só aparecem pelo cabeçalho): título "Funcionários" com as abas "Funcionários" e "Cargos" e o botão "Convidar" ou "Novo cargo", "Exibir inativos", cartão de funcionário (nome, "Ativo", e-mail, "Função", "Admissão", etiqueta do cargo, "Editar" e "Desativar"), cartão de cargo (descrição, "N permissões", etiquetas de permissão com "+N"), indicação de etapas "Identificação" e "Permissões" ou "Informações" e "Cargo", disponibilidade em uma linha por dia (sem pausa, fechando às 17:00 e às 13:00) e formas de pagamento com regras de sinal por forma e botão de gravar por forma. O desktop não foi aberto (mesmo esqueleto).

## 2026-10-24 – descoberta: lacunas e contradições

- Nenhum módulo define textos, cartões, janelas e estados de `/admin/staff` (L1) nem das abas "Disponibilidade" e "Formas de pagamento" (L4); `rotas.md` não tem os campos das leituras (L2).
- O `seed-demo.sql` não tem funcionários nem cargos, e `componentes.md` manda usar os nomes dele (L3).
- O wireframe diverge de `docs/`: sem pausa, horários 17:00 e 13:00, regras de sinal por forma de pagamento, "Admissão" e "Convidar" (vale `docs/`; L1 e L4).
- O `PUT` de disponibilidade e o de formas de pagamento não pedem `updatedAt`, então essas abas não têm `VERSION_CONFLICT` (L2).
- A janela de categoria da #63 usa `mode: "onTouched"`, que na #64 fez o primeiro envio indicar só o primeiro campo vazio; conferir em M10 (P5).

## 2026-10-24 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L5 e os pontos P1 a P5 (opção recomendada primeiro: quatro PRs, ambiente como nas tarefas anteriores, componente novo de desativação, produção logada como passo do Yvan, correção do `onTouched` só se confirmada). Nenhum teste automatizado novo (decisão 0052), nenhuma dependência nova e nenhuma decisão técnica nova. A etapa 02 só começa quando o Yvan gravar `aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-10-24 – decisão: plano aprovado

O Yvan gravou `status: aprovado` em 24/10/2026, com a opção 1 em L1 a L5, P1, P2, P3 e P5 (caixas `[x]`; o P4 é só aviso). Conferido no arquivo antes da etapa 02; o `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`.

## 2026-10-24 – desvio: arquivos fora da lista do plano

`choice-group.tsx` e `inactive-switch.tsx` foram movidos de `admin/catalog/` para `shared/` (passaram a ser usados por mais de um módulo; `shared/README.md` manda), e `active-confirm.tsx` nasceu em `shared/` porque cartões de funcionário e de cargo, de módulos diferentes, o usam. Entraram também `settings-section.tsx`, `settings-notices.tsx`, `availability-values.ts` e `payment-fees-values.ts`. Os imports de quatro arquivos do catálogo mudaram. Tudo está na lista do plano, para o Yvan confirmar.

## 2026-10-24 – descoberta: o aviso do React Hook Form na janela de categoria

A janela de categoria da #63 (`mode: "onTouched"`) indica os dois campos vazios no primeiro envio; o defeito da #64 não ocorre lá. As janelas novas usam a validação padrão no envio.

## 2026-10-24 – descoberta: abas do Base UI

As setas movem o foco entre as abas, mas não as ativam; Enter ou Espaço ativa a aba focada. Nos roteiros de verificação, `focus()` programático numa aba também não a ativa.

## 2026-10-24 – decisão: PRs e verificação

#101 (base), #102 (abas de configurações, sobre o #101), #103 (listas de `/admin/staff`, sobre o #102) e #104 (formulários, sobre o #103, `Closes #65`), todos rascunho; `memoria/` só no último, como na #62 a #64. Verificação completa no ambiente local antes de fechar o último PR (teclado, Lighthouse de acessibilidade em página e 60 estados, LCP e CLS do celular, falha, vazio, carregamento, sucesso e conflito por alteração temporária, e gravação real da "Empresa"); detalhes no relatório. Ambiente local encerrado. Pendência do Yvan: a produção logada.
