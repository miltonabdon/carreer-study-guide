import { CheckCircle, XCircle, Calendar } from "lucide-react";
import { SuggestedGoalItem } from "./SuggestedGoalItem";

interface SuggestedGoal {
  title: string;
  rationale: string;
}

interface GapReportCardProps {
  reportId: string;
  generatedAt: string | Date;
  careerTargetSnapshot: string;
  coveredSkills: string[];
  missingSkills: string[];
  suggestedGoals: SuggestedGoal[];
}

export function GapReportCard({
  reportId,
  generatedAt,
  careerTargetSnapshot,
  coveredSkills,
  missingSkills,
  suggestedGoals,
}: GapReportCardProps) {
  const formattedDate = new Date(generatedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Análise gerada em {formattedDate}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
          Objetivo: {careerTargetSnapshot}
        </p>
      </div>

      <div className="p-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Covered skills */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            Skills Cobertas ({coveredSkills.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {coveredSkills.map((skill, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {skill}
              </li>
            ))}
            {coveredSkills.length === 0 && (
              <li className="text-xs text-muted-foreground">Nenhuma skill coberta ainda</li>
            )}
          </ul>
        </div>

        {/* Missing skills */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            Gaps Identificados ({missingSkills.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {missingSkills.map((skill, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {skill}
              </li>
            ))}
            {missingSkills.length === 0 && (
              <li className="text-xs text-muted-foreground">Nenhum gap encontrado</li>
            )}
          </ul>
        </div>
      </div>

      {/* Suggested goals */}
      {suggestedGoals.length > 0 && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metas Sugeridas
          </h3>
          {suggestedGoals.map((goal, i) => (
            <SuggestedGoalItem
              key={i}
              reportId={reportId}
              goalIndex={i}
              title={goal.title}
              rationale={goal.rationale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
