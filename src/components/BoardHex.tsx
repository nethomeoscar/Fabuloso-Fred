import React, { useState } from "react";

interface BoardHexProps {
  activeButtonIndex: number | null;
  onButtonPress: (index: number) => void;
  disabled: boolean;
  isFailed: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

export default function BoardHex({
  activeButtonIndex,
  onButtonPress,
  disabled,
  isFailed,
}: BoardHexProps) {
  const size = 340;
  const center = size / 2; // 170
  const hexRadius = 45; // radius of individual hexagon
  const layoutDistance = 95; // distance from center of hive to center of each outer hexagon

  // Hexagons metadata
  const hexList = [
    { index: 0, angle: 0, baseColor: "#059669", activeColor: "#34d399", glowColor: "rgba(52,211,153,0.8)", name: "Green" },
    { index: 1, angle: 60, baseColor: "#2563eb", activeColor: "#60a5fa", glowColor: "rgba(96,165,250,0.8)", name: "Blue" },
    { index: 2, angle: 120, baseColor: "#7c3aed", activeColor: "#a78bfa", glowColor: "rgba(167,139,250,0.8)", name: "Purple" },
    { index: 3, angle: 180, baseColor: "#0d9488", activeColor: "#2dd4bf", glowColor: "rgba(45,212,191,0.8)", name: "Teal" },
    { index: 4, angle: 240, baseColor: "#d97706", activeColor: "#fbbf24", glowColor: "rgba(251,191,36,0.8)", name: "Amber" },
    { index: 5, angle: 300, baseColor: "#db2777", activeColor: "#f472b6", glowColor: "rgba(244,114,182,0.8)", name: "Pink" },
    { index: 6, angle: null, baseColor: "#dc2626", activeColor: "#f87171", glowColor: "rgba(248,113,113,0.8)", name: "Ruby" }, // center
  ];

  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Calculate center of each hexagon
  function getHexCenter(hex: typeof hexList[0]) {
    if (hex.angle === null) {
      return { cx: center, cy: center };
    }
    const rad = (hex.angle * Math.PI) / 180;
    return {
      cx: center + layoutDistance * Math.cos(rad),
      cy: center + layoutDistance * Math.sin(rad),
    };
  }

  // Create SVG points string for a flat-topped hexagon
  function getHexPoints(cx: number, cy: number, r: number) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (i * Math.PI) / 3; // 60 degrees in radians
      const x = cx + r * Math.cos(angleRad);
      const y = cy + r * Math.sin(angleRad);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  }

  const handlePress = (index: number, cx: number, cy: number, glowColor: string) => {
    if (disabled || isFailed) return;

    // Trigger local ripple effect
    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x: cx,
      y: cy,
      color: glowColor,
    };
    setRipples((prev) => [...prev, newRipple]);

    // Clean up ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 800);

    onButtonPress(index);
  };

  return (
    <div 
      className={`relative w-[340px] h-[340px] mx-auto transition-all duration-300 ${
        isFailed ? "filter grayscale brightness-50 contrast-75 cursor-not-allowed opacity-40 animate-shake" : ""
      }`}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full select-none"
      >
        {/* Connection circuit links behind hexagons */}
        <g stroke="rgba(168, 85, 247, 0.12)" strokeWidth="3" fill="none">
          {hexList.slice(0, 6).map((hex) => {
            const hCenter = getHexCenter(hex);
            return (
              <line
                key={`line-${hex.index}`}
                x1={center}
                y1={center}
                x2={hCenter.cx}
                y2={hCenter.cy}
              />
            );
          })}
          {/* Outer ring path connecting outer hexagons */}
          <polygon
            points={hexList
              .slice(0, 6)
              .map((hex) => {
                const hCenter = getHexCenter(hex);
                return `${hCenter.cx},${hCenter.cy}`;
              })
              .join(" ")}
          />
        </g>

        {/* Dynamic click ripple rings */}
        {ripples.map((rip) => (
          <circle
            key={rip.id}
            cx={rip.x}
            cy={rip.y}
            r={hexRadius + 10}
            fill="none"
            stroke={rip.color}
            strokeWidth="4"
            className="ripple-wave"
          />
        ))}

        {/* Render 7 interactive hexagons */}
        {hexList.map((hex) => {
          const { cx, cy } = getHexCenter(hex);
          const pointsStr = getHexPoints(cx, cy, hexRadius);
          const isActive = activeButtonIndex === hex.index;

          return (
            <polygon
              id={`btn_hex_${hex.index}`}
              key={hex.index}
              points={pointsStr}
              fill={isActive ? hex.activeColor : hex.baseColor}
              stroke={isActive ? "#ffffff" : "rgba(255,255,255,0.08)"}
              strokeWidth={isActive ? "3" : "1.5"}
              style={{
                cursor: disabled || isFailed ? "not-allowed" : "pointer",
                filter: isActive ? `drop-shadow(0 0 15px ${hex.glowColor})` : "none",
                transition: "fill 0.1s ease, filter 0.1s ease",
              }}
              onMouseDown={() => handlePress(hex.index, cx, cy, hex.glowColor)}
              onTouchStart={(e) => {
                e.preventDefault();
                handlePress(hex.index, cx, cy, hex.glowColor);
              }}
              className="hover:brightness-110 active:scale-[0.98] transition-all origin-center"
            />
          );
        })}
      </svg>
    </div>
  );
}
