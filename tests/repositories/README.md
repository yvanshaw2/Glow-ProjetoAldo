# `tests/repositories/` – Testes das funções puras dos repositórios

Um arquivo de teste para cada função pura de `src/server/repositories/` (`client-search.test.ts`): o filtro montado antes da consulta. Rápidos e sem banco.

## Vai aqui

- casos do filtro da busca: palavras, escape de curingas e dos caracteres do filtro, telefone

## Não vai aqui

- consulta ao banco, que é conferida no banco local (decisão 0052)
