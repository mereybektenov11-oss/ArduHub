import { Pricing } from "@/components/ui/pricing";
import { accountPricingRu as c } from "@/content/ru";
export default function Page() {
  return (
    <div className="profile-content">
      <Pricing
        plans={c.plans}
        title={c.title}
        description={c.subtitle}
        eyebrow={c.eyebrow}
        billing={c.billing}
        featuredLabel={c.featured}
        currency={c.currency}
      />
      <div className="pricing-notes" id="pricing-availability">
        <p>{c.note}</p>
        <p>{c.tokenNote}</p>
      </div>
      <section className="account-benefits">
        <h2>{c.benefitsTitle}</h2>
        <div className="account-card-grid">
          {c.benefits.map((benefit, i) => (
            <article className="account-info-card" key={benefit.title}>
              <span className="account-step" aria-hidden="true">
                0{i + 1}
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
