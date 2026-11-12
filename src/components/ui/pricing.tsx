"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { TextureButton } from "@/components/ui/texture-button";

export interface PricingPlan {
  readonly id: string;
  readonly name: string;
  readonly price: number | null;
  readonly priceLabel: string;
  readonly period: string;
  readonly tagline: string;
  readonly status: string;
  readonly features: readonly string[];
  readonly description: string;
  readonly buttonText: string;
  readonly href: string;
  readonly featured: boolean;
  readonly disabled: boolean;
}
interface PricingProps {
  plans: readonly PricingPlan[];
  title: string;
  description: string;
  eyebrow: string;
  billing: string;
  featuredLabel: string;
  currency: string;
}

// Adapted from the supplied pricing reference using the project's existing
// motion package, scoped tokens, real plan data and native accessible controls.
export function Pricing({
  plans,
  title,
  description,
  eyebrow,
  billing,
  featuredLabel,
  currency,
}: PricingProps) {
  const reduced = useReducedMotion();
  return (
    <section className="ui-pricing" aria-labelledby="pricing-title">
      <header className="profile-account pricing-heading">
        <p className="profile-eyebrow">{eyebrow}</p>
        <h1 id="pricing-title">{title}</h1>
        <p className="profile-subtitle">{description}</p>
        <span className="pricing-billing">{billing}</span>
      </header>
      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div
            className={`pricing-position ${plan.featured ? "pricing-featured" : ""}`}
            key={plan.id}
          >
            <motion.article
              className="pricing-card"
              aria-labelledby={`plan-${plan.id}`}
              data-plan={plan.id}
              initial={reduced ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 85,
                      damping: 22,
                      delay: index * 0.09,
                    }
              }
            >
              {plan.featured && (
                <div className="pricing-featured-label">
                  <span aria-hidden="true">✦</span>
                  {featuredLabel}
                </div>
              )}
              <div className="pricing-card-top">
                <span className="profile-status">{plan.status}</span>
                <h2 id={`plan-${plan.id}`}>{plan.name}</h2>
                <p>{plan.tagline}</p>
              </div>
              <div
                className={`pricing-value ${plan.price === null ? "pricing-value-custom" : ""}`}
              >
                <strong>
                  {plan.price === null
                    ? plan.priceLabel
                    : new Intl.NumberFormat("ru-RU").format(plan.price)}
                </strong>
                {plan.price !== null && (
                  <span className="pricing-currency">{currency}</span>
                )}
              </div>
              <span className="pricing-period">{plan.period || "\u00a0"}</span>
              <ul className="pricing-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <path
                        d="m4 10 4 4 8-8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pricing-card-bottom">
                {plan.disabled ? (
                  <TextureButton
                    variant="secondary"
                    type="button"
                    className="pricing-action"
                    disabled
                    aria-describedby="pricing-availability"
                  >
                    {plan.buttonText}
                  </TextureButton>
                ) : (
                  <TextureButton
                    asChild
                    variant="primary"
                    className="pricing-action"
                  >
                    <Link href={plan.href}>
                      {plan.buttonText}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </TextureButton>
                )}
                <p>{plan.description}</p>
              </div>
            </motion.article>
          </div>
        ))}
      </div>
    </section>
  );
}
