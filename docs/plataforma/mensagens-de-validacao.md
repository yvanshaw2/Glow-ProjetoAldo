---
titulo: Mensagens de validação
assunto: plataforma
origem: issue #21, memoria/tarefas/21-formatos-e-erros/01_plano.md (L11)
relacionados: [RN035, RNF003, RN006, RN007]
---

# Mensagens de validação

Mensagens exibidas junto ao campo quando a entrada não segue RN035 ([RN035-formatos-dos-dados.md](RN035-formatos-dos-dados.md)); vêm de `src/shared/validation/formats.ts`, exceto a da nova senha igual à atual e a da confirmação de senha, que vêm de `auth.ts`, na mesma pasta. Na API, cada uma vai em `fields` do erro `VALIDATION_ERROR` ([../padroes/api.md](../padroes/api.md)).

| Dado | Mensagem |
|---|---|
| Campo obrigatório ausente ou vazio | Preencha este campo. |
| Nome e sobrenome | Use de 2 a 60 letras; espaço, hífen e apóstrofo também valem. |
| E-mail | Informe um e-mail válido, como maria@email.com. |
| Celular e WhatsApp | Informe um celular com DDD, como (82) 99999-8888. |
| Telefone da empresa | Informe um telefone com DDD, como (82) 3333-4444. |
| Senha | A senha deve ter de 8 a 72 caracteres, com letra maiúscula, número e caractere especial. |
| Nova senha igual à atual | A nova senha precisa ser diferente da atual. |
| Confirmação de senha diferente da senha | As senhas não conferem. |
| Placa | Informe uma placa válida. |
| Data de calendário fora do formato aaaa-mm-dd ou inexistente | Informe uma data válida. |
| Data final anterior à inicial | A data final não pode ser anterior à inicial. |
| Período do dashboard de mais de 12 meses | O período não pode passar de 12 meses. |
| Tipo do veículo ausente ou fora da lista | Escolha o tipo do veículo. |
| Marca e modelo | Use de 1 a 40 caracteres. |
| Cor | Use de 3 a 30 letras. |
| Ano | Informe um ano de 1886 a <ano seguinte ao corrente>. |
| Valor em reais | Informe um valor maior que zero e de até R$ 99.999,99. |
| Percentual (a rota das formas de pagamento o recebe com sinal, de −100 a 100; a mesma mensagem vale) | Informe um percentual de 0 a 100, com até duas casas decimais. |
| Duração | Informe a duração em minutos, de 5 a 2.400. |
| CNPJ | Informe um CNPJ válido. |
| Instagram | Informe o endereço do perfil no Instagram, começando por https://. |
| Facebook | Informe o endereço da página no Facebook, começando por https://. |
| Nomes de serviço, categoria e cargo; descrição do cargo ocupado | Use de 2 a 60 caracteres. |
| Categoria de serviço inexistente ou inativa | Escolha uma categoria ativa. |
| Serviço vinculado inexistente, excluído ou do tipo errado | Escolha serviços cadastrados. |
| Caminho da imagem do serviço que não foi gerado pelo envio | Informe uma imagem válida. |
| Imagem do serviço de outro tipo ou acima de 2 MB (tela e rota de envio) | Use uma imagem JPEG, PNG ou WebP de até 2 MB. |
| Cargo do funcionário ausente | Escolha o cargo do sistema. |
| Cargo do funcionário inexistente ou inativo | Escolha um cargo ativo. |
| Horário | Escolha um horário em hora cheia ou meia hora. |
| Encerramento igual ou anterior à abertura | O encerramento deve ser depois da abertura. |
| Início da pausa antes da abertura | A pausa deve começar a partir da abertura. |
| Fim da pausa depois do encerramento | A pausa deve terminar até o encerramento. |
| Fim da pausa igual ou anterior ao início | O fim da pausa deve ser depois do início. |
| Dias da semana incompletos ou repetidos (erro da lista, sem campo) | Informe os sete dias da semana, sem repetir. |
| Formas de pagamento incompletas ou repetidas (erro da lista, sem campo) | Informe as quatro formas de pagamento, sem repetir. |
| Cargo sem nenhuma permissão | O cargo deve conceder ao menos uma permissão. |
| Permissão que não é uma página do painel | Escolha apenas páginas do painel. |
| Nome da empresa, endereço, descrições e termo de busca | Use até <limite> caracteres. |
| Versão do registro (`updatedAt`) ausente ou fora do formato | Atualize a página e tente novamente. |
| `page` e `pageSize` | Informe um número inteiro a partir de 1. |
| Visão de agendamentos ausente ou desconhecida | Escolha uma visão válida. |
| Status fora da visão de agendamentos | Escolha um status desta visão. |
| Ordenação de agendamentos desconhecida | Escolha uma ordenação válida. |
| Busca de cliente no novo agendamento ausente ou vazia | Digite o nome ou o e-mail para buscar o cliente. |
| Cliente do agendamento ausente ou fora do formato | Escolha o cliente. |
| Veículo do agendamento ausente ou fora do formato | Escolha o veículo. |
| Veículo que não é do cliente | Escolha um veículo deste cliente. |
| Serviços do agendamento ausentes, repetidos ou mais de 20 | Escolha de 1 a 20 serviços, sem repetir. |
| Serviço que não é um identificador | Escolha serviços cadastrados. |
| Pedido sem serviço principal ou complementar | Escolha ao menos um serviço principal ou complementar. |
| Adicional sem o principal a que está ligado | Escolha o serviço principal a que o adicional está ligado. |
| Serviço inativo, excluído ou de categoria inativa | Escolha serviços disponíveis para agendamento. |
| Forma de pagamento ausente ou desconhecida | Escolha a forma de pagamento. |
| Data e horário ausentes ou sem fuso | Escolha a data e o horário. |
| Dia fechado | A empresa não atende neste dia. |
| Horário fora do funcionamento | Escolha um horário dentro do funcionamento da empresa. |
| Horário na pausa | Escolha um horário fora da pausa. |
| Data e horário que já passaram | Escolha uma data e um horário que ainda não passaram. |
| Identificador do agendamento (`appointmentId`) fora do formato | Informe um agendamento válido. |
| Filtro de verdadeiro ou falso (`includeInactive`) | Informe true ou false. |

## Onde se aplica

- Regras: [RN035](RN035-formatos-dos-dados.md)
- Requisitos: RNF003 ([requisitos.md](requisitos.md))
