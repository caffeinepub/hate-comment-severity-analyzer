import { useEffect, useRef } from "react";

interface SeverityGaugeProps {
  score: number;
  riskLevel: "low" | "moderate" | "high" | "severe";
}

const RISK_COLORS = {
  low: "#4ade80",
  moderate: "#facc15",
  high: "#fb923c",
  severe: "#f87171",
};

const RISK_GLOW = {
  low: "0 0 30px rgba(74, 222, 128, 0.5)",
  moderate: "0 0 30px rgba(250, 204, 21, 0.5)",
  high: "0 0 30px rgba(251, 146, 60, 0.5)",
  severe: "0 0 30px rgba(248, 113, 113, 0.6)",
};

const TICK_ANGLES = Array.from({ length: 20 }, (_, i) => i);

export function SeverityGauge({ score, riskLevel }: SeverityGaugeProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    if (arcRef.current) {
      arcRef.current.style.setProperty("--gauge-offset", String(offset));
    }
  }, [offset]);

  const color = RISK_COLORS[riskLevel];
  const glow = RISK_GLOW[riskLevel];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 160, height: 160 }}
    >
      <svg
        width="160"
        height="160"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Severity score: ${score} out of 100, risk level: ${riskLevel}`}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {TICK_ANGLES.map((i) => {
          const angle = (i / 20) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + 38 * Math.cos(rad);
          const y1 = 50 + 38 * Math.sin(rad);
          const x2 = 50 + 42 * Math.cos(rad);
          const y2 = 50 + 42 * Math.sin(rad);
          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          );
        })}
        <circle
          ref={arcRef}
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform="rotate(-90 50 50)"
          className="gauge-arc"
          style={{ filter: `drop-shadow(${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold leading-none"
          style={{ fontSize: 32, color, textShadow: glow }}
        >
          {score}
        </span>
        <span className="text-xs font-mono text-muted-foreground mt-0.5">
          / 100
        </span>
      </div>
    </div>
  );
}
