"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Outer element: gradient rim (border + 1px padding + gradient background).
// All colors come from --tb-* tokens in src/app/texture-button.css.
const textureButtonVariants = cva(
  "group/tb relative inline-flex max-w-full cursor-pointer items-stretch border p-px align-middle font-semibold no-underline select-none transition-[color,background-color,border-color,box-shadow,opacity,--tw-gradient-from,--tw-gradient-to] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tb-focus)] disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "border-[color:var(--tb-primary-border)] bg-linear-to-b from-[color:var(--tb-primary-rim-top)] to-[color:var(--tb-primary-rim-bottom)] text-[color:var(--tb-primary-text)] shadow-[0_1px_2px_var(--tb-shadow),0_8px_20px_-12px_var(--tb-shadow)]",
        glass:
          "border-[color:var(--tb-glass-border)] bg-linear-to-b from-[color:var(--tb-glass-rim-top)] to-[color:var(--tb-glass-rim-bottom)] text-[color:var(--tb-glass-text)] shadow-[0_1px_2px_var(--tb-shadow),0_10px_28px_-14px_var(--tb-shadow)] backdrop-blur-md",
        secondary:
          "border-[color:var(--tb-secondary-border)] bg-linear-to-b from-[color:var(--tb-secondary-rim-top)] to-[color:var(--tb-secondary-rim-bottom)] text-[color:var(--tb-secondary-text)] shadow-[0_1px_2px_var(--tb-shadow)]",
        accent:
          "border-[color:var(--tb-accent-border)] bg-linear-to-b from-[color:var(--tb-accent-rim-top)] to-[color:var(--tb-accent-rim-bottom)] text-[color:var(--tb-accent-text)] shadow-[0_1px_2px_var(--tb-shadow)]",
        "danger-soft":
          "border-[color:var(--tb-danger-soft-border)] bg-linear-to-b from-[color:var(--tb-danger-soft-rim-top)] to-[color:var(--tb-danger-soft-rim-bottom)] text-[color:var(--tb-danger-soft-text)] shadow-[0_1px_2px_var(--tb-shadow)]",
        destructive:
          "border-[color:var(--tb-destructive-border)] bg-linear-to-b from-[color:var(--tb-destructive-rim-top)] to-[color:var(--tb-destructive-rim-bottom)] text-[color:var(--tb-destructive-text)] shadow-[0_1px_2px_var(--tb-shadow),0_8px_20px_-12px_var(--tb-shadow)]",
        minimal:
          "border-transparent bg-transparent text-[color:var(--tb-minimal-text)]",
        icon: "border-[color:var(--tb-icon-border)] bg-linear-to-b from-[color:var(--tb-icon-rim-top)] to-[color:var(--tb-icon-rim-bottom)] text-[color:var(--tb-icon-text)] shadow-[0_1px_2px_var(--tb-shadow)]",
      },
      size: {
        sm: "rounded-[8px]",
        default: "rounded-[12px]",
        lg: "rounded-[14px]",
        icon: "rounded-full",
      },
    },
    compoundVariants: [{ variant: "icon", className: "rounded-full" }],
    defaultVariants: { variant: "primary", size: "default" },
  },
);

// Inner layer: gradient fill. A span keeps <button> content phrasing-only.
const textureButtonInnerVariants = cva(
  "flex flex-1 items-center justify-center gap-2 text-center leading-tight transition-[color,background-color,box-shadow,--tw-gradient-from,--tw-gradient-to] duration-300 ease-out motion-reduce:transition-none",
  {
    variants: {
      variant: {
        primary:
          "bg-linear-to-b from-[color:var(--tb-primary-top)] to-[color:var(--tb-primary-bottom)] shadow-[inset_0_1px_0_var(--tb-primary-highlight)]",
        glass:
          "bg-linear-to-b from-[color:var(--tb-glass-top)] to-[color:var(--tb-glass-bottom)] shadow-[inset_0_1px_0_var(--tb-glass-highlight)]",
        secondary:
          "bg-linear-to-b from-[color:var(--tb-secondary-top)] to-[color:var(--tb-secondary-bottom)] shadow-[inset_0_1px_0_var(--tb-secondary-highlight)]",
        accent:
          "bg-linear-to-b from-[color:var(--tb-accent-top)] to-[color:var(--tb-accent-bottom)] shadow-[inset_0_1px_0_var(--tb-accent-highlight)]",
        "danger-soft":
          "bg-linear-to-b from-[color:var(--tb-danger-soft-top)] to-[color:var(--tb-danger-soft-bottom)] shadow-[inset_0_1px_0_var(--tb-danger-soft-highlight)]",
        destructive:
          "bg-linear-to-b from-[color:var(--tb-destructive-top)] to-[color:var(--tb-destructive-bottom)] shadow-[inset_0_1px_0_var(--tb-destructive-highlight)]",
        minimal: "bg-transparent",
        icon: "bg-linear-to-b from-[color:var(--tb-icon-top)] to-[color:var(--tb-icon-bottom)] shadow-[inset_0_1px_0_var(--tb-icon-highlight)]",
      },
      size: {
        sm: "min-h-7 rounded-[6px] px-3 py-1 text-xs",
        default: "min-h-9 rounded-[10px] px-4 py-2 text-sm",
        lg: "min-h-11 rounded-[12px] px-5 py-2.5 text-base",
        icon: "size-9 rounded-full p-0 text-base",
      },
    },
    compoundVariants: [{ variant: "icon", className: "rounded-full" }],
    defaultVariants: { variant: "primary", size: "default" },
  },
);

