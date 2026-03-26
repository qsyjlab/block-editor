import { icons } from "../toolbar/icons";

export interface DialogOptions {
  title: string;
  subtitle?: string;
  icon?: string;
  iconBgClass?: string;
  width?: string;
  closeAriaLabel?: string;
  host?: HTMLElement | null;
  onClose: () => void;
}

function resolveOverlayHost(source?: HTMLElement | null): HTMLElement {
  if (source) {
    const host =
      (source.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (source.closest('[data-be-ui-root="true"]') as HTMLElement | null);
    if (host) return host;
  }

  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const host =
      (active.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (active.closest('[data-be-ui-root="true"]') as HTMLElement | null);
    if (host) return host;
  }

  const globalHost =
    (document.querySelector('[data-be-overlay-container="true"]') as HTMLElement | null) ||
    (document.querySelector('[data-be-ui-root="true"]') as HTMLElement | null);

  return globalHost || document.body;
}

export class Dialog {
  private overlay: HTMLElement;
  private container: HTMLElement;
  private contentContainer: HTMLElement;
  private options: DialogOptions;

  constructor(options: DialogOptions) {
    this.options = options;

    this.overlay = document.createElement("div");
    this.overlay.className = "be-dialog-overlay";
    this.overlay.setAttribute("role", "presentation");
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.close();
    };

    this.container = document.createElement("div");
    this.container.className = "be-dialog";
    this.container.style.width = options.width || "520px";
    this.container.setAttribute("role", "dialog");
    this.container.setAttribute("aria-modal", "true");
    this.container.setAttribute("aria-labelledby", "be-dialog-title");

    this.overlay.appendChild(this.container);

    this.renderHeader();

    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "be-flex-1 be-overflow-y-auto";
    this.container.appendChild(this.contentContainer);
  }

  private renderHeader() {
    const header = document.createElement("div");
    header.className = "be-dialog-header";

    const left = document.createElement("div");
    left.className = "be-dialog-header-left";

    if (this.options.icon && icons[this.options.icon]) {
      const iconBox = document.createElement("div");
      iconBox.className = `be-dialog-icon ${this.options.iconBgClass || ""}`.trim();
      iconBox.innerHTML = icons[this.options.icon];

      const svg = iconBox.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.style.color = "var(--btn-active-color)";
      }

      left.appendChild(iconBox);
    }

    const titles = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.id = "be-dialog-title";
    h3.className = "be-dialog-title";
    h3.textContent = this.options.title;
    titles.appendChild(h3);

    if (this.options.subtitle) {
      const p = document.createElement("p");
      p.className = "be-dialog-subtitle";
      p.textContent = this.options.subtitle;
      titles.appendChild(p);
    }
    left.appendChild(titles);
    header.appendChild(left);

    const closeBtn = document.createElement("button");
    closeBtn.className = "be-dialog-close";
    closeBtn.style.width = "32px";
    closeBtn.style.height = "32px";
    closeBtn.style.padding = "0";
    closeBtn.style.lineHeight = "0";
    closeBtn.setAttribute("aria-label", this.options.closeAriaLabel || "Close dialog");
    closeBtn.innerHTML = icons.close || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const closeSvg = closeBtn.querySelector("svg") as SVGElement | null;
    if (closeSvg) {
      closeSvg.setAttribute("width", "16");
      closeSvg.setAttribute("height", "16");
      closeSvg.style.display = "block";
    }
    closeBtn.onclick = () => this.close();
    header.appendChild(closeBtn);

    this.container.appendChild(header);
  }

  public setContent(element: HTMLElement) {
    this.contentContainer.innerHTML = "";
    this.contentContainer.appendChild(element);
  }

  public appendFooter(element: HTMLElement) {
    element.classList.add("be-dialog-footer");
    this.container.appendChild(element);
  }

  public show() {
    resolveOverlayHost(this.options.host).appendChild(this.overlay);
  }

  public close() {
    this.options.onClose();
    this.destroy();
  }

  public destroy() {
    this.overlay.remove();
  }
}
