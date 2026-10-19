"use client";
import { editorCopy as c } from "@/content/cabinet.ru";
export default function PinDiagram({
  kind = "led",
  options,
  selected,
  onSelect,
}: {
  kind?: "led" | "wrongpin" | "sensor";
  options: readonly string[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const sensor = kind === "sensor";
  const pins = [
    { name: "13", x: 150, y: 55 },
    { name: "12", x: 150, y: 90 },
    { name: "5V", x: 150, y: 125 },
    { name: "GND", x: 150, y: 175 },
    ...(sensor
      ? [
          { name: "VCC", x: 350, y: 55 },
          { name: "SIG", x: 350, y: 110 },
          { name: "GND", x: 350, y: 175 },
        ]
      : [
          { name: "A", x: 350, y: 65 },
          { name: "K", x: 350, y: 130 },
        ]),
  ];
  const wire =
    kind === "wrongpin"
      ? "M150 90H240V65H350M350 130H280V175H150"
      : sensor
        ? "M150 125H250V55H350M350 175H290V125H150"
        : "M150 55H240V65H350M350 130H280V125H150";
  return (
    <svg
      className="cab-pin-diagram"
      viewBox="0 0 500 235"
      aria-label={c.canvas}
    >
      <rect
        x="20"
        y="25"
        width="130"
        height="180"
        rx="10"
        fill="var(--board)"
      />
      <text
        x="75"
        y="105"
        textAnchor="middle"
        fill="var(--cream-50)"
        fontSize="12"
      >
        ARDUINO
      </text>
      <text
        x="75"
        y="125"
        textAnchor="middle"
        fill="var(--cream-50)"
        fontSize="10"
      >
        UNO
      </text>
      <rect
        x="350"
        y="25"
        width="105"
        height={sensor ? 180 : 135}
        rx={sensor ? 12 : 38}
        fill={sensor ? "var(--board)" : "var(--light-success)"}
        stroke="var(--line-dark)"
      />
      <text
        x="405"
        y="110"
        textAnchor="middle"
        fill={sensor ? "var(--cream-50)" : "var(--board)"}
        fontSize="28"
      >
        {sensor ? "∿" : "◉"}
      </text>
      <path d={wire} fill="none" stroke="var(--wire)" strokeWidth="4" />
      {pins.map((pin, i) => {
        const index = options.indexOf(pin.name),
          clickable = index >= 0;
        return (
          <g
            key={`${pin.name}-${i}`}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? pin.name : undefined}
            aria-pressed={clickable ? selected === index : undefined}
            onClick={() => clickable && onSelect(index)}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(index);
              }
            }}
            className={clickable ? "cab-quiz-pin" : ""}
          >
            <circle
              cx={pin.x}
              cy={pin.y}
              r="18"
              fill={
                selected === index && clickable
                  ? "var(--amber-500)"
                  : "var(--cream-50)"
              }
              stroke="var(--ink-900)"
              strokeWidth="2"
            />
            <text
              x={pin.x}
              y={pin.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="var(--ink-900)"
              pointerEvents="none"
            >
              {pin.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
