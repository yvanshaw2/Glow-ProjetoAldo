"use client";

import {
  CopyIcon,
  LoaderCircleIcon,
  MinusIcon,
  PrinterIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AnalysisComparison } from "@/components/admin/dashboard/analysis-comparison";
import { AnalysisSections } from "@/components/admin/dashboard/analysis-sections";
import type { Period } from "@/components/admin/dashboard/dashboard-period";
import { ChoiceGroup, type Choice } from "@/components/shared/choice-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, toApiError } from "@/lib/api-client";
import type {
  DashboardAnalysis,
  DashboardAnalysisDetail,
  DashboardAnalysisHighlight,
} from "@/shared/api/dashboard";
import { DASHBOARD_INDICATOR_LABELS } from "@/shared/constants/dashboard-indicators";
import {
  buildAnalysisText,
  describeAnalyzedPeriods,
  describeComparedValue,
  describeGeneration,
  isComparedIndicator,
} from "@/shared/format/analysis-text";

const ANALYSIS_PATH = "/api/admin/dashboard/analysis";

// RF091: the summary or the detailed analysis, the summary chosen first.
const DETAIL_CHOICES: readonly Choice<DashboardAnalysisDetail>[] = [
  {
    value: "summary",
    label: "Resumida",
    description: "Um resumo e até quatro observações sobre os indicadores.",
  },
  {
    value: "detailed",
    label: "Detalhada",
    description:
      "Também serviços, clientes, operação e pagamentos, com sugestões.",
  },
];
// Places held for the text while the analysis is made, as three lines.
const LOADING_LINES = 3;

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; analysis: DashboardAnalysis }
  | { status: "failed"; message: string };

type DashboardAnalysisCardProps = {
  // The period on the screen, which the analysis is about (UC27).
  period: Period;
  // False in a period with no appointments, which is not analysed (UC27 FE01).
  hasAppointments: boolean;
};

// UC27, RF089, RF090, RF092 to RF094: the analysis of the period written by an
// AI service, with the numbers of the system next to it, to copy and to print
// (docs/agendamento/dashboard-do-painel.md). The screen that shows it keys it
// by period, so another period takes it back to the start (UC27 FA02). It is
// asked for by the click and not by an effect, because it costs a call to the
// service: nothing asks for it twice. The button waits with aria-disabled and
// keeps the focus (docs/padroes/componentes.md, RNF005).
export function DashboardAnalysisCard({
  period,
  hasAppointments,
}: DashboardAnalysisCardProps) {
  const titleId = useId();
  const noDataId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [detail, setDetail] = useState<DashboardAnalysisDetail>("summary");
  // The status region says when the analysis is ready.
  const [announcement, setAnnouncement] = useState("");

  // Leaving the screen, or the period, cancels the call on the way.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // UC27 FA04, RF093: the plain text, by the clipboard of the browser, which
  // may refuse it (an insecure page, a denied permission).
  async function copy(analysis: DashboardAnalysis) {
    setAnnouncement("");
    try {
      await navigator.clipboard.writeText(buildAnalysisText(analysis));
      setAnnouncement("Análise copiada.");
    } catch {
      setAnnouncement(
        "Não foi possível copiar. Selecione o texto e copie manualmente.",
      );
    }
  }

  async function generate() {
    if (state.status === "loading") return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });
    setAnnouncement("");
    // "Tentar novamente" goes away with the failure: the focus goes to the
    // button, which is already the one that has it when it was the one used.
    buttonRef.current?.focus();
    try {
      const analysis = await apiRequest<DashboardAnalysis>(ANALYSIS_PATH, {
        method: "POST",
        body: { ...period, detail },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setState({ status: "done", analysis });
      setAnnouncement("Análise gerada.");
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ status: "failed", message: toApiError(error).message });
    }
  }

  const isLoading = state.status === "loading";
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl bg-background p-5 shadow-neu-md"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="flex items-center gap-2 font-semibold">
          <SparklesIcon aria-hidden className="text-link" />
          Análise do período
        </h2>
        <p className="text-sm text-muted-foreground">
          Um resumo em texto dos indicadores deste período, escrito por
          inteligência artificial a partir dos números do sistema.
        </p>
      </div>
      <div className="flex flex-col items-start gap-4 print:hidden">
        <div className="@container w-full">
          <ChoiceGroup
            legend="Tipo de análise"
            choices={DETAIL_CHOICES}
            value={detail}
            onChange={setDetail}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={buttonRef}
            type="button"
            onClick={generate}
            disabled={isLoading || !hasAppointments}
            focusableWhenDisabled
            aria-describedby={hasAppointments ? undefined : noDataId}
          >
            {isLoading && (
              <LoaderCircleIcon
                aria-hidden
                className="animate-spin text-link"
              />
            )}
            {buttonLabel(state)}
          </Button>
          {state.status === "done" && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => copy(state.analysis)}
              >
                <CopyIcon aria-hidden />
                Copiar análise
              </Button>
              {/* UC27 FA05, RF094: the print of the browser also saves a PDF
                  (decision 0057). */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print()}
              >
                <PrinterIcon aria-hidden />
                Imprimir ou salvar em PDF
              </Button>
            </>
          )}
        </div>
        {!hasAppointments && (
          <p id={noDataId} className="text-sm text-muted-foreground">
            Não há dados suficientes no período para gerar a análise.
          </p>
        )}
      </div>
      <AnalysisContent state={state} onRetry={generate} />
      <div role="status" className="text-sm text-muted-foreground print:hidden">
        {announcement}
      </div>
    </section>
  );
}

