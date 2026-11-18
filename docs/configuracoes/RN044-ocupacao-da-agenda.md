---
id: RN044
titulo: Ocupação da agenda
assunto: configuracoes
tema: Disponibilidade
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L15)
relacionados: [RF098, UC23, RN013, RN014, RN016, RN040, 0014]
---

# RN044 – Ocupação da agenda

A ocupação da agenda de um período é a soma da duração estimada dos agendamentos com a data marcada no período, exceto os cancelados, sobre os minutos disponíveis: para cada dia do período, os minutos de funcionamento do dia da semana na disponibilidade atual, sem a pausa (RN013), vezes o número de atendimentos simultâneos configurado, de 1 a 20. É informativa: não limita agendamentos (RN016) e pode passar de 100%. O percentual tem duas casas; sem minutos disponíveis, não é calculada. Como a disponibilidade não guarda histórico, um período passado é medido pela disponibilidade atual.

## Onde se aplica

- Requisitos: [RF098](requisitos.md)
- Casos de uso: [UC23](UC23-configurar-disponibilidade.md)
- Regras: [RN013](../agendamento/RN013-disponibilidade.md), [RN016](../agendamento/RN016-sem-controle-de-capacidade.md), [RN040](../agendamento/RN040-indicadores-da-analise-detalhada.md)
