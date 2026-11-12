import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  TextureButton,
  type TextureButtonProps,
} from "../../src/components/ui/texture-button";

const variants: NonNullable<TextureButtonProps["variant"]>[] = [
  "primary",
  "glass",
  "secondary",
  "accent",
  "danger-soft",
  "destructive",
  "minimal",
  "icon",
];

function render(props: TextureButtonProps) {
  return renderToStaticMarkup(createElement(TextureButton, props));
}

type Handler = (event: unknown) => void;
type Tree = ReactElement<{
  onClick?: Handler;
  "aria-disabled"?: string;
  children: ReactElement<{ onClick?: Handler; "aria-disabled"?: string }>;
}>;
// Calls the forwardRef render function to inspect the Slot and cloned child.
function tree(props: TextureButtonProps) {
  const inner = TextureButton as unknown as {
    render: (props: TextureButtonProps, ref: null) => Tree;
  };
  const slot = inner.render(props, null);
  return { slot, child: slot.props.children };
}
function click(handler: Handler | undefined) {
  const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  handler?.(event);
  return event;
}

describe("TextureButton", () => {
  it.each(variants)("renders the %s variant marker", (variant) => {
    const html = render({ variant, children: "Go" });
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(`--tb-${variant}`);
  });

  it("defaults to primary/default and keeps form semantics", () => {
    const html = render({ children: "Go" });
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('data-size="default"');
    expect(html).not.toContain("type=");
  });

  it("renders a button with an inline span layer and no div", () => {
    const html = render({ variant: "glass", size: "lg", children: "Go" });
    expect(html.startsWith("<button")).toBe(true);
    expect(html).toMatch(
      /<button[^>]*><span class="[^"]+">Go<\/span><\/button>/,
    );
    expect(html).not.toContain("<div");
  });

  it("moves button classes onto the single child link with asChild", () => {
    const html = render({
      asChild: true,
      variant: "danger-soft",
      className: "custom-place",
      children: createElement("a", { href: "/x", className: "own" }, "Go"),
    });
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<div");
    const open = html.match(/^<a\b[^>]*>/)?.[0] ?? "";
    expect(open).toContain('href="/x"');
    expect(open).toContain('data-variant="danger-soft"');
    expect(open).toContain("custom-place");
    expect(open).toContain("own");
    expect(open).toContain("border-[color:var(--tb-danger-soft-border)]");
    expect(html).toMatch(/<a\b[^>]*><span class="[^"]+">Go<\/span><\/a>$/);
  });

  it("drops hover and active styles when disabled or aria-disabled", () => {
    const enabled = render({ children: "Go" });
    const disabled = render({ disabled: true, children: "Go" });
    const link = render({
      asChild: true,
      children: createElement("a", { "aria-disabled": "true" }, "Go"),
    });
    expect(enabled).toContain("group-hover/tb:");
    expect(disabled).toContain("disabled");
    expect(disabled).not.toContain("group-hover/tb:");
    expect(disabled).not.toContain("group-active/tb:");
    expect(link).toContain('aria-disabled="true"');
    expect(link).not.toContain("group-hover/tb:");
    expect(link).toContain("aria-disabled:pointer-events-none");
  });

  it("uses only tokens in its source", () => {
    const source = readFileSync("src/components/ui/texture-button.tsx", "utf8");
    expect(source).not.toMatch(
      /\b(bg|from|to|via|text|border|outline|ring|shadow)-(indigo|red|neutral|stone|black|white|gray|slate|zinc)\b/,
    );
    expect(source).not.toContain("dark:");
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).toContain("focus-visible:outline-[color:var(--tb-focus)]");
    expect(source).toContain("motion-reduce:transition-none");
  });

  it("turns disabled into aria-disabled on asChild links", () => {
    const html = render({
      asChild: true,
      disabled: true,
      children: createElement("a", { href: "/x" }, "Go"),
    });
    const open = html.match(/^<a\b[^>]*>/)?.[0] ?? "";
    expect(open).toContain('aria-disabled="true"');
    expect(open).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(open).toContain('href="/x"');
    expect(open).not.toContain("tabindex");
  });

  it.each([
    ["disabled", { disabled: true }, {}],
    ["aria-disabled on the button", { "aria-disabled": true }, {}],
    ["aria-disabled on the child", {}, { "aria-disabled": "true" }],
  ] as const)(
    "blocks activation of a link that is %s",
    (_name, buttonProps, childProps) => {
      const own = vi.fn();
      const outer = vi.fn();
      const { slot, child } = tree({
        asChild: true,
        onClick: outer,
        ...buttonProps,
        children: createElement(
          "a",
          { href: "/x", onClick: own, ...childProps },
          "Go",
        ),
      });
      expect(slot.props.onClick).toBeUndefined();
      expect(child.props["aria-disabled"]).toBe("true");
      const event = click(child.props.onClick);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(own).not.toHaveBeenCalled();
      expect(outer).not.toHaveBeenCalled();
    },
  );

  it("forces aria-disabled when the button is disabled but the child says false", () => {
    const { child } = tree({
      asChild: true,
      disabled: true,
      children: createElement("a", { href: "/x", "aria-disabled": "false" }),
    });
    expect(child.props["aria-disabled"]).toBe("true");
  });

  it("keeps click handlers on enabled links", () => {
    const own = vi.fn();
    const outer = vi.fn();
    const { slot, child } = tree({
      asChild: true,
      onClick: outer,
      children: createElement("a", { href: "/x", onClick: own }, "Go"),
    });
    expect(child.props.onClick).toBe(own);
    expect(slot.props.onClick).toBe(outer);
    const event = click(child.props.onClick);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(own).toHaveBeenCalledTimes(1);
  });

  it("does not transition the focus outline", () => {
    const html = render({ children: "Go" });
    const classes = html.match(/class="([^"]+)"/g)!.join(" ");
    expect(classes).not.toMatch(/(^|[\s"])transition(\s|")/);
    expect(classes).toContain("transition-[color,");
    expect(classes).not.toContain("outline-color");
  });
});
