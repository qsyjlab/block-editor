import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";

export class GlobalTooltip {
  private tooltip: HTMLElement;
  private arrowElement: HTMLElement;
  private cleanup: (() => void) | null = null;
  private host: HTMLElement | null = null;

  constructor() {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "global-tooltip";
    this.arrowElement = document.createElement("div");
    this.arrowElement.className = "tooltip-arrow";
    this.tooltip.appendChild(this.arrowElement);
  }

  private syncTheme(target?: HTMLElement) {
    const source =
      (target?.closest("[data-be-theme]") as HTMLElement | null) ||
      (document.querySelector("[data-be-theme]") as HTMLElement | null);
    const theme = source?.dataset.beTheme;
    if (theme) {
      this.tooltip.dataset.beTheme = theme;
      return;
    }
    delete this.tooltip.dataset.beTheme;
  }

  private ensureHost(target?: HTMLElement) {
    const nextHost = document.body;
    this.syncTheme(target);

    if (this.host === nextHost && this.tooltip.parentElement === nextHost) return;
    this.host = nextHost;
    this.host.appendChild(this.tooltip);
  }

  public show(target: HTMLElement, text: string, shortcut?: string | null) {
    this.ensureHost(target);
    this.tooltip.innerHTML = "";

    const content = document.createElement("div");
    content.className = "tooltip-content";

    const textSpan = document.createElement("span");
    textSpan.className = "tooltip-text";
    textSpan.textContent = text;
    content.appendChild(textSpan);

    if (shortcut) {
      const shortcutSpan = document.createElement("span");
      shortcutSpan.className = "tooltip-shortcut";
      shortcutSpan.textContent = shortcut;
      content.appendChild(shortcutSpan);
    }

    this.tooltip.appendChild(content);
    this.tooltip.appendChild(this.arrowElement);
    this.tooltip.style.display = "block";
    this.tooltip.style.position = "fixed";
    this.tooltip.style.top = "0";
    this.tooltip.style.left = "0";
    this.tooltip.style.zIndex = "200000";
    this.tooltip.style.visibility = "hidden";

    if (this.cleanup) this.cleanup();
    this.cleanup = autoUpdate(target, this.tooltip, () => {
      if (!target.isConnected) {
        this.hide();
        return;
      }

      computePosition(target, this.tooltip, {
        placement: "top",
        strategy: "fixed",
        middleware: [
          offset(6),
          flip(),
          shift({ padding: 5 }),
          arrow({ element: this.arrowElement }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        Object.assign(this.tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
          visibility: "visible",
        });

        const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
        const staticSide = {
          top: "bottom",
          right: "left",
          bottom: "top",
          left: "right",
        }[placement.split("-")[0]];

        Object.assign(this.arrowElement.style, {
          left: arrowX != null ? `${arrowX}px` : "",
          top: arrowY != null ? `${arrowY}px` : "",
          right: "",
          bottom: "",
          [staticSide!]: "-4px",
        });

        this.tooltip.classList.add("visible");
      });
    });
  }

  public hide() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.tooltip.classList.remove("visible");
    this.tooltip.style.display = "none";
    this.tooltip.style.visibility = "hidden";
  }
}
