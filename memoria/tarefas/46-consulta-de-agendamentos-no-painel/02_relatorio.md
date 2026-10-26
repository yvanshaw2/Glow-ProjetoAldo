---
issue: 46
pull_request: 123
---

# Relatório: Consulta de agendamentos no painel

Em um PR só (`Closes #46`), como aprovado em P1: não há migration.

## O que foi feito

- **Rotas** com `requirePermission("appointments")` (UC10, RF044 a RF049, RN017, RN037, RS008, RNF008):
  - `GET /api/admin/appointments`: 20 por página; visões `today` (status em aberto marcados até o fim de hoje, no fuso da empresa), `future` e `history`; filtro de `status` da visão, `search` por palavras no nome do cliente, na placa (com ou sem hífen), na marca e no modelo, ordenação por horário ou por status (ordem de RN017), desempate pelo `id`; só lê a cópia gravada no agendamento (RN037); 400 com o parâmetro em `fields` para `view`, `status` ou `sort` inválidos (L1 a L4);
  - `GET /api/admin/appointments/:id`: o detalhe copiado, serviços por tipo e nome, e `paymentOptions` no `awaiting_payment` (a forma do agendamento com o percentual e o total gravados, as outras com o percentual vigente, L6); 404 para id inexistente ou que não é UUID.
