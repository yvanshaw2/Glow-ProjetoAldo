"use client";

import dynamic from "next/dynamic";
import { useId } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardAnalysis,
  DashboardComparedIndicator,
} from "@/shared/api/dashboard";
import { DASHBOARD_INDICATOR_LABELS } from "@/shared/constants/dashboard-indicators";
import {
  describeVariation,
  formatIndicatorValue,
} from "@/shared/format/analysis-text";
import { formatCurrency } from "@/shared/format/currency";
import { formatDate } from "@/shared/format/date";

// RF092: the numbers of the system next to the analysis: the four indicators
// of the period and of the previous one, and the revenue of both in a chart
// (docs/agendamento/dashboard-do-painel.md). The drawing needs Recharts and is
// loaded on demand, as the other charts (decision 0056).

const RevenueComparisonChart = dynamic(
  () =>
    import("@/components/admin/dashboard/dashboard-charts").then(
      (charts) => charts.RevenueComparisonChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="size-full rounded-xl" />,
  },
);

const COMPARED: DashboardComparedIndicator[] = [
  "revenue",
  "appointmentCount",
  "averageTicket",
  "cancellationRate",
];
const MISSING = "—";

export function AnalysisComparison({
  analysis,
}: {
  analysis: DashboardAnalysis;
}) {
  const tableTitleId = useId();
  const chartTitleId = useId();
  const current = `${formatDate(analysis.from)} a ${formatDate(analysis.analyzedTo)}`;
  const previous = `${formatDate(analysis.previousFrom)} a ${formatDate(analysis.previousTo)}`;
  const { hasComparison, revenueSeries } = analysis;
  const unit = revenueSeries.unit === "week" ? "Semana" : "Dia";
  const hasRevenue = revenueSeries.points.some(
    ({ currentRevenue, previousRevenue }) =>
      currentRevenue > 0 || (previousRevenue ?? 0) > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={tableTitleId} className="flex flex-col gap-2">
        <h3 id={tableTitleId} className="font-semibold">
          {hasComparison ? "Este período × período anterior" : "Este período"}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Indicador
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Este período ({current})
                </th>
                {hasComparison && (
                  <>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Período anterior ({previous})
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Variação
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {COMPARED.map((indicator) => {
                const value = analysis.comparison[indicator];
                return (
                  <tr key={indicator} className="border-t border-border">
                    <th scope="row" className="py-2 pr-4 font-medium">
                      {DASHBOARD_INDICATOR_LABELS[indicator]}
                    </th>
                    <td className="py-2 pr-4">
                      {formatIndicatorValue(indicator, value.current)}
                    </td>
                    {hasComparison && (
                      <>
                        <td className="py-2 pr-4">
                          {value.previous === null
                            ? MISSING
                            : formatIndicatorValue(indicator, value.previous)}
                        </td>
                        <td className="py-2">
                          {describeVariation(indicator, value.variation) ??
                            MISSING}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby={chartTitleId} className="flex flex-col gap-2">
        <h3 id={chartTitleId} className="font-semibold">
          {hasComparison
            ? "Receita: este período e o anterior"
            : "Receita do período"}
        </h3>
        {hasRevenue ? (
          <>
            <p aria-hidden className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-6 bg-link" />
                Este período
              </span>
              {hasComparison && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block w-6 border-t-2 border-dashed border-muted-foreground" />
                  Período anterior
                </span>
              )}
            </p>
            <div aria-hidden className="h-56 md:h-64">
              <RevenueComparisonChart series={revenueSeries} />
            </div>
            <table className="sr-only">
              <caption>Receita por {unit.toLowerCase()}</caption>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Este período</th>
                  {hasComparison && <th scope="col">Período anterior</th>}
                </tr>
              </thead>
              <tbody>
                {revenueSeries.points.map((point, index) => (
                  <tr key={point.currentStart}>
                    <th scope="row">{`${unit} ${index + 1}`}</th>
                    <td>
                      {`${formatCurrency(point.currentRevenue)} (${formatDate(point.currentStart)})`}
                    </td>
                    {hasComparison && (
                      <td>
                        {point.previousStart === null ||
                        point.previousRevenue === null
                          ? MISSING
                          : `${formatCurrency(point.previousRevenue)} (${formatDate(point.previousStart)})`}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma receita no período.
          </p>
        )}
      </section>
    </div>
  );
}
