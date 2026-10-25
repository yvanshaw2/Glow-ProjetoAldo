---
issue: 42
pull_request: 114
---

# Relatório: Clientes pelo painel: listar, buscar, cadastrar, editar e excluir

Em um PR só (`Closes #42`), como aprovado em P1. O plano passou a `concluido` neste PR.

## O que foi feito

- **Rotas** `GET` e `POST /api/admin/clients` e `GET`, `PATCH` e `DELETE /api/admin/clients/:id`, com `requirePermission("clients")` (UC16, UC17, RF069 a RF074, RN022, RN023, RN030, RS004, RS008, RS010):
  - lista por nome completo, 20 por página, sem os excluídos, com a busca por palavras no nome, no sobrenome, no e-mail e no telefone (com ou sem máscara);
  - `POST` cria a conta no Supabase Auth e o perfil com troca de senha pendente, remove a conta se o perfil falhar e responde 201 sem a senha; `EMAIL_IN_USE` (cliente, funcionário ou administrador) tem o texto do painel "Já existe uma conta com este e-mail." (L1);
  - `PATCH` altera só o que veio (nome, sobrenome, celular), condicionado ao `updatedAt` (RNF011, decisão 0009), com 404 e 409 `VERSION_CONFLICT`; o e-mail não muda;
  - `DELETE` marca `deleted_at`, remove a conta do Auth e preserva veículos e agendamentos; se a conta não sair, a marca é desfeita e o erro é 500 (L5).
- **Esquemas** `clientInputSchema`, `clientEditSchema`, `clientUpdateSchema` e `clientListQuerySchema` (`src/shared/validation/clients.ts`), usados pelas rotas e pelos formulários.
- **Página `/admin/clients` ligada ao banco:** saem de `src/lib/demo/routes.ts` as cinco entradas de clientes e as respostas de demonstração; os formulários usam os esquemas; `EMAIL_IN_USE` e `VERSION_CONFLICT` aparecem no topo da janela; depois de excluir, o foco vai ao campo de busca (L2); o aviso de demonstração saiu da página e ficou só na seção "Veículos" dos detalhes (L3), e o cliente que não é do seed mostra "Nenhum veículo cadastrado".
- **Especificação OpenAPI** das cinco operações.
- A demonstração dos clientes vem do banco (`supabase/seed-demo.sql`, que já os tinha e não mudou).

## Arquivos alterados

- `src/app/api/admin/clients/route.ts` e `[id]/route.ts` (novos) e os `README.md` das duas pastas; `src/server/services/clients.ts` (novo); `src/server/repositories/clients.ts` (listagem, detalhe, edição, exclusão lógica, `mustChangePassword`) e `client-search.ts` (novo); `src/server/auth/accounts.ts` (`deleteAccount` trata `user_not_found` como sucesso).
- `src/shared/validation/clients.ts` (novo) e o `README.md` da pasta; `src/shared/errors/app-error.ts` (`message` opcional) e `src/server/http/handler.ts` (`detail` usa `error.message`).
- `src/components/admin/clients/`: `client-form-dialog.tsx`, `client-fields.tsx`, `client-details-dialog.tsx` e `delete-client-button.tsx`; `src/app/(admin)/admin/clients/page.tsx`.
- `src/lib/demo/routes.ts` e `src/lib/demo/admin-clients.ts`.
- `tests/validation/clients.test.ts`, `tests/repositories/client-search.test.ts` e `tests/repositories/README.md` (novos) e `tests/README.md`.
- `docs/plataforma/openapi.yaml`, `docs/clientes/clientes-do-painel.md`, `rotas.md`, `UC17-manter-cliente.md` e `dados.md`, e `docs/padroes/testes.md`.

Desvios dos arquivos do plano (ver `notas.md`): `handler.ts` entrou na lista (a confirmar); o foco depois de excluir usa `document.querySelector`, então `paginated-list.tsx` e `client-list.tsx` não mudaram; `mensagens-de-validacao.md` não mudou.

## Testes executados

