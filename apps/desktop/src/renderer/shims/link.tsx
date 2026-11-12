// Replacement for next/link inside the desktop app.
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { navigate } from "../router";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  replace?: boolean;
  prefetch?: boolean;
  scroll?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, replace, prefetch: _p, scroll: _s, onClick, ...rest },
  ref,
) {
  const target = typeof href === "string" ? href : (href.pathname ?? "/");
  return (
    <a
      ref={ref}
      href={target}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(target, replace);
      }}
    />
  );
});

export default Link;
