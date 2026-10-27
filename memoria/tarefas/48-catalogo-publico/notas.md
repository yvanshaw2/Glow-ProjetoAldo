# Notas: 48-catalogo-publico

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-27 – descoberta

Conferências do planejamento, sem alterar o código do projeto:

- **Origem.** Sessão iniciada pela sessão principal para conduzir a #48 do ciclo 01 ao 03. Worktree `36-regras-do-agendamento-05611e` (nome herdado), ramificação `claude/frosty-yonath-cad078`, em d49c04c, igual à `origin/main` depois do `git fetch` (PR #125, #47, presente).
- **Página inicial.** `/` já lê `GET /api/public/company` (#37 e #57) e não tem aviso de demonstração; só `/services` tem. A issue pede ligar `/` aos dados reais, o que já vale: o plano só confere.
- **Demonstração.** `src/lib/demo/catalog.ts` só é usado pelas duas entradas de `routes.ts`; `appointments.ts` o cita num comentário. Pode ser apagado com as entradas.
- **Rotas.** `rotas.md` não define a ordem dos serviços públicos nem o efeito de `categoryId` de categoria inexistente ou inativa (L1 e L2 do plano).
- **Plano.** Gravado em `aguardando_aprovacao`; nada construído.

## 2026-10-27 – decisão

Plano aprovado por yvan (27/10/2026, 14:08), gravado no arquivo, com a opção 1 em L1 e L2. Ramificação `feat/48-public-catalog` da `origin/main` (d49c04c). Commits: 1aa7d51 (testes do esquema em vermelho), 757e312 (rotas, repositório e serviço; testes verdes), 1248587 (demonstração, aviso, docs e OpenAPI) e 78a2f6a (ajuste abaixo).

## 2026-10-27 – desvio

`service-catalog.tsx` (fora do plano): os cartões reservados no carregamento passam de 3 para 12 (`CATALOG_PAGE_SIZE`), porque o Lighthouse no computador deu CLS 0,176 em `/services` com dados reais; depois, 0,000. O plano voltou a `aguardando_aprovacao`, e o Yvan confirma antes do PR.

## 2026-10-27 – descoberta

Verificação local, aprovada (banco local com `seed-demo.sql`, `next build` e `next start` na 3057, Chrome pelo `puppeteer-core`):

- **Rotas.** `/api/public/categories`: Higienização, Lavagem e Polimento e proteção (a "Película e envelopamento", inativa, fora). `/api/public/services`: 11 serviços, sem a "Lavagem a seco", a "Cristalização de vidros" nem a "Película nos vidros", por nome; filtro: Higienização 3, Lavagem 4, Polimento e proteção 4; `pageSize=2` → 2 de 3; `pageSize=99` → 50; `page=0` e `categoryId=abc` → 400 com o campo; UUID inexistente → 200 vazio (L1); `POST` → 405.
- **RN008 e RN031.** Categoria Lavagem desativada: 2 categorias e 7 serviços, e o filtro dela dá vazio; reativada, volta. Todos os serviços desativados: 0 e 0. Restaurado: 3 e 11.
- **Tela.** `/services` sem aviso de demonstração, com 11 cartões, filtro e "1–11 de 11"; Higienização → 3 e Todas → 11. 360 × 800 e 1440 × 900, claro e escuro, sem transbordo. A imagem de dois serviços passa por `/_next/image` (com `next.config.ts` temporário para `127.0.0.1` e `dangerouslyAllowLocalIP`, desfeito). Falha das rotas (requisição abortada): aviso com "Tentar novamente", que recarrega. Sem serviços: "Não há serviços disponíveis no momento.", com só "Todas" no filtro. Cliente autenticado: cabeçalho com Agendar, Meus agendamentos, Minha conta e Sair em `/` e `/services`. `/` tem destaque, "Sobre nós", "Onde estamos" e os atalhos (o endereço vem da API depois da hidratação e aparece no rodapé).
- **Lighthouse 13.5.0.** Acessibilidade 100 em `/` e `/services`, celular e computador, claro e escuro. Celular, modo padrão (simulado): LCP 3,0 s nas duas (desempenho 94 e 95); com o estrangulamento do DevTools, 1,9 s nas duas; CLS 0. Computador: LCP 0,7 s.
- **Registro.** `next-start.log`: nenhuma linha com cookie, senha ou autorização.
- **Auditoria.** `npm audit --omit=dev --audit-level=high` sem alta; 1 moderada em `fast-uri` (transitiva, já na `main`).
