import { ru } from "@/content/ru";
export type Phase = "drawing" | "error" | "fixed";

export function Board() {
  return (
    <g transform="translate(28 65)">
      <rect width="210" height="148" rx="12" fill="var(--board)" />
      <path
        d="M16 20H191V127H16Z M35 36H178V111H35Z"
        stroke="var(--board-line)"
        strokeWidth="1"
        fill="none"
      />
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={i % 2 ? 196 : 14}
          cy={i > 1 ? 134 : 14}
          r="4"
          fill="var(--cream-100)"
        />
      ))}
      <rect x="-12" y="25" width="44" height="42" rx="4" fill="var(--metal)" />
      <rect x="-7" y="30" width="24" height="32" rx="2" fill="var(--chip)" />
      <rect x="64" y="55" width="95" height="32" rx="3" fill="var(--chip)" />
      <path
        d={Array.from(
          { length: 12 },
          (_, i) => `M${68 + i * 8} 50v5 M${68 + i * 8} 87v5`,
        ).join(" ")}
        stroke="var(--metal)"
        strokeWidth="3"
      />
      <rect x="48" y="9" width="138" height="14" rx="2" fill="var(--chip)" />
      <rect x="48" y="124" width="138" height="14" rx="2" fill="var(--chip)" />
      <path
        d={Array.from(
          { length: 13 },
          (_, i) => `M${54 + i * 10} 16h.01 M${54 + i * 10} 131h.01`,
        ).join(" ")}
        stroke="var(--metal)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <text
        x="65"
        y="107"
        fill="var(--white)"
        fontSize="11"
        fontFamily="monospace"
        letterSpacing="2"
      >
        {ru.ui.board}
      </text>
      <text x="108" y="36" fill="var(--cream-50)" fontSize="9">
        {ru.ui.pins.digital}
      </text>
      <text x="78" y="119" fill="var(--cream-50)" fontSize="9">
        {ru.ui.pins.ground}
      </text>
      <text x="128" y="119" fill="var(--cream-50)" fontSize="9">
        {ru.ui.pins.power}
      </text>
      <circle cx="183" cy="49" r="3" fill="var(--amber-500)" />
    </g>
  );
}
export function Breadboard() {
  return (
    <g>
      <rect
        x="268"
        y="54"
        width="143"
        height="175"
        rx="8"
        fill="var(--cream-100)"
      />
      <path d="M282 68V215 M398 68V215" stroke="var(--error)" strokeWidth="1" />
      <path d="M287 68V215 M393 68V215" stroke="var(--board)" strokeWidth="1" />
      <path
        d={Array.from({ length: 12 }, (_, r) =>
          Array.from(
            { length: 8 },
            (_, c) => `M${299 + c * 11} ${75 + r * 12}h.01`,
          ).join(" "),
        ).join(" ")}
        stroke="var(--metal)"
        strokeWidth="3.3"
        strokeLinecap="round"
      />
      <path d="M338 65V218" stroke="var(--metal)" strokeWidth="2" />
    </g>
  );
}
export function Led() {
  return (
    <g transform="translate(333 79)">
      <path d="M-7 20V46 M7 20V52" stroke="var(--metal)" strokeWidth="3" />
      <path d="M-12 20V5a12 12 0 0 1 24 0v15z" fill="currentColor" />
      <path d="M-16 20H16" stroke="currentColor" strokeWidth="4" />
      <path
        d="M-5-1Q-8 1-8 8"
        stroke="var(--white)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".6"
      />
    </g>
  );
}
export function Resistor() {
  return (
    <g transform="translate(291 156)">
      <path d="M-8 0H72" stroke="var(--metal)" strokeWidth="3" />
      <rect
        x="5"
        y="-7"
        width="50"
        height="14"
        rx="4"
        fill="var(--amber-500)"
      />
      {[16, 23, 32].map((x) => (
        <path
          key={x}
          d={`M${x}-7V7`}
          stroke="var(--text-dark)"
          strokeWidth="3"
        />
      ))}
      <text x="20" y="27" fill="var(--text-muted-dark)" fontSize="10">
        {ru.ui.resistor}
      </text>
    </g>
  );
}
export function Wire({
  d,
  tone = "var(--wire)",
}: {
  d: string;
  tone?: string;
}) {
  return (
    <path
      className="wire"
      d={d}
      pathLength="1"
      fill="none"
      stroke={tone}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
export function Pin({ x, y }: { x: number; y: number }) {
  return (
    <g className="circuit-pin">
      <circle
        cx={x}
        cy={y}
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx={x} cy={y} r="3.5" fill="currentColor" />
    </g>
  );
}
export default function CircuitScene({
  phase = "fixed",
  decorative = false,
  compact = false,
  teachingDemo = false,
}: {
  phase?: Phase;
  decorative?: boolean;
  compact?: boolean;
  teachingDemo?: boolean;
}) {
  return (
    <svg
      className={`circuit phase-${phase}`}
      viewBox="0 0 450 260"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : ru.ui.circuitLabel}
      aria-hidden={decorative || undefined}
    >
      {compact ? (
        <image href="/circuit-base.svg" width="450" height="260" />
      ) : (
        <>
          <Breadboard />
          <Board />
        </>
      )}
      {teachingDemo ? (
        <>
          <Wire d="M142 81V35H276V65H283" />
          <g className="teaching-resistor" transform="translate(0 -91)">
            <Resistor />
          </g>
          <Wire d="M363 65H391V125H326" />
          <Wire d="M340 131H410V237H112V196" tone="var(--board-line)" />
        </>
      ) : (
        <>
          <Wire d="M142 81V35Q142 27 150 27H314Q326 27 326 39V103" />
          <Wire
            d="M112 196V237Q112 246 123 246H365Q376 246 376 234V156"
            tone="var(--board-line)"
          />
          <Wire d="M298 156V130H326" />
          <Wire d="M340 131V146H358" />
        </>
      )}
      <g className="led-color">
        {teachingDemo ? (
          <g
            className="teaching-led"
            transform={
              phase === "fixed"
                ? "translate(0 0)"
                : "translate(666 0) scale(-1 1)"
            }
          >
            <Led />
          </g>
        ) : (
          <Led />
        )}
        <Pin x={340} y={131} />
      </g>
    </svg>
  );
}
