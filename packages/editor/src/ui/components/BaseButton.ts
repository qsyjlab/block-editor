export type BaseButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type BaseButtonSize = "xs" | "sm" | "md";

export interface BaseButtonOptions {
  label?: string;
  ariaLabel?: string;
  title?: string;
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
  pill?: boolean;
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
}

export function createBaseButton(options: BaseButtonOptions): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  if (options.label) btn.textContent = options.label;
  if (options.ariaLabel) btn.setAttribute("aria-label", options.ariaLabel);
  if (options.title) btn.title = options.title;

  const variant = options.variant || "secondary";
  const size = options.size || "sm";
  btn.className = [
    "be-btn",
    `be-btn--${variant}`,
    `be-btn--${size}`,
    options.pill ? "be-btn--pill" : "",
    options.iconOnly ? "be-btn--icon-only" : "",
    options.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (options.disabled) {
    btn.disabled = true;
  }

  return btn;
}
