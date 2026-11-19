import { useId } from "react";
import type {
  DashboardAnalysisSection,
  DashboardDetails,
} from "@/shared/api/dashboard";
import { DASHBOARD_SECTION_LABELS } from "@/shared/constants/dashboard-sections";
import { describeSectionNumbers } from "@/shared/format/analysis-text";

// RF091: the five sections of the detailed analysis, each with the
// observations of the AI service and the numbers of the system, and the
// recommendations (docs/agendamento/dashboard-do-painel.md). The text of the
// service is shown as text, never as HTML (RS020).
export function AnalysisSections({
  sections,
  recommendations,
  details,
}: {
  sections: DashboardAnalysisSection[];
  recommendations: string[];
  details: DashboardDetails;
}) {
  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ section, observations }) => (
        <SectionBlock
          key={section}
          title={DASHBOARD_SECTION_LABELS[section]}
          observations={observations}
          numbers={describeSectionNumbers(section, details)}
        />
      ))}
      {recommendations.length > 0 && (
        <RecommendationsBlock recommendations={recommendations} />
      )}
    </div>
  );
}

function SectionBlock({
  title,
  observations,
  numbers,
}: {
  title: string;
  observations: string[];
  numbers: string[];
}) {
  const titleId = useId();
  const numbersId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3 id={titleId} className="font-semibold">
        {title}
      </h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {observations.map((observation, index) => (
          <li key={index}>{observation}</li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm">
        <p id={numbersId} className="font-medium text-muted-foreground">
          Números da seção
        </p>
        <ul aria-labelledby={numbersId} className="flex flex-col gap-1">
          {numbers.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecommendationsBlock({
  recommendations,
}: {
  recommendations: string[];
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3 id={titleId} className="font-semibold">
        Sugestões
      </h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {recommendations.map((recommendation, index) => (
          <li key={index}>{recommendation}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Sugestões geradas por IA: avalie antes de colocar em prática.
      </p>
    </section>
  );
}
