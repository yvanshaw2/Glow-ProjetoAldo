---
titulo: Conteúdo da página de funcionários e cargos do painel
assunto: equipe
origem: issue #65, plano memoria/tarefas/65-equipe-e-configuracoes/01_plano.md (L1, L2, L3)
relacionados: [UC19, UC20, UC21, RF077, RF078, RF079, RF080, RF081, RF082, RF083, RF084, RN023, RN024, RN025, RN026, RN027, RNF002, RNF008, RNF011]
---

# Conteúdo da página de funcionários e cargos do painel

Abas, listas, cartões, janelas, confirmações e estados de `/admin/staff`, do [UC19](UC19-cadastrar-funcionario.md), do [UC20](UC20-manter-funcionarios.md) e do [UC21](UC21-gerenciar-cargos-e-permissoes.md). Cabeçalho e navegação: [../padroes/layouts.md](../padroes/layouts.md); estilo: [../padroes/design.md](../padroes/design.md); listagem, diálogos, formulário em etapas, campo de senha e telas de demonstração: [../padroes/componentes.md](../padroes/componentes.md); contrato das rotas: [rotas.md](rotas.md).

As rotas `/api/admin/staff` e `/api/admin/roles` são reais, e a página não tem aviso de demonstração.

## Página

- Título "Funcionários"; abaixo, as abas "Funcionários" e "Cargos" ([RF077](requisitos.md)) e, ao lado delas a partir de 768 px e abaixo no celular, o botão da aba: "Novo funcionário" ou "Novo cargo". A aba escolhida fica na página, sem mudar o endereço, e começa em "Funcionários". Cada aba lê a sua lista quando é aberta, com o interruptor "Exibir inativos" desligado ([RF078](requisitos.md)).
- O acesso à página é da permissão `staff` ([RN025](RN025-permissoes.md)). Não há busca: [RF077](requisitos.md) e [RF078](requisitos.md) só pedem a alternância e os inativos.

## Lista de funcionários (UC20 passos 1 e 2, FA01)

- Interruptor "Exibir inativos"; ordem alfabética pelo nome completo; a conta de administrador nunca aparece ([RN027](RN027-administrador.md), [RF084](requisitos.md)); 20 por página, com a faixa "1–5 de 5" ([RNF008](../plataforma/requisitos.md)).
- O cartão tem o nome completo, a etiqueta "Ativo" ou "Inativo", o e-mail, a descrição do cargo (`job_title`, se houver), o nome do cargo do sistema e os botões "Editar" e "Desativar" ou "Reativar", com o nome do funcionário para o leitor de tela. Uma coluna no celular e duas a partir de 1280 px.
- Estados: carregamento, esqueleto; vazio, "Nenhum funcionário cadastrado" e "Cadastre um funcionário para ele aparecer aqui."; falha, o aviso com "Tentar novamente".

## Lista de cargos (UC21 passos 1 e 2, FA03)

- Mesmo interruptor e mesma paginação; ordem alfabética pelo nome.
- O cartão tem o nome, a etiqueta "Ativo" ou "Inativo", a descrição (se houver), "N permissões", as permissões em etiquetas com o nome da página de [RN025](RN025-permissoes.md) e os botões "Editar" e "Desativar" ou "Reativar".
- Vazio: "Nenhum cargo cadastrado" e "Os cargos dos funcionários aparecem aqui.".

## Novo funcionário (UC19, RF079, RN023, RN024)

- Janela "Novo funcionário", ancorada embaixo no celular, com a indicação das etapas "Informações" e "Cargo".
- Etapa 1: "Nome", "Sobrenome", "E-mail", "Senha inicial" (descrição "De 8 a 72 caracteres, com letra maiúscula, número e caractere especial. O funcionário troca a senha no primeiro acesso.", com o botão de mostrar) e "Cargo na empresa (opcional)" (descrição "Texto livre, como Recepcionista. Não altera as permissões."). Botões "Cancelar" e "Próximo".
- Etapa 2: "Escolha o cargo do sistema." com os cargos ativos em botões de opção (nome, descrição e "N permissões"), "Voltar" e "Cadastrar funcionário" ("Cadastrando…"). Sem cargo ativo, o aviso "Não há cargo ativo. Cadastre um cargo antes de cadastrar funcionários." com o botão que leva à aba "Cargos" (pré-condição do UC19).
- A falha aparece no topo da janela; um erro do e-mail leva à etapa 1 (UC19 FE02). `EMAIL_IN_USE` usa "Já existe uma conta com este e-mail." no topo da janela, e a janela volta à etapa 1 com os dados mantidos e o foco no aviso.

