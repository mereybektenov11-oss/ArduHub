import type { CSSProperties } from "react";
import { motionTokens } from "@/lib/motion";
import StaticCircuit from "../circuit/StaticCircuit";

export default function HeroBackground() {
  return (
    <div className="hero-background" aria-hidden="true">
      <div className="hero-depth">
        {motionTokens.hero.drift.map((duration, i) => (
          <div
            className={`hero-drift hero-drift-${i}`}
            key={i}
            style={
              {
                "--drift-duration": `${duration}s`,
                "--drift-phase": `${-i * 5}s`,
                "--tilt": `${i % 2 ? 5 : -4}deg`,
              } as CSSProperties
            }
          >
            <div className="hero-circuit-card">
              <StaticCircuit decorative />
            </div>
          </div>
        ))}
      </div>
      <svg
        className="hero-traces"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="hero-trace-light">
            <stop stopColor="var(--amber-500)" stopOpacity="0" />
            <stop offset=".6" stopColor="var(--amber-500)" />
            <stop offset="1" stopColor="var(--amber-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[
          "M0 170H180L260 250H500L580 330H900L980 250H1440",
          "M0 650H320L400 570H760L840 490H1100L1180 570H1440",
          "M130 0V100L210 180V390L290 470V800",
        ].map((d, i) => (
          <g key={d}>
            <path d={d} className="hero-trace-base" />
            <path
              d={d}
              className="hero-trace-pulse"
              pathLength="100"
              style={{
                animationDuration: `${motionTokens.hero.pulse[i]}s`,
                animationDelay: `${-i * 2}s`,
              }}
            />
          </g>
        ))}
      </svg>
      {motionTokens.hero.aura.map((duration, i) => (
        <div
          key={i}
          className={`hero-aura hero-aura-${i}`}
          style={{ animationDuration: `${duration}s` }}
        />
      ))}
      <div className="hero-shade" />
    </div>
  );
}
