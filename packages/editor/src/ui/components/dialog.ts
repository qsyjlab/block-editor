import { icons } from "../toolbar/icons";

export interface DialogOptions {
  title: string;
  subtitle?: string;
  icon?: string;
  iconBgClass?: string;
  width?: string;
  onClose: () => void;
}

export class Dialog {
  private overlay: HTMLElement;
  private container: HTMLElement;
  private contentContainer: HTMLElement;
  private options: DialogOptions;

  constructor(options: DialogOptions) {
    this.options = options;

    this.overlay = document.createElement("div");
    this.overlay.className =
      "be-fixed be-inset-0 be-bg-black/50 be-backdrop-blur-sm be-z-[9999] be-flex be-items-center be-justify-center";
    this.overlay.setAttribute("role", "presentation");
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.close();
    };

    this.container = document.createElement("div");
    this.container.className =
      "be-bg-white be-rounded-2xl be-shadow-2xl be-border be-border-gray-200 be-p-6 be-max-h-[90vh] be-flex be-flex-col be-relative";
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
    header.className =
      "be-flex be-items-start be-justify-between be-mb-6 be-shrink-0";

    const left = document.createElement("div");
    left.className = "be-flex be-items-center be-gap-3";

    if (this.options.icon && icons[this.options.icon]) {
      const iconBox = document.createElement("div");
      iconBox.className = `be-p-2.5 be-rounded-xl be-flex be-items-center be-justify-center ${this.options.iconBgClass || "be-bg-gray-100"}`;
      iconBox.innerHTML = icons[this.options.icon];

      const svg = iconBox.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.style.color = "white";
      }

      left.appendChild(iconBox);
    }

    const titles = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.id = "be-dialog-title";
    h3.className = "be-font-semibold be-text-gray-900 be-text-lg be-m-0";
    h3.textContent = this.options.title;
    titles.appendChild(h3);

    if (this.options.subtitle) {
      const p = document.createElement("p");
      p.className = "be-text-xs be-text-gray-500 be-mt-0.5 be-m-0";
      p.textContent = this.options.subtitle;
      titles.appendChild(p);
    }
    left.appendChild(titles);
    header.appendChild(left);

    const closeBtn = document.createElement("button");
    closeBtn.className =
      "be-text-gray-400 be-hover:text-gray-600 be-rounded-lg be-transition-colors be-border-0 be-bg-transparent be-cursor-pointer be-flex be-items-center be-justify-center be-shrink-0";
    closeBtn.style.width = "32px";
    closeBtn.style.height = "32px";
    closeBtn.style.padding = "0";
    closeBtn.style.lineHeight = "0";
    closeBtn.setAttribute("aria-label", "关闭对话框");
    closeBtn.innerHTML = icons.close || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const closeSvg = closeBtn.querySelector("svg") as SVGElement | null;
    if (closeSvg) {
      closeSvg.setAttribute("width", "16");
      closeSvg.setAttribute("height", "16");
      closeSvg.style.display = "block";
    }
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#f3f4f6";
      closeBtn.style.color = "#374151";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "";
      closeBtn.style.color = "";
    });
    closeBtn.onclick = () => this.close();
    header.appendChild(closeBtn);

    this.container.appendChild(header);
  }

  public setContent(element: HTMLElement) {
    this.contentContainer.innerHTML = "";
    this.contentContainer.appendChild(element);
  }

  public appendFooter(element: HTMLElement) {
    this.container.appendChild(element);
  }

  public show() {
    document.body.appendChild(this.overlay);
  }

  public close() {
    this.options.onClose();
    this.destroy();
  }

  public destroy() {
    this.overlay.remove();
  }
}
