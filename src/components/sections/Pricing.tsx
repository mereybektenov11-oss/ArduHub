import { ru } from "@/content/ru";
import Link from "next/link";
import { SectionShell, SectionTitle } from "../ui/primitives";
export default function Pricing() {
  return (
    <SectionShell id="pricing">
      <SectionTitle title={ru.section.pricing} sub={ru.section.pricingSub} />
      <div
        className="pricing-grid"
        style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
      >
        {ru.plans.map((p) => (
          <article className={`plan plan-${p.id}`} key={p.id}>
            <div className="plan-title">
              <h3>{p.name}</h3>
            </div>
            <p>{p.tagline}</p>
            <div className="plan-price">{p.price}</div>
            <span className="plan-period">{ru.ui.perMonth}</span>
            <Link href="/app/profile" className="button button-primary">
              {p.cta}
              <span aria-hidden="true">↗</span>
            </Link>
            <ul>
              {p.features.map((f) => (
                <li key={f}>
                  <span aria-hidden="true">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="tokens-note">
        <span aria-hidden="true">✳</span>
        {ru.ui.tokens}
      </p>
    </SectionShell>
  );
}
