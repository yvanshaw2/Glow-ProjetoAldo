---
issue: 3
pull_request: 8
---

# Relatório: Conta e veículos do cliente no portal

Em dois PRs, como aprovado em P1: o #7, da API (`Refs #3`), e o #8, da tela (`Closes #3`), sobre o #7. O relatório está completo, e o plano passou a `concluido` neste PR.

## O que foi feito

PR #7, API (UC04, UC05, RF012, RF013, RF015 a RF018, RN002, RN035, RN036, RS009, RS013, RNF011):

- **Rotas** com `requireClient`, sempre sobre o cliente da sessão:
  - `GET /api/me/profile` (sem o `id`) e `PATCH /api/me/profile`, parcial e condicionado ao `updatedAt` (L3);
  - `GET /api/me/vehicles` (10 por página, na ordem do vínculo, com `isShared`), `GET /api/me/vehicles/lookup` (cinco campos ou `null`), `POST /api/me/vehicles` (placa nova cria; placa cadastrada vincula sem alterar e ignora os demais campos; 409 `VEHICLE_ALREADY_LINKED` com "Este veículo já está na sua conta.", L2) e `PATCH /api/me/vehicles/:id` (404 para veículo de outra conta, L1; 409 `VEHICLE_SHARED`, `PLATE_IN_USE` e `VERSION_CONFLICT`).
- **Regra** `findClientVehicleAccess`: da conta e sozinho nela edita; fora da conta é `missing` (mesmo 404 de veículo inexistente); em mais de uma conta é `shared`.
- Serviços sobre os da #42 e da #45; OpenAPI com as seis operações, `ClientProfile` e `ClientForbidden`.

PR #8, tela:

- O formulário da conta valida com o `clientEditSchema` e envia o `updatedAt` lido com o perfil; sai o `DemoNotice` da seção e da aba "Meus veículos".
- Saem as seis entradas de `/api/me/profile` e `/api/me/vehicles` de `src/lib/demo/routes.ts` e os módulos `demo/clients.ts` e `demo/vehicles.ts`.

## Arquivos alterados

- API: `src/server/rules/vehicle-ownership.ts` (novo) e `README.md`; `src/server/services/clients.ts` e `vehicles.ts`; `src/app/api/me/profile/route.ts`, `vehicles/route.ts`, `vehicles/lookup/route.ts` e `vehicles/[id]/route.ts` (novos); `tests/rules/vehicle-ownership.test.ts` (novo) e `tests/validation/clients.test.ts`; `docs/plataforma/openapi.yaml` e `docs/clientes/rotas.md`.
- Tela: `src/components/portal/clients/account-form.tsx` e `profile-tabs.tsx`; `src/lib/demo/routes.ts`, `clients.ts` e `vehicles.ts` (apagados), `README.md` e `appointments.ts` (só um comentário); `docs/clientes/area-do-cliente.md`; `memoria/tarefas/3-conta-e-veiculos-do-cliente/`.

Desvios do plano (ver `notas.md`): sem `clientEditFormSchema`, porque o `clientEditSchema` já serve ao formulário; `src/lib/demo/appointments.ts` ficou fora da lista original (só um comentário), acrescentado a ela e confirmado antes do PR.

## Testes executados

- `npm run check`: sem erros nem avisos (769 testes; 5 novos da regra e 4 do `clientEditSchema`, escritos antes do código e vistos falhar, a regra em commit próprio) e `npx next build`.
- **Rotas**, no banco local (`db reset`, `seed-demo.sql`, administradora e duas contas de cliente do seed, `next start` na porta 3057), pelo roteiro `verify-api.mjs`, 41 conferências, tudo certo:
  - 401 sem sessão e 403 para a administradora nas rotas e no `PATCH`;
  - perfil: dados do banco sem `id`; `PATCH` do celular com máscara grava os 11 algarismos e devolve novo `updatedAt`; com o `updatedAt` antigo, 409 `VERSION_CONFLICT` e nada gravado; `email` e `id` no corpo ignorados; celular inválido e corpo só com a versão, 400;
  - veículos: lista com os dois do Henrique (um compartilhado) e `pageSize`; `lookup` com cinco campos, `null` para placa nova e 400 para placa inválida; `POST` só com a placa de outra conta vincula sem criar veículo (contagem igual, dados e tipo intactos, passa a `isShared`) e repetido dá 409 com a mensagem do portal; `POST` com placa nova e `size` no corpo grava o porte do tipo; placa nova incompleta, 400 com os campos; `PATCH` troca o tipo e redefine o porte; versão antiga, 409; placa de outro veículo, 409 `PLATE_IN_USE`; veículo compartilhado, 409 `VEHICLE_SHARED` com a linha intacta; veículo de outra conta, id inexistente e id que não é UUID, 404, sem nada gravado.
- **Tela**, em `/profile` pelo `ui-profile.mjs` (Chrome sem interface, `next start`, banco refeito antes de cada passada), em 360 × 800 claro e 1440 × 900 escuro, tudo certo nas duas: conta lida do banco sem aviso de demonstração; celular inválido mostra a mensagem e não envia; celular salvo e conferido no banco; duas cartas de veículo, a compartilhada com o aviso e sem "Editar"; cadastro com placa vazia, placa de outra conta (dados preenchidos e "Adicionar à minha conta"), placa nova sem tipo (erro) e com os dados (Sedan, Porte M); edição da cor. Capturas lidas em 360 px.
- Lighthouse em `/profile` no celular simulado: acessibilidade 1,00; desempenho 0,92; LCP de 3,3 s (a página lê a API depois da hidratação, o mesmo padrão das telas anteriores, acima de 2,5 s).
- Único erro do console nas duas passadas: 404 de `/favicon.ico`, anterior a esta tarefa.

## Documentação atualizada

- Módulos: `docs/clientes/rotas.md` (L1 a L3), `docs/clientes/area-do-cliente.md` (sem aviso de demonstração), `docs/plataforma/openapi.yaml`, `src/lib/demo/README.md`.
- Lacunas resolvidas: L1 → 404 para veículo de outra conta → `rotas.md`; L2 → entrada do `POST` e do `PATCH` como a do painel → `rotas.md`; L3 → `PATCH /api/me/profile` com `updatedAt` e ao menos um campo → `rotas.md`; L4 → aviso do `/booking` mantido → só `notas.md` e este relatório.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- **#4 (agendamento do cliente):** o passo do veículo em `/booking` já grava de verdade (cadastro de veículo pelo diálogo compartilhado) enquanto o resto da página segue em demonstração, com o aviso da página; a #4 tira o aviso.
- A janela de milissegundos entre ler as contas do veículo e gravar a edição (o funcionário pode vincular outra conta nesse intervalo) fica como está; fechá-la exigiria uma função SQL, fora desta issue.
- O Next.js 16.4.1 avisa de vulnerabilidade conhecida no `next build`; atualizar é outra tarefa.
