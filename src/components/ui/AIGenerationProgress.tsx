"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { label: "Analisando seu objetivo…", until: 18 },
  { label: "Mapeando tópicos de aprendizado…", until: 36 },
  { label: "Estruturando o caminho de estudos…", until: 55 },
  { label: "Calculando cronograma personalizado…", until: 72 },
  { label: "Aplicando repetição espaçada (FSRS)…", until: 85 },
  { label: "Finalizando sua trilha…", until: 95 },
];

export function AIGenerationProgress() {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [fadeLabel, setFadeLabel] = useState(true);

  useEffect(() => {
    let prog = 0;
    let stage = 0;

    const tick = setInterval(() => {
      const ceiling = STAGES[stage]?.until ?? 95;

      if (prog >= ceiling) {
        if (stage < STAGES.length - 1) {
          stage++;
          setFadeLabel(false);
          setTimeout(() => {
            setStageIndex(stage);
            setFadeLabel(true);
          }, 150);
        }
        return;
      }

      const gap = ceiling - prog;
      prog += Math.max(0.1, gap * 0.02);
      if (prog > ceiling) prog = ceiling;
      setProgress(prog);
    }, 100);

    return () => clearInterval(tick);
  }, []);

  const label = STAGES[stageIndex]?.label ?? STAGES[STAGES.length - 1].label;

  return (
    <div className="w-full">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-xs font-medium text-primary transition-opacity duration-150"
          style={{ opacity: fadeLabel ? 1 : 0 }}
        >
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground font-mono">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Track */}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary relative overflow-hidden"
          style={{ width: `${progress}%`, transition: "width 0.12s ease-out" }}
        >
          {/* Shimmer leading edge */}
          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-primary-foreground/20 animate-pulse" />
        </div>
      </div>

      {/* Stage dots */}
      <div className="flex justify-between mt-3 px-0.5">
        {STAGES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i < stageIndex
                ? "h-1.5 w-1.5 bg-primary/50"
                : i === stageIndex
                ? "h-2 w-2 bg-primary ring-2 ring-primary/30"
                : "h-1.5 w-1.5 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
