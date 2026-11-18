---
id: 0057
titulo: Análise do dashboard exportada pela impressão do navegador e copiada como texto simples, sem biblioteca de PDF
status: aceita
data: 2026-11-18
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L8 e Decisões técnicas)
relacionados: [RF093, RF094, UC27, RN039, 0054, 0056]
---

# 0057 – Análise do dashboard exportada pela impressão do navegador e copiada como texto simples, sem biblioteca de PDF

## Decisão

A análise do período é exportada pela impressão do navegador (`window.print()`), que também salva em PDF, com um estilo de impressão que esconde a navegação, os controles e a agenda do dia e usa as cores do tema claro. A cópia leva à área de transferência um texto simples, montado por uma função pura, com o período, os valores do sistema e a nota de geração por IA. Nenhuma biblioteca de PDF é usada. Detalhes em `docs/agendamento/dashboard-do-painel.md`.

## Alternativa descartada

- `jsPDF` ou `@react-pdf/renderer`: dependência nova, e os gráficos teriam de ser redesenhados para o PDF.
- PDF gerado no servidor, com um navegador sem interface: pesado para a função da Vercel no plano gratuito.
- Arquivo `.txt` para baixar, além da cópia: o mesmo conteúdo do texto copiado.

## Justificativa

Sem dependência nova: o PDF sai do que a tela já mostra, com os gráficos do Recharts, que são SVG (decisão 0056), e o mesmo estilo de impressão serve a qualquer relatório futuro do painel. O texto simples cola em qualquer lugar, sem formatação que se perca. Consequência aceita: o leiaute do PDF depende do navegador e das opções de impressão de quem imprime.