## Editar funcionário (UC20 passos 3 a 6, RF080)

- Janela "Editar funcionário" com as mesmas duas etapas, sem a senha: "Nome", "Sobrenome", "Cargo na empresa (opcional)" e o "E-mail" só para leitura (descrição "O e-mail de acesso não pode ser alterado."). Na etapa 2, o cargo atual vem marcado, mesmo inativo, com a etiqueta "Inativo", e os demais são os ativos.
- Botões "Cancelar", "Próximo", "Voltar" e "Salvar alterações" ("Salvando…"). No 409 `VERSION_CONFLICT`, o aviso fica no topo e os dados são lidos de novo ([RNF011](../plataforma/requisitos.md)).

## Desativar e reativar funcionário (UC20 FA02, RF081, RN026)

- Confirmação "Desativar este funcionário?", "O funcionário perde o acesso ao painel administrativo. Você pode reativá-lo depois.", botões "Voltar" e "Desativar" ("Desativando…").
- Reativar: "Reativar este funcionário?", "O funcionário volta a acessar o painel com o cargo atual.", "Voltar" e "Reativar" ("Reativando…").
- A falha aparece dentro da confirmação; com sucesso, a lista é lida de novo. Com o interruptor "Exibir inativos" desligado, o cartão desativado sai da lista e o foco vai ao interruptor.

## Novo cargo (UC21, RF082, RN025)

- Janela "Novo cargo" com a indicação "Identificação" e "Permissões".
- Etapa 1: "Nome" e "Descrição (opcional)"; "Cancelar" e "Próximo"; nome vazio é indicado e não avança (FE01).
- Etapa 2: "Escolha as páginas que o cargo pode acessar." com as seis permissões na ordem de [RN025](RN025-permissoes.md), cada uma em caixa de seleção com o nome da página e a explicação "Consultar, criar, editar e excluir em <página>."; "Voltar" e "Cadastrar cargo" ("Cadastrando…"). Sem nenhuma marcada, o envio indica "O cargo deve conceder ao menos uma permissão." (FE03), a mesma mensagem da rota.
- `NAME_IN_USE` (FE02) aparece no topo e junto ao campo "Nome", e leva à etapa 1.

## Editar cargo (UC21 FA01, RF083)

- Janela "Editar cargo" com as mesmas etapas e os dados atuais; o aviso "As alterações valem para todos os funcionários deste cargo." no topo da etapa 2. "Salvar alterações" ("Salvando…"); `VERSION_CONFLICT` e `NAME_IN_USE` como acima.

## Desativar e reativar cargo (UC21 FA02, RN026)

- "Desativar este cargo?", "O cargo deixa de poder ser atribuído a funcionários. Os funcionários que o têm ficam sem acesso às páginas do painel até receberem outro cargo ou até você reativá-lo.", "Voltar" e "Desativar"; reativar: "Reativar este cargo?", "O cargo volta a poder ser atribuído a funcionários, e os que o têm voltam a acessar as páginas dele.".
- A desativação, a reativação e a mudança das permissões valem na requisição seguinte dos funcionários do cargo (RS011, [RN026](RN026-desativacao.md)). Com o interruptor "Exibir inativos" desligado, o cartão desativado sai da lista e o foco vai ao interruptor.

## Dados de demonstração

Os cargos (Gerente, Atendente, Detalhista e o inativo Auxiliar) e os funcionários de demonstração vêm do banco, do `seed-demo.sql`. Os funcionários são fictícios e ficam em contas do Auth sem senha: aparecem no painel e ninguém entra com eles. Um deles está inativo, para mostrar "Exibir inativos".
