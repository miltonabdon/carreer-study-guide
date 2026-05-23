"use client";

interface DayActivity {
  date: string;
  sessionCount: number;
  totalMinutes: number;
}

interface StudyHeatmapProps {
  weeklyActivity: DayActivity[];
}

function getColor(count: number): string {
  if (count === 0) return "bg-border";
  if (count === 1) return "bg-primary/20";
  if (count === 2) return "bg-primary/50";
  return "bg-primary/90";
}

export function StudyHeatmap({ weeklyActivity }: StudyHeatmapProps) {
  // Build a map of date → count for fast lookup
  const activityMap = new Map(weeklyActivity.map((d) => [d.date, d]));

  // Generate last 90 days
  const days: { date: string; label: string }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    days.push({ date, label });
  }

  // Group by week (columns)
  const weeks: { date: string; label: string }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Atividade — 90 dias</p>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-1">
            {week.map(({ date, label }) => {
              const activity = activityMap.get(date);
              const count = activity?.sessionCount ?? 0;
              return (
                <div
                  key={date}
                  title={`${label}: ${count} session${count !== 1 ? "s" : ""}${activity ? `, ${activity.totalMinutes} min` : ""}`}
                  className={`h-3.5 w-3.5 rounded-sm ${getColor(count)} cursor-default animate-in fade-in fill-mode-both`}
                  style={{ animationDelay: `${colIndex * 6}ms`, animationDuration: "200ms" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Menos</span>
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className={`h-3.5 w-3.5 rounded-sm ${getColor(c)}`} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
