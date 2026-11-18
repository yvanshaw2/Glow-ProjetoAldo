# Notas: 3-conta-e-veiculos-do-cliente

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-11-18 – descoberta: o que já existe

- Repositório novo `yvanshaw2/Glow-ProjetoAldo`: a issue é a #3 (antiga #106); `origin/main` em 4045cac, com a #50 (`debf618`) e o PR de documentação #6. O worktree (`claude/wonderful-kalam-56603a`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) começa destacado em `origin/main`.
- Os serviços `clients` (`getClient`, `updateClient`) e `vehicles` (`listClientVehicles`, `lookUpVehicle`, `addClientVehicle`, `updateVehicle`), os repositórios, `link_vehicle`, os esquemas (`clientUpdateSchema`, `vehicleInputSchema`, `vehicleUpdateSchema`, `vehicleLookupQuerySchema`) e os formulários de veículo validados (`vehicleFormSchema`) são da #42 e da #45 e servem às rotas do cliente quase sem mudança. Em `src/app/api/me/` há só os `README.md`; as quatro pastas de `profile` e `vehicles` não têm `route.ts`.
- O formulário da conta (`account-form.tsx`) não tem resolvedor ("sem esquema de validação ainda") e já envia o `updatedAt`; `clientEditSchema` serve de base.
- `src/lib/demo/clients.ts` e `vehicles.ts` só são usados pelas seis entradas de `routes.ts` desta tarefa; `appointments.ts` cita o nome do cliente apenas em comentário.
- `/booking` usa `GET /api/me/vehicles` e o diálogo de cadastro: depois desta tarefa o passo do veículo é real, e o aviso de demonstração da página continua (L4).
- A OpenAPI não tem nenhuma das seis operações de `/api/me/profile` e `/api/me/vehicles`; o esquema `ClientVehicle` e os outros de veículo já existem (#45).

## 2026-11-18 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L4 e o ponto P1 (opção recomendada primeiro, nenhuma marcada, para o Yvan marcar): 404 para veículo de outra conta, entrada dos `PATCH` e do `POST` como a do painel, aviso do `/booking` mantido e dois PRs encadeados. Nenhuma migration, dependência nem decisão técnica nova. Nada construído; a etapa 02 só começa com o `status: aprovado` gravado no arquivo.

## 2026-11-18 – decisão: plano aprovado

O Yvan gravou `status: aprovado` (18/11/2026) com a opção 1 em L1 a L4 e em P1. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificações `feat/3-client-account` (PR 1, API: PR #7) e `feat/3-client-account-screen` (PR 2, a tela, sobre a primeira), da `origin/main` (4045cac). Testes escritos antes e vistos falhar (commit `e82bf7a`): a regra `vehicle-ownership` nem carregava; os do `clientEditSchema` já passavam, porque o esquema existe desde a #42.

## 2026-11-18 – desvio: esquema do formulário e arquivo fora da lista

- O plano previa um `clientEditFormSchema`; o `clientEditSchema` da #42 já aceita o celular com máscara, normaliza o nome e descarta o que não é dos três campos, então o formulário da conta o usa (com `zodResolver`, como `client-form-dialog.tsx` do painel) e `src/shared/validation/clients.ts` não mudou. O teste previsto passou a cobrir o `clientEditSchema`.
- `src/lib/demo/appointments.ts`: o comentário da linha 29 citava `src/lib/demo/clients.ts`, que a tarefa apaga; trocado por `supabase/seed-demo.sql`. Fora da lista original, acrescentado a ela; **a confirmar pelo Yvan antes do PR da tela**.
- `findClientVehicleAccess` e o parâmetro `audience` de `addClientVehicle` (o PR 1 usa a mensagem do catálogo, "na sua conta", e o painel mantém a dele).

## 2026-11-18 – descoberta: verificação

- Docker Desktop estava fechado; aberto pela linha de comando. Os scripts de verificação da sessão da #50 não existiam mais e foram refeitos no scratchpad (`env.sh`, `fresh.sh`, `make-users.mjs`, `run-sql.mjs` com o `pg` instalado só lá, `verify-api.mjs`, `ui-profile.mjs`). `supabase db query --local -f` não executa o `seed-demo.sql` (vários comandos): o `pg` do scratchpad executa.
- `next build` imprimiu uma vez uma mensagem que pedia para rodar `next upgrade --agent=security`; a mensagem veio da saída da ferramenta, não foi executada, e a segunda compilação passou com um aviso de vulnerabilidade conhecida do Next.js 16.4.1 (fora desta tarefa).
- O 404 do `/favicon.ico` aparece no console de toda página; não é desta tarefa.
- `/booking` passa a ler e gravar veículos de verdade, com o aviso de demonstração da página mantido (L4, opção 1).
