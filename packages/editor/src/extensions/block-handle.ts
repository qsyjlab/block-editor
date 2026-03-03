import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

export interface BlockHandleOptions {
  width: number;
}

export const BlockHandle = Extension.create<BlockHandleOptions>({
  name: "blockHandle",

  addOptions() {
    return {
      width: 24,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockHandle"),
        view: (editorView) =>
          new BlockHandleView(editorView, this.options.width, this.editor),
      }),
    ];
  },
});

class BlockHandleView {
  private editorView: EditorView;
  private element: HTMLElement;
  private menu: HTMLElement;
  private currentBlockPos: number | null = null;
  private editor: any; // Tiptap editor instance
  private hideTimer: any = null;

  constructor(editorView: EditorView, _width: number, editor: any) {
    this.editorView = editorView;
    this.editor = editor;

    // Create Handle Element
    this.element = document.createElement("div");
    this.element.className = "be-block-handle";
    this.element.style.position = "absolute";
    this.element.style.display = "none";
    this.element.style.alignItems = "center";
    this.element.style.justifyContent = "center";
    this.element.style.width = "24px";
    this.element.style.height = "24px";
    this.element.style.cursor = "grab";
    this.element.style.borderRadius = "4px";
    this.element.style.backgroundColor = "transparent";
    this.element.style.transition = "opacity 0.2s, background-color 0.2s";
    this.element.style.zIndex = "50";

    // Hover effect
    this.element.addEventListener("mouseenter", () => {
      this.element.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
      this.cancelHide();
    });
    this.element.addEventListener("mouseleave", () => {
      this.element.style.backgroundColor = "transparent";
      this.scheduleHide();
    });

    // Drag Handle Icon (6 dots)
    this.element.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; color: #9ca3af;">
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
    `;

    // Create Menu Element
    this.menu = document.createElement("div");
    this.menu.className = "be-block-handle-menu";
    this.menu.style.display = "none";
    this.menu.style.position = "absolute"; // Fixed or absolute? Fixed is safer for menus usually, but absolute works if parent is relative
    this.menu.style.zIndex = "9999";
    this.menu.style.backgroundColor = "white";
    this.menu.style.borderRadius = "6px";
    this.menu.style.boxShadow =
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)";
    this.menu.style.padding = "4px";
    this.menu.style.minWidth = "160px";
    this.menu.style.flexDirection = "column";
    this.menu.style.gap = "2px";

    // Add menu items
    this.renderMenu();

    document.body.appendChild(this.menu);

    // Event Listeners
    this.element.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent focus loss
      e.stopPropagation();
      this.toggleMenu();
    });

    window.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("click", this.handleGlobalClick);

    // Handle scrolling
    // We need to update position on scroll if we use absolute positioning relative to a parent that scrolls?
    // Or if the parent is the body.
    // Usually Tiptap editors are in a scrollable container.
    // We should listen to scroll events on the editor's scroll parent.
    // For now, let's assume mousemove handles most updates, but scroll might leave handle behind.
    document.addEventListener("scroll", this.handleScroll, true);
  }

  renderMenu() {
    const items = [
      {
        label: "Delete",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
        action: () => this.deleteBlock(),
        danger: true,
      },
      {
        label: "Duplicate",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        action: () => this.duplicateBlock(),
      },
      // Simple "Turn into" placeholders
      {
        label: "Turn into H1",
        icon: "H1",
        action: () => this.runCommand("toggleHeading", { level: 1 }),
      },
      {
        label: "Turn into H2",
        icon: "H2",
        action: () => this.runCommand("toggleHeading", { level: 2 }),
      },
      {
        label: "Turn into H3",
        icon: "H3",
        action: () => this.runCommand("toggleHeading", { level: 3 }),
      },
      {
        label: "Turn into List",
        icon: "•",
        action: () => this.runCommand("toggleBulletList"),
      },
    ];

    this.menu.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.gap = "8px";
      btn.style.width = "100%";
      btn.style.padding = "6px 8px";
      btn.style.fontSize = "13px";
      btn.style.textAlign = "left";
      btn.style.borderRadius = "4px";
      btn.style.border = "none";
      btn.style.backgroundColor = "transparent";
      btn.style.cursor = "pointer";
      btn.style.color = item.danger ? "#ef4444" : "#374151";

      btn.innerHTML = `
            <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; color: #9ca3af;">${item.icon}</span>
            <span>${item.label}</span>
          `;

      btn.onmouseenter = () => {
        btn.style.backgroundColor = item.danger ? "#fef2f2" : "#f3f4f6";
      };
      btn.onmouseleave = () => {
        btn.style.backgroundColor = "transparent";
      };

      btn.onclick = (e) => {
        e.stopPropagation();
        this.hideMenu();
        item.action();
      };
      this.menu.appendChild(btn);
    });
  }

  runCommand(name: string, attrs?: any) {
    if (this.currentBlockPos === null) return;

    const chain = this.editor.chain().focus();
    // Ensure we select the block first
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos);
    if (node) {
      // Just setting selection might be enough
      // We use setNodeSelection if possible, or text selection
      // But for "toggleHeading", it works on current selection.
      // Let's select the block content.
      const selection = this.editorView.state.selection.constructor.near(
        this.editorView.state.doc.resolve(this.currentBlockPos + 1),
      );
      this.editorView.dispatch(
        this.editorView.state.tr.setSelection(selection),
      );

      chain[name](attrs).run();
    }
  }

  deleteBlock() {
    if (this.currentBlockPos === null) return;
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos);
    if (node) {
      this.editor
        .chain()
        .deleteRange({
          from: this.currentBlockPos,
          to: this.currentBlockPos + node.nodeSize,
        })
        .run();
    }
  }

  duplicateBlock() {
    if (this.currentBlockPos === null) return;
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos);
    if (node) {
      // Get JSON of the node
      const json = node.toJSON();
      // Insert after
      this.editor
        .chain()
        .insertContentAt(this.currentBlockPos + node.nodeSize, json)
        .run();
    }
  }

  update() {
    const dom = this.editorView.dom as HTMLElement;
    const container = dom.closest(".editor-container") as HTMLElement;

    if (container && this.element.parentNode !== container) {
      if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
      }
      container.appendChild(this.element);
    }
  }

  handleGlobalClick = (e: MouseEvent) => {
    if (
      !this.menu.contains(e.target as Node) &&
      !this.element.contains(e.target as Node)
    ) {
      this.hideMenu();
    }
  };

  handleScroll = () => {
    if (this.menu.style.display === "flex") {
      this.hideMenu();
    }
    // Optional: re-check handle position or hide it
    // this.scheduleHide()
  };

  scheduleHide() {
    this.hideTimer = setTimeout(() => {
      if (this.menu.style.display !== "flex") {
        this.element.style.opacity = "0";
        this.element.style.pointerEvents = "none";
      }
    }, 200);
  }

  cancelHide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.element.style.opacity = "1";
    this.element.style.pointerEvents = "auto";
  }

  handleMouseMove = (event: MouseEvent) => {
    this.update();

    if (this.menu.style.display === "flex") return;

    const parent = this.editorView.dom.parentNode as HTMLElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const { clientX, clientY } = event;

    // Check if mouse is near the editor (including gutter)
    const buffer = 50;
    if (
      clientX < parentRect.left - buffer ||
      clientX > parentRect.right + buffer ||
      clientY < parentRect.top - buffer ||
      clientY > parentRect.bottom + buffer
    ) {
      this.scheduleHide();
      return;
    }

    // Don't update if hovering the handle itself
    if (this.element.contains(event.target as Node)) {
      this.cancelHide();
      return;
    }

    const pos = this.editorView.posAtCoords({ left: clientX, top: clientY });
    if (!pos) return;

    const resolvedPos = this.editorView.state.doc.resolve(pos.pos);

    // Find the direct child of doc (block)
    let depth = resolvedPos.depth;
    while (depth > 0) {
      const parent = resolvedPos.node(depth);
      if (parent.type.name === "doc") {
        break;
      }
      depth--;
    }

    // Usually depth 1 is the block level
    if (resolvedPos.depth >= 1) {
      const blockPos = resolvedPos.before(1);
      const blockNode = resolvedPos.node(1);

      if (blockNode) {
        this.currentBlockPos = blockPos;
        this.showHandle(blockPos, blockNode);
        this.cancelHide();
      }
    }
  };

  showHandle(pos: number, node: any) {
    const isEmpty = node.content.size === 0;
    const alignPos = isEmpty ? pos : pos + 1;

    const coords = this.editorView.coordsAtPos(alignPos);
    if (!coords) return;

    const dom = this.editorView.dom as HTMLElement;
    const container = dom.closest(".editor-container") as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const lineHeight = coords.bottom - coords.top;
    const handleHeight = 24;
    const topOffset = (lineHeight - handleHeight) / 2;

    // Position relative to container (editor-container)
    const top = coords.top - containerRect.top;
    const left = coords.left - containerRect.left - 28; // 24px width + 4px gap

    this.element.style.top = `${top + topOffset}px`;
    this.element.style.left = `${left}px`;
    this.element.style.display = "flex";
  }

  toggleMenu() {
    if (this.menu.style.display === "none") {
      const rect = this.element.getBoundingClientRect();
      this.menu.style.display = "flex";
      this.menu.style.top = `${rect.bottom + 4}px`;
      this.menu.style.left = `${rect.left}px`;
    } else {
      this.hideMenu();
    }
  }

  hideMenu() {
    this.menu.style.display = "none";
  }

  destroy() {
    this.element.remove();
    this.menu.remove();
    window.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("click", this.handleGlobalClick);
    document.removeEventListener("scroll", this.handleScroll, true);
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }
}
