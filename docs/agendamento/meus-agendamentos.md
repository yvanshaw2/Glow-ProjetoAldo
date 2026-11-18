---
titulo: Conteúdo da página de agendamentos do cliente
assunto: agendamento
origem: issue #58, plano memoria/tarefas/58-telas-do-cliente/01_plano.md (L3, L4); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L11, L14)
relacionados: [UC07, UC25, UC26, RF028, RF029, RF030, RF031, RF032, RN017, RN019, RN020, RN032, UC28, RF095, RF097, RN041, RN043]
---

# Conteúdo da página de agendamentos do cliente

Abas, cartão, detalhe, ações e textos de `/appointments`, do [UC07](UC07-acompanhar-agendamentos.md). Cabeçalho: [../padroes/layouts.md](../padroes/layouts.md); estilo: [../padroes/design.md](../padroes/design.md); listagem, janelas e etiqueta de status: [../padroes/componentes.md](../padroes/componentes.md).

## Página

- Título: "Meus agendamentos".
- Abas "Atuais" (Agendado, Em espera, Em execução e Finalizado) e "Histórico" (Concluído, Cancelado e Reagendado), em ordem de data ([rotas.md](rotas.md)). Cada aba lê a lista de novo ao ser escolhida, então um cancelamento aparece no histórico.
- Uma lista paginada por aba, sem grupos; uma coluna, duas a partir de 1024 px.
- Enquanto a lista carrega, o lugar dos cartões fica reservado; na falha, o aviso com a mensagem e "Tentar novamente".

## Cartão

A etiqueta de status ([RN017](RN017-sequencia-de-status.md)), "<marca> <modelo>", "Placa <placa> · <cor>", "Data: <data e hora>", "Previsão de conclusão: <data e hora>", "Serviços: <nomes>", "Total: <valor>" e o botão "Ver detalhes".

## Nenhum agendamento (UC07 FE01)

- Em "Atuais": "Nenhum agendamento atual" e "Os seus próximos agendamentos aparecem aqui.".
- Em "Histórico": "Nenhum agendamento no histórico" e "Os agendamentos concluídos, cancelados e reagendados aparecem aqui.".

## Detalhe

- Janela "Detalhes do agendamento", que lê o agendamento ao abrir: a etiqueta; "Data e horário", "Previsão de conclusão" e "Duração estimada"; "Veículo" (marca e modelo, placa, cor, ano, tipo e porte); "Serviços", com o valor de cada um; "Forma de pagamento"; "Subtotal" e "Acréscimo de <percentual>" ou "Desconto de <percentual>", só quando a forma de pagamento tem percentual; "Total".
- No "Cancelado", "Motivo: <motivo>" ([RN041](RN041-motivo-do-cancelamento.md)), ou "Motivo: Não informado" nos cancelamentos anteriores à regra.
- No "Concluído" e no "Reagendado", a avaliação ([UC28](UC28-avaliar-atendimento.md), [RN043](RN043-avaliacao-do-atendimento.md)): com nota, "Sua avaliação: <nota> de 5"; sem nota e no prazo, "Como foi o atendimento?", cinco botões de 1 a 5 em grupo de opção única (as estrelas são decorativas, e o número está sempre escrito: "1 de 5"…) e "Enviar avaliação" ("Enviando…"); fora do prazo e sem nota, nada. Enviada, a nota aparece no lugar das opções, e a região de status anuncia "Avaliação enviada."; a falha, como o 409 `REVIEW_NOT_ALLOWED`, aparece junto ao grupo.
- Enquanto carrega, o lugar fica reservado; na falha, o aviso com "Tentar novamente".

## Ações por status

Só no detalhe. A tela só orienta; quem decide é a API (RS008).

- "Agendado": "Editar" ([UC26](UC26-editar-agendamento.md), [RN032](RN032-quem-edita-o-agendamento.md)) e "Cancelar agendamento" ([RN019](RN019-cancelamento.md)).
- "Concluído": "Reagendar" ([UC25](UC25-reagendar-servico-concluido.md), [RN020](RN020-reagendamento.md)).
- "Em espera", "Em execução" e "Finalizado": nenhuma ação, e a frase "Este agendamento não pode mais ser alterado por aqui. Para mudar algo, fale com a empresa." (UC26 FE01).
- "Cancelado" e "Reagendado": nenhuma.

"Editar" e "Reagendar" abrem, sobre o detalhe, a janela do [assistente de agendamento](agendar-servico.md). Esc ou "Cancelar" fecham só o assistente e devolvem o foco ao detalhe. Concluída a edição ou o reagendamento, as duas janelas fecham e a lista é lida de novo. Na falha, as janelas permanecem abertas e a mensagem aparece no formulário.

## Cancelamento (UC07 FA01)

- Confirmação: título "Cancelar este agendamento?", texto "O agendamento passa a Cancelado e vai para o histórico. Esta ação não pode ser desfeita.", o campo "Motivo do cancelamento" (lista, obrigatório, [RN041](RN041-motivo-do-cancelamento.md)), com "Escolha o motivo" até a escolha e as opções Desistência, Imprevisto, Condições do tempo e Outro, e os botões "Voltar" e "Cancelar agendamento" ("Cancelando…"), na cor de erro. Sem motivo, o envio mostra "Escolha um motivo da lista." junto ao campo.
- Confirmado, as duas janelas fecham e a lista é lida de novo. A falha, como o 409 `INVALID_STATUS` de um agendamento que já mudou de status (FE02), aparece dentro da confirmação.

## Fora da tela

Sem requisito: os grupos "Em andamento" e "Próximos", o "Cancelar" no próprio cartão, o "Agendar" no topo (o cabeçalho já tem) e o "Box".
