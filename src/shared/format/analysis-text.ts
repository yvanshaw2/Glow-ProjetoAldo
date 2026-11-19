import type {
  DashboardAnalysis,
  DashboardComparedIndicator,
  DashboardComparisonValue,
  DashboardDetails,
} from "@/shared/api/dashboard";
import {
  DASHBOARD_INDICATOR_LABELS,
  type DashboardIndicator,
} from "@/shared/constants/dashboard-indicators";
import {
  DASHBOARD_SECTION_LABELS,
  type DashboardSection,
} from "@/shared/constants/dashboard-sections";
import { PAYMENT_METHOD_LABELS } from "@/shared/constants/payment-methods";
import { VEHICLE_SIZE_LABELS } from "@/shared/constants/vehicle-sizes";
import { VEHICLE_TYPE_LABELS } from "@/shared/constants/vehicle-types";
import { WEEKDAY_LABELS } from "@/shared/constants/weekdays";
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

const RECOMMENDATIONS_NOTE =
  "Sugestões geradas por IA: avalie antes de colocar em prática.";
// The busiest hours shown in the operation.
const BUSIEST_HOURS = 3;
const SEPARATOR = " · ";

// "1 vez" and "3 vezes": the word follows the number.
function count(amount: number, singular: string, plural: string): string {
  return `${amount} ${amount === 1 ? singular : plural}`;
}

// RF091: the numbers of the system in a section of the detailed analysis,
// one line each (RN040; docs/agendamento/dashboard-do-painel.md).
export function describeSectionNumbers(
  section: DashboardSection,
  details: DashboardDetails,
): string[] {
  if (section === "revenue") {
    return [
      `Agendamentos em aberto no período: ${details.open.count} (${formatCurrency(details.open.total)})`,
    ];
  }
  if (section === "services") {
    const { top, others } = details.services;
    const lines = top.map(
      ({ name, revenue, count: times }) =>
        `${name}: ${formatCurrency(revenue)} (${count(times, "vez", "vezes")})`,
    );
    if (others) {
      lines.push(
        `Demais: ${formatCurrency(others.revenue)} (${count(others.count, "vez", "vezes")})`,
      );
    }
    if (details.categories.length > 0) {
      lines.push(
        `Categorias: ${details.categories
          .map(({ name, revenue }) => `${name} ${formatCurrency(revenue)}`)
          .join(SEPARATOR)}`,
      );
    }
    lines.push(
      `Com complementos ou adicionais: ${formatPercent(details.extrasRate)} dos pagos`,
    );
    if (details.cancelledServices.length > 0) {
      lines.push(
        `Mais cancelados: ${details.cancelledServices
          .map(({ name, count: times }) => `${name} (${times})`)
          .join(SEPARATOR)}`,
      );
    }
    return lines;
  }
  if (section === "clients") {
    const { total, new: newClients, returning } = details.clients;
    const tickets = details.vehicleSizes.filter(
      ({ averageTicket }) => averageTicket > 0,
    );
    const lines = [
      `Clientes: ${total} (${count(newClients, "novo", "novos")} e ${count(returning, "recorrente", "recorrentes")})`,
      `Retornos de serviços concluídos: ${details.returns}`,
      `Tipos: ${details.vehicleTypes
        .map(
          ({ type, count: amount }) => `${VEHICLE_TYPE_LABELS[type]} ${amount}`,
        )
        .join(SEPARATOR)}`,
      `Portes: ${details.vehicleSizes
        .map(
          ({ size, count: amount }) => `${VEHICLE_SIZE_LABELS[size]} ${amount}`,
        )
        .join(SEPARATOR)}`,
    ];
    if (tickets.length > 0) {
      lines.push(
        `Ticket médio por porte: ${tickets
          .map(
            ({ size, averageTicket }) =>
              `${VEHICLE_SIZE_LABELS[size]} ${formatCurrency(averageTicket)}`,
          )
          .join(SEPARATOR)}`,
      );
    }
    return lines;
  }
  if (section === "operation") {
    const { averageDays, sameDay, upToThree, upToSeven, overSeven } =
      details.leadTime;
    const lines = details.weekdays
      .filter(({ appointments }) => appointments > 0)
      .map(
        ({ weekday, appointments, cancelled, revenue }) =>
          `${WEEKDAY_LABELS[weekday]}: ${count(appointments, "agendamento", "agendamentos")}, ${count(cancelled, "cancelado", "cancelados")}, ${formatCurrency(revenue)}`,
      );
    const busiest = details.hours
      .filter(({ count: amount }) => amount > 0)
      .sort(
        (first, second) =>
          second.count - first.count || first.hour - second.hour,
      )
      .slice(0, BUSIEST_HOURS);
    if (busiest.length > 0) {
      lines.push(
        `Horários mais procurados: ${busiest
          .map(({ hour, count: amount }) => `${hour}h (${amount})`)
          .join(SEPARATOR)}`,
      );
    }
    lines.push(
      `Canal: ${details.channel.client} pelo portal e ${details.channel.panel} pelo painel`,
      averageDays === null
        ? "Antecedência média: sem agendamentos no período"
        : `Antecedência média: ${variationFormat.format(averageDays)} ${averageDays === 1 ? "dia" : "dias"} (no mesmo dia: ${sameDay} · de 1 a 3 dias: ${upToThree} · de 4 a 7 dias: ${upToSeven} · mais de 7 dias: ${overSeven})`,
    );
    return lines;
  }
  return [
    ...details.payments
      .filter(({ count: amount }) => amount > 0)
      .map(
        ({ method, count: amount, revenue }) =>
          `${PAYMENT_METHOD_LABELS[method]}: ${count(amount, "pagamento", "pagamentos")}, ${formatCurrency(revenue)}`,
      ),
    `Acréscimos: ${formatCurrency(details.surcharges)} · Descontos: ${formatCurrency(details.discounts)}`,
  ];
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
  // RF091: the sections, each with its numbers, and the recommendations.
  if (analysis.sections && analysis.details) {
    for (const { section, observations } of analysis.sections) {
      lines.push("", DASHBOARD_SECTION_LABELS[section]);
      lines.push(...observations.map((observation) => `- ${observation}`));
      lines.push(
        `Números: ${describeSectionNumbers(section, analysis.details).join("; ")}`,
      );
    }
  }
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    lines.push("", "Sugestões");
    lines.push(...analysis.recommendations.map((item) => `- ${item}`));
    lines.push(RECOMMENDATIONS_NOTE);
  }
  lines.push("", describeGeneration(analysis.generatedAt));
  return lines.join("\n");
}