// Hover/active fills are only attached to interactive buttons, so disabled and
// aria-disabled elements never react to the pointer.
const textureButtonInteractiveVariants = cva("", {
  variants: {
    variant: {
      primary:
        "group-hover/tb:from-[color:var(--tb-primary-hover-top)] group-hover/tb:to-[color:var(--tb-primary-hover-bottom)] group-active/tb:from-[color:var(--tb-primary-active)] group-active/tb:to-[color:var(--tb-primary-active)]",
      glass:
        "group-hover/tb:from-[color:var(--tb-glass-hover-top)] group-hover/tb:to-[color:var(--tb-glass-hover-bottom)] group-active/tb:from-[color:var(--tb-glass-active)] group-active/tb:to-[color:var(--tb-glass-active)]",
      secondary:
        "group-hover/tb:from-[color:var(--tb-secondary-hover-top)] group-hover/tb:to-[color:var(--tb-secondary-hover-bottom)] group-active/tb:from-[color:var(--tb-secondary-active)] group-active/tb:to-[color:var(--tb-secondary-active)]",
      accent:
        "group-hover/tb:from-[color:var(--tb-accent-hover-top)] group-hover/tb:to-[color:var(--tb-accent-hover-bottom)] group-active/tb:from-[color:var(--tb-accent-active)] group-active/tb:to-[color:var(--tb-accent-active)]",
      "danger-soft":
        "group-hover/tb:from-[color:var(--tb-danger-soft-hover-top)] group-hover/tb:to-[color:var(--tb-danger-soft-hover-bottom)] group-active/tb:from-[color:var(--tb-danger-soft-active)] group-active/tb:to-[color:var(--tb-danger-soft-active)]",
      destructive:
        "group-hover/tb:from-[color:var(--tb-destructive-hover-top)] group-hover/tb:to-[color:var(--tb-destructive-hover-bottom)] group-active/tb:from-[color:var(--tb-destructive-active)] group-active/tb:to-[color:var(--tb-destructive-active)]",
      minimal:
        "group-hover/tb:bg-[color:var(--tb-minimal-hover)] group-active/tb:bg-[color:var(--tb-minimal-active)]",
      icon: "group-hover/tb:from-[color:var(--tb-icon-hover-top)] group-hover/tb:to-[color:var(--tb-icon-hover-bottom)] group-active/tb:from-[color:var(--tb-icon-active)] group-active/tb:to-[color:var(--tb-icon-active)]",
    },
  },
  defaultVariants: { variant: "primary" },
});

type ChildProps = {
  children?: React.ReactNode;
  "aria-disabled"?: React.AriaAttributes["aria-disabled"];
  onClick?: React.MouseEventHandler<HTMLElement>;
};

// A disabled link stays focusable (screen readers announce it as dimmed), but
// activation is cancelled: Enter on a link dispatches click, so one handler
// covers mouse and keyboard. next/link skips navigation on defaultPrevented.
const preventActivation = (event: React.MouseEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

export interface TextureButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof textureButtonVariants> {
  /** Render the single child element (e.g. next/link) with button styling. */
  asChild?: boolean;
}

// Server components may hand a client component its children as a lazy
// reference (React Flight outlines some elements); unwrap it like Radix Slot.
type LazyNode = {
  $$typeof: symbol;
  _payload: PromiseLike<React.ReactNode>;
};
const isLazyNode = (value: unknown): value is LazyNode =>
  typeof value === "object" &&
  value !== null &&
  (value as { $$typeof?: unknown }).$$typeof === Symbol.for("react.lazy") &&
  typeof (value as { _payload?: { then?: unknown } })._payload?.then ===
    "function";
function useUnwrappedLazy(value: React.ReactNode) {
  let node: unknown = value;
  while (isLazyNode(node)) node = React.use(node._payload);
  return node as React.ReactNode;
}

const isAriaDisabled = (value: React.AriaAttributes["aria-disabled"]) =>
  value === true || value === "true";

const TextureButton = React.forwardRef<HTMLButtonElement, TextureButtonProps>(
  ({ children, variant, size, asChild = false, className, ...props }, ref) => {
    const v = variant ?? "primary";
    const s = size ?? "default";
    const slotted = useUnwrappedLazy(asChild ? children : null);
    const child =
      asChild && React.isValidElement<ChildProps>(slotted) ? slotted : null;
    if (asChild && !child)
      throw new Error("TextureButton asChild expects one React element");
    const inert =
      Boolean(props.disabled) ||
      isAriaDisabled(props["aria-disabled"]) ||
      isAriaDisabled(child?.props["aria-disabled"]);
    const rootProps = {
      ...props,
      "data-slot": "texture-button",
      "data-variant": v,
      "data-size": s,
      className: cn(textureButtonVariants({ variant: v, size: s }), className),
    };
    const innerClassName = cn(
      textureButtonInnerVariants({ variant: v, size: s }),
      !inert && textureButtonInteractiveVariants({ variant: v }),
    );

    if (child) {
      // `disabled` is not valid on <a>; expose it as aria-disabled instead and
      // drop every click handler so nothing runs for an inert link.
      const { disabled, onClick, ...slotProps } = rootProps;
      void disabled;
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          {...slotProps}
          onClick={inert ? undefined : onClick}
        >
          {React.cloneElement(
            child,
            inert
              ? { "aria-disabled": "true", onClick: preventActivation }
              : undefined,
            <span className={innerClassName}>{child.props.children}</span>,
          )}
        </Slot>
      );
    }

    return (
      <button ref={ref} {...rootProps}>
        <span className={innerClassName}>{children}</span>
      </button>
    );
  },
);
TextureButton.displayName = "TextureButton";

export { TextureButton, textureButtonVariants };
