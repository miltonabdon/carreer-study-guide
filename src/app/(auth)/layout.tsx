import { Brain, Calendar, RotateCcw, MessageSquare } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-foreground text-white px-14 py-12">
        {/* Logo mark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">StudyGuide AI</span>
        </div>

        {/* Main copy */}
        <div className="mt-auto mb-auto flex flex-col gap-8 max-w-sm">
          <div>
            <h1 className="font-display font-bold text-5xl tracking-tight leading-tight">
              Aprenda com<br />intenção.
            </h1>
            <p className="mt-4 text-white/75 text-base leading-relaxed">
              Um guia de estudos que se adapta ao seu ritmo, consolida o conhecimento e mantém você no rumo certo — todos os dias.
            </p>
          </div>

          {/* Bullet points */}
          <ul className="flex flex-col gap-5">
            <li className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-white/70 mt-0.5 shrink-0" />
              <span className="text-sm text-white/85 leading-snug">Plano diário personalizado com base nos seus objetivos</span>
            </li>
            <li className="flex items-start gap-3">
              <RotateCcw className="w-4 h-4 text-white/70 mt-0.5 shrink-0" />
              <span className="text-sm text-white/85 leading-snug">Repetição espaçada com algoritmo FSRS de última geração</span>
            </li>
            <li className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-white/70 mt-0.5 shrink-0" />
              <span className="text-sm text-white/85 leading-snug">Coach IA contextualizado com seu progresso real</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/30">StudyGuide AI — v1</p>
      </div>

      {/* Right panel — form area */}
      <div className="lg:w-1/2 w-full flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
