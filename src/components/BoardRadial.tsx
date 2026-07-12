import React from "react";

interface BoardRadialProps {
  activeButtonIndex: number | null;
  onButtonPress: (index: number) => void;
  disabled: boolean;
  isFailed: boolean;
  statusLabel?: string;
  statusSubLabel?: string;
}

export default function BoardRadial({
  activeButtonIndex,
  onButtonPress,
  disabled,
  isFailed,
  statusLabel = "FABULOUS",
  statusSubLabel = "FRED",
}: BoardRadialProps) {
  const size = 340;
  const center = size / 2;
  const rOuter = 155;
  const rInner = 72;

  // 8 colored sectors
  const segments = [
    { index: 0, name: "Emerald", baseColor: "#059669", activeColor: "#34d399", glowColor: "rgba(52,211,153,0.8)" },
    { index: 1, name: "Teal", baseColor: "#0d9488", activeColor: "#2dd4bf", glowColor: "rgba(45,212,191,0.8)" },
    { index: 2, name: "Sapphire", baseColor: "#2563eb", activeColor: "#60a5fa", glowColor: "rgba(96,165,250,0.8)" },
    { index: 3, name: "Amethyst", baseColor: "#7c3aed", activeColor: "#a78bfa", glowColor: "rgba(167,139,250,0.8)" },
    { index: 4, name: "Orchid", baseColor: "#db2777", activeColor: "#f472b6", glowColor: "rgba(244,114,182,0.8)" },
    { index: 5, name: "Ruby", baseColor: "#dc2626", activeColor: "#f87171", glowColor: "rgba(248,113,113,0.8)" },
    { index: 6, name: "Amber", baseColor: "#d97706", activeColor: "#fbbf24", glowColor: "rgba(251,191,36,0.8)" },
    { index: 7, name: "Lime", baseColor: "#ca8a04", activeColor: "#fde047", glowColor: "rgba(253,224,71,0.8)" },
  ];

  // Flawless math formula to draw an SVG sector with custom pad angle
  function getSectorPath(
    cx: number,
    cy: number,
    rOut: number,
    rIn: number,
    startAngle: number,
    endAngle: number
  ) {
    const rad = Math.PI / 180;
    // Apply visual pad angle for high-end separation
    const pad = 2; 
    const sAng = startAngle + pad;
    const eAng = endAngle - pad;

    const x1_outer = cx + rOut * Math.cos(sAng * rad);
    const y1_outer = cy + rOut * Math.sin(sAng * rad);
    const x2_outer = cx + rOut * Math.cos(eAng * rad);
    const y2_outer = cy + rOut * Math.sin(eAng * rad);

    const x1_inner = cx + rIn * Math.cos(eAng * rad);
    const y1_inner = cy + rIn * Math.sin(eAng * rad);
    const x2_inner = cx + rIn * Math.cos(sAng * rad);
    const y2_inner = cy + rIn * Math.sin(sAng * rad);

    return `
      M ${x1_outer} ${y1_outer}
      A ${rOut} ${rOut} 0 0 1 ${x2_outer} ${y2_outer}
      L ${x1_inner} ${y1_inner}
      A ${rIn} ${rIn} 0 0 0 ${x2_inner} ${y2_inner}
      Z
    `.trim();
  }

  return (
    <div 
      className={`relative w-[340px] h-[340px] mx-auto transition-all duration-300 ${
        isFailed ? "filter grayscale brightness-50 contrast-75 cursor-not-allowed opacity-40" : ""
      }`}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full select-none"
      >
        {/* Outer dark casing */}
        <circle 
          cx={center} 
          cy={center} 
          r={rOuter + 8} 
          fill="#111827" 
          stroke="rgba(6, 182, 212, 0.2)" 
          strokeWidth="3" 
          className="shadow-2xl"
        />

        {/* 8 clickable buttons */}
        {segments.map((seg) => {
          const startAngle = seg.index * 45 - 90; // Start at top center (-90deg)
          const endAngle = startAngle + 45;
          const pathD = getSectorPath(center, center, rOuter, rInner, startAngle, endAngle);
          const isActive = activeButtonIndex === seg.index;

          return (
            <path
              id={`btn_radial_${seg.index}`}
              key={seg.index}
              d={pathD}
              fill={isActive ? seg.activeColor : seg.baseColor}
              stroke={isActive ? "#ffffff" : "rgba(255,255,255,0.05)"}
              strokeWidth={isActive ? "2" : "1"}
              style={{
                cursor: disabled || isFailed ? "not-allowed" : "pointer",
                filter: isActive ? `drop-shadow(0 0 12px ${seg.glowColor})` : "none",
                transition: "fill 0.1s ease, filter 0.1s ease",
              }}
              onMouseDown={() => !disabled && !isFailed && onButtonPress(seg.index)}
              onTouchStart={(e) => {
                e.preventDefault();
                if (!disabled && !isFailed) onButtonPress(seg.index);
              }}
              className="hover:brightness-110 active:brightness-95 transition-all"
            />
          );
        })}

        {/* Central interactive HUD button / status ring */}
        <circle 
          cx={center} 
          cy={center} 
          r={rInner - 4} 
          fill="#030712" 
          stroke="rgba(6, 182, 212, 0.5)" 
          strokeWidth="4"
          className="shadow-inner"
        />
        
        {/* Decorative cybernetic ticks */}
        <circle 
          cx={center} 
          cy={center} 
          r={rInner - 12} 
          fill="none" 
          stroke="rgba(6, 182, 212, 0.15)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
        />
      </svg>

      {/* Central HUD Labels rendered in HTML over SVG to allow easy text wrapping & absolute control */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <div className="w-[120px] text-center flex flex-col justify-center items-center">
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase truncate max-w-full">
            {statusLabel}
          </span>
          <span className="text-[14px] font-bold font-display text-white mt-0.5 truncate max-w-full">
            {statusSubLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
