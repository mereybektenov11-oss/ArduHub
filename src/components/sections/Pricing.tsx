import { ru } from "@/content/ru";
import AccessLink from "../ui/AccessLink";
import { SectionShell, SectionTitle } from "../ui/primitives";
export default function Pricing() {
  return (
    <SectionShell id="pricing">
      <SectionTitle title={ru.section.pricing} sub={ru.section.pricingSub} />
      <div className="pricing-grid">
        {ru.plans.map((p) => (
          <article className={`plan plan-${p.id}`} key={p.id}>
            <div className="plan-title">
              <h3>{p.name}</h3>
              {p.id === "pro" && <span className="badge">{ru.ui.popular}</span>}
            </div>
            <p>{p.tagline}</p>
            <div className="plan-price">{p.price}</div>
            <span className="plan-period">
              {p.id === "free" ? ru.ui.perMonth : ru.ui.upcoming}
            </span>
            <AccessLink
              role={p.id === "school" ? "school" : "other"}
              className={`button ${p.id === "pro" ? "button-primary" : "button-secondary"}`}
            >
              {p.cta}
              <span aria-hidden="true">↗</span>
            </AccessLink>
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
