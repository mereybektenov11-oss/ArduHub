import Link from "next/link";
import { learningRu as c } from "@/content/learning.ru";
export default function Page() {
  return (
    <div className="cab-stack">
      <h1>{c.about}</h1>
      <p>{c.aboutText}</p>
      <section className="cab-card">
        <h2>{c.licenses}</h2>
        <p>{c.licenseNote}</p>
        <p>
          <a
            href="https://github.com/wokwi/wokwi-elements"
            target="_blank"
            rel="noreferrer"
          >
            Wokwi Elements 1.9.2 — MIT
          </a>
        </p>
        <p>
          <a
            href="https://github.com/wokwi/avr8js"
            target="_blank"
            rel="noreferrer"
          >
            AVR8js 0.21.1 — MIT
          </a>
        </p>
        <p>
          <a href="/licenses/wokwi-elements.txt">
            Wokwi Elements — MIT license
          </a>{" "}
          · <a href="/licenses/avr8js.txt">AVR8js — MIT license</a>
        </p>
        <p>CodeMirror 6 — MIT</p>
      </section>
      <Link className="cab-btn" href="/app/projects">
        {c.projects} →
      </Link>
    </div>
  );
}
