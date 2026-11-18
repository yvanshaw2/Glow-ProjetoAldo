---
id: UC28
titulo: Avaliar atendimento
assunto: agendamento
ator: Cliente
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L14)
requisitos: [RF097]
regras: [RN043]
---

# UC28 – Avaliar atendimento

**Ator principal:** Cliente. **Ator secundário:** Não se aplica.

## Pré-condições

- O cliente está autenticado no portal.
- O atendimento é do cliente, tem o status "Concluído" ou "Reagendado", não foi avaliado e foi concluído há no máximo 30 dias (RN043).

## Pós-condições

- A nota do atendimento fica gravada e aparece no detalhe do agendamento, no portal e no painel.

## Fluxo principal

1. O cliente abre o detalhe do atendimento no histórico (UC07).
2. O sistema exibe "Como foi o atendimento?", com as notas de 1 a 5.
3. O cliente escolhe a nota e envia.
4. O sistema grava a nota e a exibe no detalhe (RS009).

## Fluxos alternativos

Não há.

## Fluxos de exceção

### FE01 – Avaliação indisponível (passo 3)

1. O atendimento já foi avaliado ou o prazo de 30 dias terminou; o sistema informa que ele não pode mais ser avaliado e não grava a nota.

## Relacionados

- Requisitos: [RF097](requisitos.md)
- Regras: [RN043](RN043-avaliacao-do-atendimento.md)
- Segurança: [RS009](../plataforma/seguranca.md)
- Outros casos de uso: [UC07](UC07-acompanhar-agendamentos.md)
- Telas e API: [rotas.md](rotas.md)
