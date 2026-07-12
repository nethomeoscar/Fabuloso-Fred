import React from "react";
import { Award, Zap, Timer, RotateCcw } from "lucide-react";

interface DiagnosticCardProps {
  score: number;
  multiplier: number;
  clicksCount: number;
  averageSpeedSec: number;
  highScore: number;
  onRestart: () => void;
  boardId: string;
}

export default function DiagnosticCard({
  score,
  multiplier,
  clicksCount,
  averageSpeedSec,
  highScore,
  onRestart,
  boardId,
}: DiagnosticCardProps) {
  // Determine memory rank and feedback
  let rank = "Memoria a Corto Plazo Distraída";
  let feedback = "¡Calentando motores! Te faltó un poco de concentración. Inténtalo de nuevo sin distracciones.";
  let badgeColor = "from-red-500 to-orange-500";
  let textColor = "text-red-400";

  // Multiplier scales the score threshold dynamically or acts as a diagnostic bonus!
  // "Al meter más colores, la escala de evaluación de memoria que definimos antes tendría que adaptarse dinámicamente... "
  // Tablero 4 Colores: Puntuación base (1x).
  // Tablero 6 Colores: Puntuación con bono de velocidad (1.5x).
  // Tablero 8 Colores: Puntuación con bono de memoria superior (2x).
  // Let's scale the score by multiplier for the rank!
  const effectiveScore = score * multiplier;

  if (effectiveScore >= 17) {
    rank = "Memoria Prodigiosa";
    feedback = "¿Eres un bot? Tu capacidad de secuenciación es impecable. ¡Dominio total!";
    badgeColor = "from-amber-400 via-yellow-300 to-emerald-400";
    textColor = "text-yellow-400";
  } else if (effectiveScore >= 13) {
    rank = "Memoria Superior";
    feedback = "¡Impresionante! Tu enfoque y retención están muy por encima de la media. ¡Casi una mente fotográfica!";
    badgeColor = "from-indigo-500 to-purple-600";
    textColor = "text-purple-400";
  } else if (effectiveScore >= 9) {
    rank = "Memoria Avanzada";
    feedback = "¡Excelente retención! Tienes una gran capacidad para organizar patrones visuales y auditivos.";
    badgeColor = "from-blue-500 to-indigo-500";
    textColor = "text-blue-400";
  } else if (effectiveScore >= 5) {
    rank = "Memoria Promedio (Estándar)";
    feedback = "¡Buen trabajo! Estás en el promedio humano de retención a corto plazo (el famoso \"mágico número 7 ± 2\").";
    badgeColor = "from-emerald-500 to-teal-500";
    textColor = "text-emerald-400";
  }

  // Calculate a precision factor
  // In single player, you survive until you fail. However, we can measure precision of clicks.
  // Precision = (score_clicks / total_clicks) * 100
  // Since one bad click ends it, precision can be represented as 100% or we can calculate it relative to speed.
  // Let's present "Precisión de Presión" (if they never clicked off-target or clicked accurately).
  const precision = clicksCount > 0 ? Math.min(100, Math.round((score / clicksCount) * 100)) : 100;

  // Let's decide UI theme border and colors based on boardId
  let cardBg = "bg-[#050515]/95 border-violet-500/30 shadow-[0_0_40px_rgba(139,92,246,0.3)] backdrop-blur-md";
  let titleColor = "text-white";

  if (boardId === "classic") {
    cardBg = "bg-[#050515]/95 border-fuchsia-500/40 shadow-[0_0_40px_rgba(240,46,170,0.3)] backdrop-blur-md";
    titleColor = "text-fuchsia-400";
  } else if (boardId === "radial") {
    cardBg = "bg-[#050515]/95 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.3)] backdrop-blur-md";
    titleColor = "text-cyan-400";
  } else if (boardId === "hex") {
    cardBg = "bg-[#050515]/95 border-purple-500/35 shadow-[0_0_40px_rgba(168,85,247,0.3)] backdrop-blur-md";
    titleColor = "text-purple-300";
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div 
        id="diagnostic_card"
        className={`w-full max-w-lg rounded-3xl border ${cardBg} p-6 md:p-8 text-center flex flex-col items-center gap-6 animate-scale-in`}
      >
        <div className={`p-4 rounded-full bg-gradient-to-br ${badgeColor} text-slate-950 shadow-xl`}>
          <Award size={48} strokeWidth={1.5} />
        </div>

        <div>
          <span className="text-[10px] font-mono tracking-[0.2em] text-violet-400 uppercase">Diagnóstico de Memoria</span>
          <h2 className={`text-2xl md:text-3xl font-black font-display tracking-tight uppercase italic mt-1.5 ${textColor}`}>
            {rank}
          </h2>
        </div>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-sm">
          {feedback}
        </p>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Rondas Acertadas</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-display text-white">{score}</span>
              {multiplier > 1 && (
                <span className="text-[10px] font-mono font-bold text-violet-400">({multiplier}x)</span>
              )}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Puntaje Eficaz</span>
            <span className="text-2xl font-bold font-display text-fuchsia-400 mt-1">
              {Math.round(effectiveScore * 10) / 10}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Zap size={11} className="text-amber-400" /> Precisión
            </span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1">
              {precision}%
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Timer size={11} className="text-cyan-400" /> Velocidad
            </span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {averageSpeedSec > 0 ? `${averageSpeedSec.toFixed(2)}s` : "---"}
            </span>
          </div>
        </div>

        {/* Record info */}
        <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
          <span>Récord Personal: <strong className="text-white">{highScore} rondas</strong></span>
          {score >= highScore && score > 0 && (
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[9px] uppercase font-bold animate-pulse">
              ¡Nuevo Récord!
            </span>
          )}
        </div>

        <button
          id="btn_retry_game"
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(240,46,170,0.4)] active:scale-95 cursor-pointer"
        >
          <RotateCcw size={16} />
          <span>Volver a Jugar</span>
        </button>
      </div>
    </div>
  );
}
