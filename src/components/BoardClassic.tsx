import React from "react";

interface BoardClassicProps {
  activeButtonIndex: number | null;
  onButtonPress: (index: number) => void;
  disabled: boolean;
  isFailed: boolean;
  score?: number;
}

export default function BoardClassic({
  activeButtonIndex,
  onButtonPress,
  disabled,
  isFailed,
  score,
}: BoardClassicProps) {
  const buttons = [
    {
      index: 0,
      name: "Green",
      colorClass: "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30",
      activeColorClass: "bg-emerald-400 border-emerald-100 glow-classic-green",
      baseShadow: "shadow-[inset_0_0_50px_rgba(16,185,129,0.1)]",
      activeShadow: "shadow-[0_0_60px_rgba(16,185,129,0.8)] scale-[0.98]",
      roundingClass: "rounded-tl-[80px] md:rounded-tl-[120px] rounded-tr-xl rounded-bl-xl rounded-br-xl",
    },
    {
      index: 1,
      name: "Red",
      colorClass: "bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30",
      activeColorClass: "bg-rose-400 border-rose-100 glow-classic-red",
      baseShadow: "shadow-[inset_0_0_50px_rgba(244,63,94,0.1)]",
      activeShadow: "shadow-[0_0_60px_rgba(244,63,94,0.8)] scale-[0.98]",
      roundingClass: "rounded-tr-[80px] md:rounded-tr-[120px] rounded-tl-xl rounded-bl-xl rounded-br-xl",
    },
    {
      index: 2,
      name: "Blue",
      colorClass: "bg-sky-500/20 border-sky-500/40 hover:bg-sky-500/30",
      activeColorClass: "bg-sky-400 border-sky-100 glow-classic-blue",
      baseShadow: "shadow-[inset_0_0_50px_rgba(14,165,233,0.1)]",
      activeShadow: "shadow-[0_0_60px_rgba(14,165,233,0.8)] scale-[0.98]",
      roundingClass: "rounded-bl-[80px] md:rounded-bl-[120px] rounded-tl-xl rounded-tr-xl rounded-br-xl",
    },
    {
      index: 3,
      name: "Yellow",
      colorClass: "bg-amber-400/20 border-amber-400/40 hover:bg-amber-400/30",
      activeColorClass: "bg-amber-300 border-amber-100 glow-classic-yellow",
      baseShadow: "shadow-[inset_0_0_50px_rgba(251,191,36,0.1)]",
      activeShadow: "shadow-[0_0_60px_rgba(251,191,36,0.8)] scale-[0.98]",
      roundingClass: "rounded-br-[80px] md:rounded-br-[120px] rounded-tl-xl rounded-tr-xl rounded-bl-xl",
    },
  ];

  return (
    <div 
      className={`grid grid-cols-2 gap-4 w-72 h-72 md:w-[420px] md:h-[420px] mx-auto p-4 rounded-[40px] bg-black/40 border border-white/5 shadow-2xl backdrop-blur-md transition-all duration-300 relative ${
        isFailed ? "filter grayscale brightness-50 contrast-75 cursor-not-allowed opacity-40" : ""
      }`}
    >
      {buttons.map((btn) => {
        const isActive = activeButtonIndex === btn.index;
        return (
          <button
            id={`btn_classic_${btn.index}`}
            key={btn.index}
            disabled={disabled || isFailed}
            onMouseDown={() => !disabled && !isFailed && onButtonPress(btn.index)}
            onTouchStart={(e) => {
              e.preventDefault();
              if (!disabled && !isFailed) onButtonPress(btn.index);
            }}
            className={`w-full h-full border-4 flex items-center justify-center transition-all duration-100 focus:outline-none ${btn.roundingClass} ${
              isActive 
                ? `${btn.activeColorClass} ${btn.activeShadow}` 
                : `${btn.colorClass} ${btn.baseShadow} cursor-pointer`
            }`}
            aria-label={`Button ${btn.name}`}
          />
        );
      })}

      {/* Center Status Core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-36 md:h-36 bg-[#050515] rounded-full border border-white/10 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.6)] pointer-events-none select-none z-10">
        <span className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-mono">Score</span>
        <span className="text-2xl md:text-3xl font-black font-mono text-white mt-1">{score !== undefined ? score : 0}</span>
        <div className="mt-1.5 w-10 h-0.5 bg-fuchsia-500 rounded-full"></div>
      </div>
    </div>
  );
}
