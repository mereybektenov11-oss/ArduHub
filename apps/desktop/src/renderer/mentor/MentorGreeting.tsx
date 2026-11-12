import { useCallback, useEffect, useRef, useState } from "react";
import { mentorRigs, type MentorId } from "./mentors";
import { playVoice } from "../sound/sfx";
import "./mentor.css";

const TYPE_MS = 40;

const reduced = () =>
  document.documentElement.dataset.motion === "reduce" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The selected AI mentor greets the learner: pops in, waves, and "says" the
// greeting in a speech bubble letter by letter with soft voice blips.
// The full text is the h1 for assistive tech from the first frame.
export default function MentorGreeting({
  mentor,
  text,
}: {
  mentor: MentorId;
  text: string;
}) {
  const rig = mentorRigs[mentor];
  const [shown, setShown] = useState(() => (reduced() ? text.length : 0));
  const [waving, setWaving] = useState(() => !reduced());
  const cancel = useRef<() => void>(() => {});

  // Types the text letter by letter; state changes only from timers.
  // The parent remounts this component (key) when mentor or text change.
  const type = useCallback(() => {
    cancel.current();
    let i = 0;
    let timer = 0;
    const tick = () => {
      i++;
      setShown(i);
      const ch = text[i - 1];
      if (ch && /[\p{L}\p{N}]/u.test(ch) && i % 2 === 0) playVoice(mentor);
      if (i < text.length) timer = window.setTimeout(tick, TYPE_MS);
    };
    timer = window.setTimeout(tick, 380);
    cancel.current = () => window.clearTimeout(timer);
  }, [mentor, text]);

  useEffect(() => {
    if (!reduced()) type();
    return () => cancel.current();
  }, [type]);

  // A click greets again: restart the wave and the sentence.
  function greet() {
    if (reduced()) return;
    setWaving(false);
    requestAnimationFrame(() => setWaving(true));
    setShown(0);
    type();
  }

  const talking = shown < text.length;
  const [px, py] = rig.pivot;
  const points = rig.hand.map((p) => p.join(",")).join(" ");
  const src = `/cabinet/${mentor}.webp`;
  const uid = `mentor-${mentor}`;

  return (
    <div className="mentor-greeting">
      <button
        type="button"
        className={`mentor-figure${talking ? " is-talking" : ""}`}
        aria-label={`${rig.name}: поздороваться ещё раз`}
        onClick={greet}
      >
        <svg
          className="mentor-svg"
          viewBox="0 0 384 384"
          aria-hidden="true"
          style={
            {
              "--wave-a": `${rig.wave[0]}deg`,
              "--wave-b": `${rig.wave[1]}deg`,
            } as React.CSSProperties
          }
        >
          <defs>
            <mask id={`${uid}-body`}>
              <rect width="384" height="384" fill="white" />
              <polygon points={points} fill="black" />
            </mask>
            <clipPath id={`${uid}-hand`}>
              <polygon points={points} />
            </clipPath>
          </defs>
          <g className="mentor-body">
            <ellipse
              className="mentor-shadow"
              cx="192"
              cy="372"
              rx="92"
              ry="9"
            />
            <image
              href={src}
              width="384"
              height="384"
              mask={`url(#${uid}-body)`}
            />
            <g
              className={`mentor-hand${waving ? " is-waving" : ""}`}
              style={{ transformOrigin: `${px}px ${py}px` }}
              onAnimationEnd={() => setWaving(false)}
            >
              <image
                href={src}
                width="384"
                height="384"
                clipPath={`url(#${uid}-hand)`}
              />
            </g>
          </g>
        </svg>
      </button>
      <div className="mentor-bubble">
        <span className="mentor-name">{rig.name}</span>
        <h1>
          <span className="sr-only">{text}</span>
          <span aria-hidden="true" className="mentor-text">
            {text.slice(0, shown)}
            <span className="mentor-rest">{text.slice(shown)}</span>
          </span>
        </h1>
      </div>
    </div>
  );
}