function buttonLabel(state: AnalysisState): string {
  if (state.status === "loading") return "Gerando análise…";
  return state.status === "done" ? "Gerar novamente" : "Gerar análise";
}

function AnalysisContent({
  state,
  onRetry,
}: {
  state: AnalysisState;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div aria-busy className="flex flex-col gap-2">
        {Array.from({ length: LOADING_LINES }, (_, index) => (
          <Skeleton key={index} className="h-5 rounded-md" />
        ))}
      </div>
    );
  }
  if (state.status === "failed") {
    // UC27 FE02: the indicators go on, and the analysis may be asked again.
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          {state.message}
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (state.status === "idle") return null;
  const { analysis } = state;
  // RS020: the text of the service is shown as text, never as HTML.
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {describeAnalyzedPeriods(analysis)}
      </p>
      <p>{analysis.summary}</p>
      {analysis.highlights.length > 0 && (
        <ul className="flex flex-col gap-3">
          {analysis.highlights.map((highlight, index) => (
            <HighlightItem
              key={`${highlight.indicator}-${index}`}
              highlight={highlight}
              analysis={analysis}
            />
          ))}
        </ul>
      )}
      {analysis.sections && analysis.details && (
        <AnalysisSections
          sections={analysis.sections}
          recommendations={analysis.recommendations ?? []}
          details={analysis.details}
        />
      )}
      <AnalysisComparison analysis={analysis} />
      <p className="text-sm text-muted-foreground">
        {describeGeneration(analysis.generatedAt)}
      </p>
    </div>
  );
}

// RF092: an observation with the value of the system and its variation; the
// icon only repeats what is written.
function HighlightItem({
  highlight: { indicator, comment },
  analysis,
}: {
  highlight: DashboardAnalysisHighlight;
  analysis: DashboardAnalysis;
}) {
  const label = DASHBOARD_INDICATOR_LABELS[indicator];
  if (!isComparedIndicator(indicator)) {
    return (
      <li>
        <span className="font-semibold">{label}:</span> {comment}
      </li>
    );
  }
  const value = analysis.comparison[indicator];
  const Icon =
    value.variation === null
      ? null
      : value.variation > 0
        ? TrendingUpIcon
        : value.variation < 0
          ? TrendingDownIcon
          : MinusIcon;
  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-sm">
        {Icon && <Icon aria-hidden className="size-4 shrink-0 text-link" />}
        <span>
          <span className="font-semibold">{label}:</span>{" "}
          {describeComparedValue(indicator, value)}
        </span>
      </span>
      <span>{comment}</span>
    </li>
  );
}
