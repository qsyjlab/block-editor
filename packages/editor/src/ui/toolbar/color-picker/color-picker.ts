import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
  hide,
} from "@floating-ui/dom";
import { EditorCore } from "../../../core/EditorCore";
import type { ColorPickerI18n } from "../../../i18n/types";
import { icons } from "../icons";
import { STANDARD_COLORS } from "./color-palette";
import { ColorSpectrum } from "./color-spectrum";

export class ColorPicker {
  private element: HTMLElement;
  private trigger!: HTMLElement;
  private dropdown!: HTMLElement;
  private editorCore: EditorCore;
  private label: string;
  private isOpen = false;
  private cleanupFloating: (() => void) | null = null;
  private spectrum: ColorSpectrum | null = null;
  private readonly i18n: ColorPickerI18n;
  private overlayHost: HTMLElement;

  constructor(label: string, editorCore: EditorCore) {
    this.label = label;
    this.editorCore = editorCore;
    this.i18n = this.editorCore.i18n.colorPicker;
    this.overlayHost = this.resolveOverlayHost();
    this.element = this.render();

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (this.isOpen) {
        if (
          !this.dropdown.contains(e.target as Node) &&
          !this.element.contains(e.target as Node)
        ) {
          this.close();
        }
      }
    });
  }

  private resolveOverlayHost(): HTMLElement {
    const editorRoot = this.editorCore.editor.options.element as HTMLElement;
    const host =
      (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null);
    return host || document.body;
  }

  getElement() {
    return this.element;
  }

  private render() {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    // Trigger
    this.trigger = document.createElement("div");
    this.trigger.className = "color-picker-trigger";
    this.trigger.dataset.tooltip = this.label;

    // Inner color box
    const colorBox = document.createElement("div");
    colorBox.className = "color-preview-box";

    // Palette icon
    const iconSpan = document.createElement("span");
    iconSpan.className = "color-picker-icon-lucide";
    iconSpan.innerHTML = icons.palette;

    this.trigger.appendChild(colorBox);
    this.trigger.appendChild(iconSpan);

    this.trigger.onclick = (e) => {
      e.stopPropagation();
      this.toggle();
    };

    // Dropdown
    this.dropdown = document.createElement("div");
    this.dropdown.className = "color-picker-dropdown";

    // Prevent dropdown from closing when clicking inside
    this.dropdown.onclick = (e) => {
      e.stopPropagation();
    };

    // 1. Standard Colors (No "No Color" in React code grid, but useful to keep if needed, but user said "copy style")
    // React code starts with "预设颜色"
    const paletteSection = document.createElement("div");
    paletteSection.className = "color-picker-section";
    const title = document.createElement("span");
    title.className = "color-picker-title";
    title.textContent = this.i18n.presetColors;
    paletteSection.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "color-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(5, 1fr)"; // 5 columns as per screenshot
    grid.style.gap = "8px";

    STANDARD_COLORS.forEach((color) => {
      const item = document.createElement("div");
      item.className = "color-item";
      item.style.backgroundColor = color;
      item.style.width = "32px";
      item.style.height = "32px";
      item.style.borderRadius = "6px";
      item.style.cursor = "pointer";
      item.style.border = "1px solid rgba(0,0,0,0.1)"; // subtle border for light colors
      item.dataset.value = color;
      item.title = color; // Add tooltip if needed, or color name map

      // Checkmark container
      const check = document.createElement("div");
      check.className = "color-check";
      check.innerHTML = icons.check;

      // Dynamic checkmark color logic based on React component logic
      // color: color.value === '#FFFFFF' || color.value === '#EAB308' ? '#000000' : '#FFFFFF'
      const isLight =
        color.toLowerCase() === "#ffffff" ||
        color.toLowerCase() === "#eab308" ||
        color.toLowerCase() === "#fadb14";
      check.style.color = isLight ? "#000000" : "#FFFFFF";

      item.appendChild(check);

      item.onclick = (e) => {
        e.stopPropagation();
        this.setColor(color);
      };
      grid.appendChild(item);
    });
    paletteSection.appendChild(grid);

    // 2. Custom Color (Match React style: "自定义颜色")
    const customSection = document.createElement("div");
    customSection.className = "color-picker-section";
    customSection.style.borderTop = "1px solid #e5e7eb"; // border-gray-200
    customSection.style.marginTop = "12px";
    customSection.style.paddingTop = "12px";

    const customTitle = document.createElement("span");
    customTitle.className = "color-picker-title";
    customTitle.textContent = this.i18n.customColor;
    customSection.appendChild(customTitle);

    // Input container
    const inputContainer = document.createElement("div");
    inputContainer.style.display = "flex";
    inputContainer.style.gap = "8px";

    // Color Input (hidden native input triggered by visible box)
    const colorInputWrapper = document.createElement("div");
    colorInputWrapper.className = "custom-color-wrapper";

    const nativeColorInput = document.createElement("input");
    nativeColorInput.type = "color";
    nativeColorInput.className = "native-color-input";

    colorInputWrapper.appendChild(nativeColorInput);
    inputContainer.appendChild(colorInputWrapper);

    // Text Input
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "custom-color-text-input";
    textInput.placeholder = "#000000";
    inputContainer.appendChild(textInput);

    // Sync logic
    nativeColorInput.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value;
      textInput.value = val;
      colorInputWrapper.style.backgroundColor = val;
      this.setColor(val, false); // Don't close
    };

    textInput.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        nativeColorInput.value = val;
        colorInputWrapper.style.backgroundColor = val;
        this.setColor(val, false);
      }
    };

    customSection.appendChild(inputContainer);

    this.dropdown.appendChild(paletteSection);
    this.dropdown.appendChild(customSection);

    wrapper.appendChild(this.trigger);

    return wrapper;
  }

  private toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  private open() {
    this.isOpen = true;
    this.trigger.classList.add("active");
    this.overlayHost.appendChild(this.dropdown);
    this.dropdown.classList.add("open");

    // Update active state
    const currentColor =
      this.editorCore.editor.getAttributes("textStyle").color;

    // Reset all active states
    const allItems = this.dropdown.querySelectorAll(".color-item");
    allItems.forEach((el) => el.classList.remove("active"));

    const noColorBtn = this.dropdown.querySelector(".color-action-item");
    if (noColorBtn) noColorBtn.classList.remove("active");

    if (currentColor) {
      // Find the color item
      const activeItem = Array.from(allItems).find(
        (el) =>
          (el as HTMLElement).dataset.value?.toLowerCase() ===
          currentColor.toLowerCase(),
      );
      if (activeItem) {
        activeItem.classList.add("active");
        // React design uses a specific border color for active item
        // borderColor: value === color.value ? '#3B82F6' : '#E5E7EB'
        (activeItem as HTMLElement).style.borderColor = "var(--color-blue-500)";
      }
    } else {
      // No color active
      if (noColorBtn) noColorBtn.classList.add("active");
    }

    this.cleanupFloating = autoUpdate(this.trigger, this.dropdown, () => {
      // Check if trigger is visible/attached
      if (!this.trigger.isConnected || this.trigger.offsetParent === null) {
        this.close();
        return;
      }

      computePosition(this.trigger, this.dropdown, {
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(4), flip(), shift({ padding: 5 }), hide()],
      }).then(({ x, y, middlewareData }) => {
        if (middlewareData.hide?.referenceHidden) {
          this.close();
          return;
        }

        Object.assign(this.dropdown.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: "fixed",
          zIndex: "9999", // Ensure it's on top
          width: "max-content", // Allow content to determine width or constrain it
          maxWidth: "320px", // Prevent it from getting too wide
        });
      });
    });
  }

  private close() {
    this.isOpen = false;
    this.trigger.classList.remove("active");
    this.dropdown.classList.remove("open");
    if (this.cleanupFloating) {
      this.cleanupFloating();
      this.cleanupFloating = null;
    }
    if (this.dropdown.parentElement === this.overlayHost) {
      this.overlayHost.removeChild(this.dropdown);
    }
    // Reset spectrum
    if (this.spectrum) {
      const container = this.dropdown.lastChild as HTMLElement;
      if (container.contains(this.spectrum.getElement())) {
        container.removeChild(this.spectrum.getElement());
        this.spectrum = null;
      }
    }
  }

  private setColor(color: string, close = true) {
    this.editorCore.editor.chain().focus().setColor(color).run();

    // Update preview
    const preview = this.trigger.querySelector(
      ".color-preview-box",
    ) as HTMLElement;
    if (preview) preview.style.backgroundColor = color;

    // Update text input
    const textInput = this.dropdown.querySelector(
      ".custom-color-text-input",
    ) as HTMLInputElement;
    if (textInput && textInput.value.toUpperCase() !== color.toUpperCase()) {
      textInput.value = color;
    }

    // Update color input preview
    const colorWrapper = this.dropdown.querySelector(
      ".custom-color-wrapper",
    ) as HTMLElement;
    if (colorWrapper) colorWrapper.style.backgroundColor = color;

    if (close) this.close();
  }

  //   private showSpectrum(container: HTMLElement) {
  //       if (this.spectrum) return // Already shown

  //       this.spectrum = new ColorSpectrum((color) => {
  //           this.editorCore.editor.chain().focus().setColor(color).run()
  //           const bar = this.trigger.querySelector('.color-picker-bar') as HTMLElement
  //           if (bar) bar.style.backgroundColor = color
  //       })
  //       container.appendChild(this.spectrum.getElement())
  //   }
}
