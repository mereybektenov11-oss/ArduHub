import type { Metadata } from "next";
import Link from "next/link";
import {
  TextureButton,
  type TextureButtonProps,
} from "@/components/ui/texture-button";
import "../../sign-in/auth.css";

export const metadata: Metadata = {
  title: "TextureButton",
  robots: { index: false, follow: false },
};

type Variant = NonNullable<TextureButtonProps["variant"]>;
const variants: Variant[] = [
  "primary",
  "glass",
  "secondary",
  "accent",
  "danger-soft",
  "destructive",
  "minimal",
];
const sizes = ["sm", "default", "lg"] as const;

// Glass needs a colorful backdrop; the dark one stays dark like the dark auth scene.
const glassBackdrop = {
  light:
    "bg-linear-to-br from-[color:var(--tb-primary-top)] to-[color:var(--tb-destructive-rim-top)]",
  dark: "bg-linear-to-br from-[color:var(--tb-accent-top)] to-[color:var(--tb-danger-soft-top)]",
};

function Gallery({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <h2>{theme}</h2>
      {variants.map((variant) => (
        <section
          key={variant}
          aria-label={`${theme} ${variant}`}
          className={`flex flex-wrap items-center gap-3 rounded-[16px] p-3 ${
            variant === "glass" ? glassBackdrop[theme] : ""
          }`}
        >
          {sizes.map((size) => (
            <TextureButton key={size} variant={variant} size={size}>
              {variant} {size}
            </TextureButton>
          ))}
          <TextureButton variant={variant} disabled>
            {variant} disabled
          </TextureButton>
        </section>
      ))}
      <section
        aria-label={`${theme} icon`}
        className="flex flex-wrap items-center gap-3 p-3"
      >
        <TextureButton variant="icon" size="icon" aria-label="icon">
          <span aria-hidden="true">↗</span>
        </TextureButton>
        <TextureButton variant="primary" size="icon" aria-label="next">
          <span aria-hidden="true">→</span>
        </TextureButton>
        <TextureButton
          variant="icon"
          size="icon"
          aria-label="icon disabled"
          disabled
        >
          <span aria-hidden="true">×</span>
        </TextureButton>
      </section>
      <section
        aria-label={`${theme} links`}
        className="flex flex-wrap items-center gap-3 p-3"
      >
        <TextureButton asChild variant="glass" size="lg">
          <Link href="/register">
            asChild link <span aria-hidden="true">↗</span>
          </Link>
        </TextureButton>
        <TextureButton asChild variant="secondary">
          <a aria-disabled="true">asChild aria-disabled</a>
        </TextureButton>
        <TextureButton asChild variant="primary" disabled>
          <Link href="/register">asChild disabled link</Link>
        </TextureButton>
        <TextureButton className="w-full" variant="primary" size="lg">
          full width via className, long label wraps on narrow screens
        </TextureButton>
      </section>
    </div>
  );
}

export default function TextureButtonsGallery() {
  return (
    <main>
      <div className="auth-page">
        <h1>TextureButton</h1>
        <Gallery theme="light" />
      </div>
      <div className="auth-page auth-dark">
        <Gallery theme="dark" />
      </div>
    </main>
  );
}
