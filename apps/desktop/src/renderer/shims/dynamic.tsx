// Replacement for next/dynamic inside the desktop app.
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

type Loader<P> = () => Promise<
  { default: ComponentType<P> } | ComponentType<P>
>;

export default function dynamic<P extends object>(
  load: Loader<P>,
  options: { loading?: () => ReactNode; ssr?: boolean } = {},
) {
  const Lazy = lazy(async () => {
    const mod = await load();
    return "default" in mod ? mod : { default: mod };
  });
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={options.loading?.() ?? null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
