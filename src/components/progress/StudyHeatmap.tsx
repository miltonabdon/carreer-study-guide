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
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count === 2) return "bg-green-400 dark:bg-green-700";
  return "bg-green-600 dark:bg-green-500";
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
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">90-day activity</h3>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(({ date, label }) => {
              const activity = activityMap.get(date);
              const count = activity?.sessionCount ?? 0;
              return (
                <div
                  key={date}
                  title={`${label}: ${count} session${count !== 1 ? "s" : ""}${activity ? `, ${activity.totalMinutes} min` : ""}`}
                  className={`h-3 w-3 rounded-sm ${getColor(count)} cursor-default`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className={`h-3 w-3 rounded-sm ${getColor(c)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
