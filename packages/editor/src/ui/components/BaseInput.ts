import { icons } from "../toolbar/icons";

export interface BaseInputOptions {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  icon?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  onChange?: (value: string) => void;
}

export interface BaseInputResult {
  container: HTMLElement;
  control: HTMLInputElement | HTMLTextAreaElement;
}

export function createBaseInput(options: BaseInputOptions): BaseInputResult {
  const container = document.createElement("div");
  container.className = ["be-input-group", options.className || ""]
    .filter(Boolean)
    .join(" ");

  if (options.label) {
    const label = document.createElement("label");
    label.className = "be-input-label";
    label.innerHTML = options.label;
    container.appendChild(label);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "be-input-wrapper";

  const control = options.multiline
    ? document.createElement("textarea")
    : document.createElement("input");

  if (options.multiline) {
    const textarea = control as HTMLTextAreaElement;
    textarea.rows = options.rows || 2;
    textarea.className = "be-input-control be-input-control--textarea";
  } else {
    const input = control as HTMLInputElement;
    input.type = options.type || "text";
    input.className = "be-input-control";
  }

  control.value = options.value || "";
  control.placeholder = options.placeholder || "";
  if (options.ariaLabel) {
    control.setAttribute("aria-label", options.ariaLabel);
  }
  control.style.fontFamily = "inherit";

  if (options.icon && icons[options.icon]) {
    wrapper.classList.add("has-icon");
    const icon = document.createElement("span");
    icon.className = "be-input-icon";
    icon.innerHTML = icons[options.icon];
    const svg = icon.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "16");
    }
    wrapper.appendChild(icon);
  }

  control.addEventListener("input", (event) => {
    options.onChange?.((event.target as HTMLInputElement).value);
  });

  wrapper.appendChild(control);
  container.appendChild(wrapper);

  if (options.autoFocus) {
    setTimeout(() => control.focus(), 50);
  }

  return { container, control };
}
