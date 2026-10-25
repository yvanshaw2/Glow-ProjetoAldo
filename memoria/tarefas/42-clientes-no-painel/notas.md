# Notas: 42-clientes-no-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-25 – descoberta: dependências conferidas

A #42 depende da #64 (a página com dados de demonstração), incorporada. `git fetch` feito: `origin/main` em 1ed1089 (#39, PR #113), e o worktree (`claude/cool-villani-682bef`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em 1ed1089, árvore limpa. Plano e notas sem commit, como nas etapas 01 anteriores; a etapa 02 cria `feat/42-clients` a partir da `origin/main`.

## 2026-10-25 – descoberta: código reaproveitável

- `register` (`services/auth.ts`) é o molde do cadastro: `createAccount`, depois `insertClient`, com `discardAccount` se o perfil falhar. `insertClient` grava `must_change_password` com o padrão do banco (falso); o cadastro pelo painel precisa do verdadeiro.
- `findClientAccount` e `loadAccount` já tratam o cliente excluído como inexistente (`deleted_at is null`): a exclusão lógica já tira o acesso na requisição seguinte.
- Tela da #64 pronta: `ClientList`, `ClientCard`, `ClientDetailsDialog` (lê o cliente e os veículos ao abrir), `ClientFormDialog` (sem esquema), `client-fields.tsx` (só `isFilled`), `DeleteClientButton`. O `ClientFormDialog` já envia o `updatedAt` na edição e trata `VERSION_CONFLICT` com `onConflict`.
- O `seed-demo.sql` já tem os 13 clientes, os 14 veículos, os vínculos e os agendamentos (sem conta no Auth); os ids vêm de `glow_demo_id('client:<email>')` e batem com os de `SEED_CLIENTS`, então a demonstração dos veículos por `/api/admin/clients/:id/vehicles` continua coerente com os clientes reais do seed.
- A rota de demonstração dos veículos dá 404 para cliente fora do seed: precisa de lista vazia depois que os clientes forem reais (L3).
- Nenhum outro componente usa `/api/admin/clients` (busca no código); `booking-client-step.tsx` (agendamento do painel) será conferido antes do PR.
- Sem migration: nenhuma gravação em várias tabelas; a conta do Auth é outro serviço.

## 2026-10-25 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L5 e os pontos P1 a P3 (opção recomendada primeiro: texto próprio de `EMAIL_IN_USE` no painel, foco no campo de busca depois de excluir, aviso só na seção "Veículos" com lista vazia para o cliente fora do seed, busca por palavras sem diferenciar maiúsculas, exclusão marcando primeiro e desfazendo a marca se a conta não sair, um PR só, ambiente como nas tarefas anteriores). Nenhuma migration, dependência nem decisão técnica nova.

## 2026-10-25 – decisão: plano aprovado

O Yvan gravou `status: aprovado` (13:02 de 25/10/2026) com a opção 1 em L1 a L5, P1, P2 e P3. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificação `feat/42-clients` criada da `origin/main` (1ed1089), sem vínculo. Testes escritos antes e vistos falhar (commit `fdcab90`).

## 2026-10-25 – desvio: arquivo fora da lista do plano (a confirmar)

`src/server/http/handler.ts` (`respondProblem`): passa a usar `error.message` em `detail`, em vez de buscar a mensagem no catálogo, para a mensagem própria de L1 chegar à resposta. Para os demais erros `error.message` é a do catálogo (o `AppError` a usa por padrão), então nada muda. Fica em commit próprio, para o Yvan confirmar ou pedir outro caminho.

## 2026-10-25 – desvio: arquivos e detalhes fora do que o plano descrevia

- O foco depois de excluir usa `document.querySelector("main input[type=search]")` (como o `RoleCard` com o interruptor), então `paginated-list.tsx` e `client-list.tsx` **não** mudaram.
- A mensagem de L1 vai em `docs/clientes/rotas.md` (`POST`) e em `clientes-do-painel.md`; `mensagens-de-validacao.md` não mudou, porque a tabela é de validação de campo e não de erros da API.
- `docs/clientes/dados.md` (L5) e `src/shared/validation/README.md` entraram na lista.
- O formulário usa `zodResolver` com uma conversão de tipo contida (`as unknown as Resolver<ClientFormValues>`), porque a edição valida só três dos cinco campos do formulário.
