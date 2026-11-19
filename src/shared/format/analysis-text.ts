import type {
  DashboardAnalysis,
  DashboardComparedIndicator,
  DashboardComparisonValue,
} from "@/shared/api/dashboard";
import {
  DASHBOARD_INDICATOR_LABELS,
  type DashboardIndicator,
} from "@/shared/constants/dashboard-indicators";
import { formatCurrency } from "@/shared/format/currency";
import { formatDate, formatDateTime } from "@/shared/format/date";
import { formatPercent } from "@/shared/format/percent";

// The analysis of the period as the screen shows it and as it is copied
// (RF092, RF093; docs/agendamento/dashboard-do-painel.md). Every number comes
// from the system, formatted as in RN035; the text of the model goes as it
// came, as text (RS020).

const LOCALE = "pt-BR";
// The variation has one place (docs/agendamento/calculos.md, section 6).
const variationFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
// Below 2, the unit is singular: 1,5 ponto percentual.
const PLURAL_FROM = 2;

const AI_NOTE =
  "Pode conter imprecisões: os números oficiais são os dos indicadores.";
const NO_COMPARISON =
  "O período anterior não tem agendamentos: a análise não compara os períodos.";

const COMPARED_INDICATORS: readonly DashboardIndicator[] = [
  "revenue",
  "appointmentCount",
  "averageTicket",
  "cancellationRate",
];

export function isComparedIndicator(
  indicator: DashboardIndicator,
): indicator is DashboardComparedIndicator {
  return COMPARED_INDICATORS.includes(indicator);
}

// The value of an indicator as its card shows it.
export function formatIndicatorValue(
  indicator: DashboardComparedIndicator,
  value: number,
): string {
  if (indicator === "appointmentCount") return String(value);
  if (indicator === "cancellationRate") return formatPercent(value);
  return formatCurrency(value);
}

// "alta de 25,0%", "queda de 12,5%" or "estável"; the cancellation rate
// varies in percentage points. Null without a previous value.
export function describeVariation(
  indicator: DashboardComparedIndicator,
  variation: number | null,
): string | null {
  if (variation === null) return null;
  if (variation === 0) return "estável";
  const size = Math.abs(variation);
  const amount = variationFormat.format(size);
  const direction = variation > 0 ? "alta" : "queda";
  if (indicator !== "cancellationRate") return `${direction} de ${amount}%`;
  const unit = size < PLURAL_FROM ? "ponto percentual" : "pontos percentuais";
  return `${direction} de ${amount} ${unit}`;
}

// "R$ 12.500,00, alta de 25,0% em relação ao período anterior", or only the
// value without a comparison.
export function describeComparedValue(
  indicator: DashboardComparedIndicator,
  { current, variation }: DashboardComparisonValue,
): string {
  const value = formatIndicatorValue(indicator, current);
  const change = describeVariation(indicator, variation);
  return change ? `${value}, ${change} em relação ao período anterior` : value;
}

// The line under the title: the previous period, or up to which day a period
// in progress was analyzed (RN038), or that there is no comparison.
export function describeAnalyzedPeriods(analysis: DashboardAnalysis): string {
  const previous = `${formatDate(analysis.previousFrom)} a ${formatDate(analysis.previousTo)}`;
  const isPartial = analysis.analyzedTo !== analysis.to;
  if (!analysis.hasComparison) {
    return isPartial
      ? `Analisado até ${formatDate(analysis.analyzedTo)}. ${NO_COMPARISON}`
      : NO_COMPARISON;
  }
  return isPartial
    ? `Analisado até ${formatDate(analysis.analyzedTo)}, comparado com ${previous}`
    : `Comparado com ${previous}`;
}

// "Gerado por inteligência artificial em 18/11/2026 às 14:32. Pode conter
// imprecisões: ..." (RF090), in the company's time zone (decision 0053).
export function describeGeneration(generatedAt: string): string {
  return `Gerado por inteligência artificial em ${formatDateTime(generatedAt)}. ${AI_NOTE}`;
}

// RF093: the plain text copied, in the order of the screen.
export function buildAnalysisText(analysis: DashboardAnalysis): string {
  const lines = [
    `Análise do período – ${formatDate(analysis.from)} a ${formatDate(analysis.to)}`,
    describeAnalyzedPeriods(analysis),
    "",
    analysis.summary,
  ];
  if (analysis.highlights.length > 0) {
    lines.push("", "Observações");
    for (const { indicator, comment } of analysis.highlights) {
      const label = DASHBOARD_INDICATOR_LABELS[indicator];
      if (!isComparedIndicator(indicator)) {
        lines.push(`- ${label}: ${comment}`);
        continue;
      }
      const { current, variation } = analysis.comparison[indicator];
      const change = describeVariation(indicator, variation);
      const value = formatIndicatorValue(indicator, current);
      lines.push(
        `- ${label} (${change ? `${value}; ${change}` : value}): ${comment}`,
      );
    }
  }
  lines.push("", describeGeneration(analysis.generatedAt));
  return lines.join("\n");
}
