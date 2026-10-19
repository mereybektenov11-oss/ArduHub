import Link from "next/link";
import { learningRu as c } from "@/content/learning.ru";
import { ru } from "@/content/ru";
export default function About() {
  return (
    <main className="shell privacy-page">
      <Link href="/">{ru.brand}</Link>
      <h1>{c.about}</h1>
      <p>{c.aboutText}</p>
      <h2>{c.licenses}</h2>
      <p>{c.licenseNote}</p>
      <p>
        <a href="/licenses/wokwi-elements.txt">Wokwi Elements — MIT</a> ·{" "}
        <a href="/licenses/avr8js.txt">AVR8js — MIT</a>
      </p>
      <Link href="/privacy">{ru.privacy.title}</Link>
    </main>
  );
}
