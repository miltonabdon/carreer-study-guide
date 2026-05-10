interface RiskInput {
  completedTopics: number;
  totalTopics: number;
  targetDate: string | null;
  dailyAvailableMinutes: number;
  remainingMinutes: number;
}

interface RiskResult {
  atRisk: boolean;
  estimatedCompletionDate: string | null;
}

export function calculateRisk({
  completedTopics,
  totalTopics,
  targetDate,
  dailyAvailableMinutes,
  remainingMinutes,
}: RiskInput): RiskResult {
  if (!targetDate || totalTopics === 0 || completedTopics >= totalTopics) {
    return { atRisk: false, estimatedCompletionDate: null };
  }

  const minutesPerDay = dailyAvailableMinutes > 0 ? dailyAvailableMinutes : 60;
  const daysNeeded = Math.ceil(remainingMinutes / minutesPerDay);

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
  const estimatedCompletionDate = estimatedDate.toISOString().split("T")[0];

  const targetMs = new Date(targetDate).getTime();
  const estimatedMs = estimatedDate.getTime();

  return {
    atRisk: estimatedMs > targetMs,
    estimatedCompletionDate,
  };
}
