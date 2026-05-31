"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeeklyVelocityData {
  weekLabel: string;
  topicsCompleted: number;
  studyHours: number;
}

interface WeeklyVelocityChartProps {
  data: WeeklyVelocityData[];
}

export function WeeklyVelocityChart({ data }: WeeklyVelocityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Nenhum dado de estudo nas últimas 8 semanas</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar dataKey="topicsCompleted" name="Tópicos concluídos" fill="var(--color-primary, #3b82f6)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="studyHours" name="Horas de estudo" fill="var(--color-muted, #94a3b8)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