- `npm run check`: sem erros nem avisos (498 testes, 19 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, dependência indireta que esta tarefa não alterou.
- **Rotas**, no banco local (`db reset`, `seed-demo.sql`, admin, dois funcionários e um cliente, `next start` na porta 3042), pelo roteiro `verify-clients-api.mjs`, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `clients` e para o cliente nas cinco operações; `POST` sem `Origin` 403; `text/plain` 415; nada gravado pelas chamadas recusadas; `no-store`;
  - lista em ordem alfabética (14 clientes, 20 por página, `pageSize=100` volta 50, `page=0` 400, busca com 101 caracteres 400); "souza" acha Ana Souza e "silva" não acha ninguém (o seed não tem Silva); "ana souza", "SOUZA ana", e-mail, telefone com e sem máscara; `%`, `_`, vírgula, parêntese, aspas e barra invertida são texto;
  - critério 1: `POST` 201 com nome e e-mail normalizados, celular só com algarismos, sem senha no corpo e id do servidor; perfil com `must_change_password`; o primeiro login responde `mustChangePassword` verdadeiro, `me` é permitido, a troca de senha responde 204 e o login seguinte já não tem a troca pendente; "Maria Silva" é achada por "silva" no sobrenome e por "maria.silva@" no e-mail;
  - critério 2: `EMAIL_IN_USE` para cliente (com a caixa trocada), cliente do seed, funcionário e administrador: 409 com "Já existe uma conta com este e-mail.", sem conta nem perfil gravados; o cadastro público mantém o texto do catálogo;
  - validação: corpo vazio (cinco "Preencha este campo."), e-mail, fixo, senhas fora de RN023 e nome com algarismo, com a mensagem no campo;
  - critério 4: `PATCH` do celular 200 e o `GET` traz o novo; `email` e `password` no corpo são descartados; `updatedAt` antigo 409 `VERSION_CONFLICT` sem gravar; só `updatedAt` 400; id inexistente e que não é UUID 404 nas três operações;
  - critério 5: `DELETE` 204; o cliente do seed com 33 agendamentos mantém agendamentos, vínculos e veículos (258/15/14 antes e depois); sai da lista e do detalhe (404), `PATCH` e `DELETE` repetidos 404, a linha fica com `deleted_at`; o cliente criado pelo painel, depois de excluído, recebe "E-mail ou senha incorretos." no login, a sessão que ele já tinha recebe 401, a conta some do Auth e o e-mail pode ser cadastrado de novo;
  - critério 6 e RS011: a retirada de `clients` do cargo de um funcionário muda o 200 para 403 na requisição seguinte, e a volta devolve o 200;
  - falhas provocadas por alteração temporária (sem commit, desfeita): falha da gravação do perfil → 500 e a conta é removida (a contagem de contas do Auth volta ao que era); falha da remoção da conta → 500 e o `deleted_at` é desfeito, e o cliente continua na lista.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro, tudo certo (`ui-clients.mjs`, `ui-keyboard.mjs`):
  - **Estados:** carregamento (esqueleto, requisição retida), falha da leitura com "Tentar novamente" e releitura, vazio sem busca e com busca ("Nenhum cliente encontrado" e "Limpar filtros" leva o foco à busca), falha do salvar (500: aviso no topo, janela aberta e dados mantidos), falha da leitura dos detalhes com a releitura, falha do excluir (aviso dentro da confirmação), acesso negado (o funcionário sem `clients` que abre `/admin/clients` vai à página dele com o aviso), sem aviso de demonstração na página e com ele na seção "Veículos" dos detalhes, sem transbordo horizontal;
  - **Fluxos:** as cinco mensagens de campo vazio com o foco no primeiro; mensagens de formato; `EMAIL_IN_USE` com o aviso no topo, o foco nele e os dados digitados mantidos; cadastro com o e-mail corrigido (o cartão aparece na lista); detalhes do cliente novo ("Nenhum veículo cadastrado") e do cliente do seed (veículo de demonstração); edição com o e-mail só leitura e a mensagem de celular inválido; `VERSION_CONFLICT` com duas janelas (aviso no topo e a janela mostra o dado gravado pela outra) e o salvamento seguinte; exclusão com o texto da confirmação, o foco inicial em "Voltar", a falha e a repetição com sucesso: as duas janelas fecham, o cartão sai e o foco vai ao campo de busca;
  - **Teclado:** Tab até "Novo cliente", Enter abre com o foco em "E-mail", os cinco campos por Tab, "Mostrar senha" por Tab e Espaço, Enter em "Cadastrar cliente"; "Ver detalhes" por Enter, Espaço em "Editar dados" (o foco entra na janela), Esc devolve o foco a "Editar dados" e mantém os detalhes; Enter em "Excluir conta" com o foco em "Voltar", Esc devolve o foco a "Excluir conta", e a exclusão por Enter leva o foco ao campo de busca;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/clients` (navegação) e 1,0 nas 40 capturas de estado (10 estados nas quatro combinações: lista, busca sem resultado, falha da leitura, vazio, janela "Novo cliente", com os erros e com `EMAIL_IN_USE`, detalhes, edição e confirmação de exclusão);
  - **Desempenho (navegação, `next start` local):** celular LCP 3,6 s, CLS 0, TBT 50 ms, desempenho 0,9; computador LCP 0,7 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (as cinco operações, a tag `clients` e os esquemas `AdminClient`, `ClientPage`, `ClientInput` e `ClientUpdateInput`), `docs/clientes/clientes-do-painel.md`, `rotas.md`, `UC17-manter-cliente.md` e `dados.md`, e `docs/padroes/testes.md`.
- Lacunas resolvidas: L1 → opção 1 (texto próprio "Já existe uma conta com este e-mail.") → `rotas.md` e `clientes-do-painel.md`; L2 → opção 1 (foco no campo de busca) → `clientes-do-painel.md`; L3 → opção 1 (aviso na seção "Veículos", lista vazia para o cliente fora do seed) → `clientes-do-painel.md`; L4 → opção 1 (busca por palavras, sem diferenciar maiúsculas, com o acento) → `rotas.md` e `UC17-manter-cliente.md`; L5 → opção 1 (marcar, remover a conta e desfazer a marca se falhar) → `dados.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`/api/admin/clients`: `fields` do cadastro, o 409 `EMAIL_IN_USE` com o texto do painel e o 409 `VERSION_CONFLICT`) e a seção de dados (a ordem da exclusão); Análise do Sistema, UC17 passo 3 (a regra da busca) e UC16 FE02 (a mensagem do painel).

## Pendências

- **Do Yvan:** carregar o `supabase/seed-demo.sql` no SQL Editor, se ainda não carregou, para os 13 clientes de demonstração (sem migration nova); conferir logado, na pré-visualização, `/admin/clients` (lista, cadastro de um cliente, o primeiro login dele indo a `/set-password`, edição e exclusão) e o LCP do celular. A pré-visualização usa o banco de produção (decisão 0030): os clientes criados nela são dados reais e as contas ficam no Auth de produção.
- Veículos do cliente (lista real, cadastro, edição e consulta de placa), com o aviso de demonstração da seção "Veículos": #45.
