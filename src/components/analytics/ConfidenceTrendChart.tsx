"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ConfidenceTrendRow {
  goalId: string;
  goalTitle: string;
  weekLabel: string;
  avgConfidence: number;
}

interface ConfidenceTrendChartProps {
  data: ConfidenceTrendRow[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export function ConfidenceTrendChart({ data }: ConfidenceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Nenhum dado de confiança disponível</p>
      </div>
    );
  }

  // Pivot data: week → { weekLabel, goalId: value, ... }
  const goalIds = Array.from(new Set(data.map((d) => d.goalId))).slice(0, 5);
  const goalTitles = Object.fromEntries(data.map((d) => [d.goalId, d.goalTitle]));
  const weeks = Array.from(new Set(data.map((d) => d.weekLabel)));

  let chartData: Record<string, string | number>[];
  if (goalIds.length > 5) {
    // Single combined average
    chartData = weeks.map((week) => {
      const rows = data.filter((d) => d.weekLabel === week);
      const avg = rows.reduce((s, r) => s + r.avgConfidence, 0) / rows.length;
      return { weekLabel: week, combined: parseFloat(avg.toFixed(1)) };
    });
  } else {
    chartData = weeks.map((week) => {
      const entry: Record<string, string | number> = { weekLabel: week };
      for (const gid of goalIds) {
        const row = data.find((d) => d.weekLabel === week && d.goalId === gid);
        if (row) entry[gid] = row.avgConfidence;
      }
      return entry;
    });
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {goalIds.length > 5 ? (
          <Line
            type="monotone"
            dataKey="combined"
            name="Média geral"
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ) : (
          goalIds.map((gid, i) => (
            <Line
              key={gid}
              type="monotone"
              dataKey={gid}
              name={goalTitles[gid] ?? gid}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