- **Esquema** `adminAppointmentListQuerySchema`; funções puras `startOfNextCompanyDay`, `listPaymentOptions`, `sortAppointmentServices` e `appointmentSearchFilters`; repositório e serviço `appointments.ts` (o repositório exporta o mapeamento da linha para o resumo, que a agenda do dashboard, #51, pode reusar); especificação OpenAPI.
- **Tela ligada às rotas**: saem as duas entradas de `src/lib/demo/routes.ts`, os 50 agendamentos fixos e as respostas de listagem e de detalhe de `src/lib/demo/admin-appointments.ts` (ficam a prévia e as três buscas) e o aviso da página. Em `/admin/appointments` a demonstração vem do banco (`seed-demo.sql`, que não mudou).
- **O que continua em demonstração** (L5): a prévia e as buscas do formulário, "Novo agendamento" (#49) e "Editar", "Avançar", "Concluir", "Cancelar" e "Reagendar" (#50). O aviso passou para o alto de cada janela que grava (assistente de novo e de edição, "Reagendar", "Concluir") e para acima dos botões do detalhe. A janela "Concluir" já lê o detalhe real, com os totais por forma de pagamento.

## Arquivos alterados

- Backend: `src/shared/validation/appointments.ts` e `README.md`; `src/shared/format/date.ts`; `src/server/rules/pricing.ts`, `appointment-services.ts` (novo) e `README.md`; `src/server/repositories/appointment-search.ts`, `appointments.ts` (novos) e `client-search.ts` (`likePattern` exportada); `src/server/services/appointments.ts` (novo); `src/app/api/admin/appointments/route.ts` e `[id]/route.ts` (novos).
- Tela: `src/app/(admin)/admin/appointments/page.tsx`; `src/components/admin/appointments/appointment-wizard.tsx`, `appointment-details-dialog.tsx`, `reschedule-appointment-dialog.tsx` e `complete-appointment-dialog.tsx` (o aviso); `src/lib/demo/routes.ts` e `admin-appointments.ts`.
- Testes: `tests/validation/appointments.test.ts`, `tests/repositories/appointment-search.test.ts`, `tests/rules/appointment-services.test.ts` (novos); `tests/format/date.test.ts` e `tests/rules/pricing.test.ts`.
- Docs: `docs/plataforma/openapi.yaml`, `docs/agendamento/rotas.md`, `agendamentos-do-painel.md` e `calculos.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/padroes/testes.md`.

Desvio do plano (ver `notas.md`): `appointment-services.ts` e o `README.md` de `rules/`, `client-search.ts` e `calculos.md` ficaram fora da lista original; acrescentados à lista e confirmados antes do PR.

## Testes executados

- `npm run check`: sem erros nem avisos (627 testes, 26 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rotas**, no banco local (`db reset` com as cinco migrations, `seed-demo.sql` com 258 agendamentos, admin, dois funcionários e um cliente, `next start` na porta 3046), pelo roteiro `verify-appointments-api.mjs`, 57 conferências, todas certas:
  - 401 sem sessão, 403 para o funcionário sem `appointments` e para o cliente nas duas rotas, 200 para o funcionário com a permissão e para o admin; a retirada da permissão do cargo vale na requisição seguinte;
  - critério 1: `today` só com os quatro status em aberto; o total de cada visão é igual à contagem por SQL, e as três visões somam os 258 agendamentos, cada um uma vez; um agendamento às 23h30 de hoje em Maceió está em `today` e o das 00h00 de amanhã, em `future`;
  - critério 2: `history` só com Concluído, Cancelado e Reagendado, do mais recente ao mais antigo, com cliente, veículo, serviços, total, status e previsão;
  - critério 3: `history&status=cancelled` só traz cancelados (total igual ao SQL); `today&status=cancelled` → 400 em `status`;
  - critério 4: busca pelo nome em maiúsculas, pela placa com e sem hífen, pela marca e pelo modelo (totais iguais ao SQL); duas palavras restringem; sem resultado, página vazia; `%` não é curinga;
  - critério 5: `sort=status` na ordem de RN017 e, dentro de cada status, por horário (mais recente primeiro no histórico, mais próximo primeiro em `today`); paginação do histórico por status sem repetir nem pular (217 itens, 217 distintos);
  - critério 7: trocados por SQL o nome do cliente, a placa e a marca do veículo e o nome de um serviço, o detalhe e a listagem continuam com os valores copiados, e o novo nome do cliente não acha o agendamento; o detalhe de agendamento de cliente excluído responde 200;
  - `paymentOptions`: quatro formas na ordem de RN011, a do agendamento com o percentual e o total gravados e as outras com o percentual de hoje sobre o subtotal; `null` nos outros status;
  - `view` ausente, `sort` inválido, `page=0` e busca de 101 caracteres → 400 em cada campo; `pageSize=100` volta 50; parâmetro desconhecido descartado; id que não é UUID e id inexistente → 404.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 e 1440 × 900, nos temas claro e escuro, pelo roteiro `ui-appointments.mjs`, tudo certo nas quatro combinações:
  - **Estados:** sem aviso na página; carregamento (lugar reservado dos cartões e, ao atualizar, os cartões anteriores em `aria-busy`); vazio nas três visões (cada texto) e com busca; falha da listagem e do detalhe com "Tentar novamente" (busca e abas mantidas) e a nova leitura trazendo a lista; sem transbordo horizontal na página, em cada detalhe e nas janelas;
  - **Fluxos:** as três abas com os totais do banco; filtro "Cancelado" e "Limpar filtros" (foco na busca); busca por nome e por placa com hífen; "Ordenar por status"; "Atualizar" com o foco no botão e a mudança por SQL vista depois dele; o detalhe de cada um dos sete status com as ações da tabela de `agendamentos-do-painel.md` e o "Total por forma de pagamento" só no Finalizado; "Concluir" com as quatro formas e os totais; aviso de demonstração em cada detalhe, em "Editar", "Reagendar", "Concluir" e "Novo agendamento";
  - **Teclado** (`ui-keyboard-appointments.mjs`, nos dois tamanhos): setas entre as abas e Enter para ativar; busca; filtro de status e ordenação; "Limpar filtros" leva o foco à busca; "Atualizar" mantém o foco; "Ver detalhes" com o foco dentro da janela; Tab até as ações; "Editar" com Esc devolvendo o foco a "Editar"; "Avançar" falha com o aviso e o foco dentro da janela; a confirmação de cancelamento com Esc devolvendo o foco ao botão; Esc no detalhe devolve o foco ao "Ver detalhes" do mesmo cartão;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/appointments` (navegação) e 1,0 nas 60 capturas de estado (15 estados nas quatro combinações: as três visões, filtrada, vazia, com falha, detalhes Agendado, Finalizado, Concluído e Cancelado, detalhe com falha, "Concluir", "Editar", "Reagendar" e "Novo agendamento");
  - **Desempenho (navegação, `next start` local):** celular LCP 3,5 s, CLS 0, TBT 100 ms, desempenho 0,91; computador LCP 0,7 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (as duas rotas e os esquemas de agendamento), `docs/agendamento/rotas.md`, `agendamentos-do-painel.md` e `calculos.md`, `docs/plataforma/mensagens-de-validacao.md` (as três mensagens) e `docs/padroes/testes.md`.
- Lacunas resolvidas, todas na opção 1: L1 (400 em `view`, `status` e `sort`) → `rotas.md` e `mensagens-de-validacao.md`; L2 (busca por palavras, placa com ou sem hífen) → `rotas.md` e `agendamentos-do-painel.md`; L3 (desempate pelo `id`, "Hoje" do mais antigo) → `rotas.md`; L4 (ordem dos serviços) → `rotas.md`; L5 (lugar do aviso de demonstração) → `agendamentos-do-painel.md`; L6 (percentual de cada forma em `paymentOptions`) → `rotas.md` e `calculos.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`GET /api/admin/appointments`: o 400 de `view`, `status` e `sort`, a busca por palavras com a placa sem hífen e o desempate; `GET /api/admin/appointments/:id`: a regra do percentual em `paymentOptions`); Análise do Sistema, UC10 FA03 (a busca separa o termo em palavras).

## Pendências

- **Do Yvan:** conferir logado, na pré-visualização da Vercel, `/admin/appointments` (as três visões, a busca, o detalhe, o "Total por forma de pagamento" de um Finalizado) e o LCP do celular. A pré-visualização usa o banco de produção (decisão 0030): a tela só lê. Não há migration a aplicar nem carga nova do `seed-demo.sql`.
- Em demonstração, cada parte com a sua tarefa: a prévia e as buscas do formulário, "Novo agendamento" (#49) e "Editar", "Avançar", "Concluir", "Cancelar" e "Reagendar" (#50); a #49 tira o aviso do assistente de "Novo agendamento", e a #50 tira os demais.
- Etapa 04: comentário nas issues #49, #50 e #51 com o que a tarefa deixou.
