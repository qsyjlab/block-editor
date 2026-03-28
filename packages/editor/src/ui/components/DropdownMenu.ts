export type DropdownMenuLayout = "list" | "row";

export interface DropdownMenuOptions {
  className?: string;
  role?: string;
  layout?: DropdownMenuLayout;
}

export interface DropdownItemOptions {
  label: string;
  iconHtml?: string;
  title?: string;
  tooltip?: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  role?: string;
  className?: string;
  onSelect?: (event: MouseEvent) => void;
}

export function createDropdownMenu(options: DropdownMenuOptions = {}): HTMLElement {
  const menu = document.createElement("div");
  menu.className = ["toolbar-dropdown-menu", options.className || ""]
    .filter(Boolean)
    .join(" ");
  menu.setAttribute("role", options.role || "listbox");
  menu.setAttribute("tabindex", "-1");
  menu.style.display = "none";

  if (options.layout === "row") {
    menu.style.flexDirection = "row";
    menu.style.padding = "4px";
    menu.style.gap = "4px";
  }

  const stopEvent = (event: Event) => event.stopPropagation();
  menu.addEventListener("mousedown", stopEvent);
  menu.addEventListener("click", stopEvent);
  menu.addEventListener("touchstart", stopEvent, { passive: true });

  return menu;
}

export function createDropdownItem(options: DropdownItemOptions): HTMLElement {
  const item = document.createElement("div");
  item.className = [
    "dropdown-item",
    options.className || "",
    options.active ? "active" : "",
    options.disabled ? "disabled" : "",
    options.danger ? "danger" : "",
  ]
    .filter(Boolean)
    .join(" ");

  item.setAttribute("role", options.role || "option");
  item.setAttribute("tabindex", "-1");
  item.setAttribute("aria-label", options.label);
  item.setAttribute("aria-selected", options.active ? "true" : "false");
  if (options.title) item.title = options.title;
  if (options.tooltip) item.dataset.tooltip = options.tooltip;
  if (options.disabled) {
    item.setAttribute("disabled", "true");
  }

  const content = document.createElement("div");
  content.style.cssText = "display:flex;align-items:center;gap:8px;";

  if (options.iconHtml) {
    const iconSpan = document.createElement("span");
    iconSpan.innerHTML = options.iconHtml;
    iconSpan.style.display = "flex";
    content.appendChild(iconSpan);
  }

  const textSpan = document.createElement("span");
  textSpan.textContent = options.label;
  content.appendChild(textSpan);
  item.appendChild(content);

  if (options.onSelect && !options.disabled) {
    item.addEventListener("click", (event) => options.onSelect?.(event));
  }

  return item;
}

export function getFocusableDropdownItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(
    menu.querySelectorAll<HTMLElement>(".dropdown-item:not([disabled])"),
  );
}

export function focusDropdownItem(menu: HTMLElement, index: number): number {
  const items = getFocusableDropdownItems(menu);
  items.forEach((item, itemIndex) => {
    item.classList.toggle("keyboard-focus", itemIndex === index);
  });
  items[index]?.scrollIntoView({ block: "nearest" });
  return index;
}
