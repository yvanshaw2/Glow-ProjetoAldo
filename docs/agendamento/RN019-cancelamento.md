---
id: RN019
titulo: Cancelamento
assunto: agendamento
tema: Status
origem: Documentação de Análise do Sistema, seção 9.1 (Quadro 20); issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L11)
relacionados: [RF030, RF054, RF095, UC07, UC12, RN041]
---

# RN019 – Cancelamento

O agendamento pode ser cancelado enquanto não estiver em execução: pelo cliente, quando estiver “Agendado”; pelo funcionário, quando estiver “Agendado” ou “Em espera”. O cancelamento registra o motivo (RN041).

## Onde se aplica

- Requisitos: [RF030](requisitos.md), [RF054](requisitos.md), [RF095](requisitos.md)
- Regras: [RN041](RN041-motivo-do-cancelamento.md)
- Casos de uso: [UC07](UC07-acompanhar-agendamentos.md), [UC12](UC12-atualizar-status-do-agendamento.md)
