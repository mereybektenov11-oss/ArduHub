import type { ComponentProps, ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"a"> & {
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
}) {
  return (
    <a
      className={`button button-${variant} button-${size} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
export function Chip({ className = "", ...props }: ComponentProps<"button">) {
  return <button type="button" className={`chip ${className}`} {...props} />;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`card ${className}`} {...props} />;
}
export function SectionShell({
  tone = "cream",
  className = "",
  children,
  ...props
}: ComponentProps<"section"> & { tone?: "dark" | "cream" }) {
  return (
    <section className={`section tone-${tone} ${className}`} {...props}>
      <div className="shell">{children}</div>
    </section>
  );
}
export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}
