import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

/** Simple throttle: fire at most once per `ms` milliseconds */
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return function (this: any, ...args: any[]) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  } as T;
}

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
    this.element.setAttribute("role", "button");
    this.element.setAttribute("aria-label", "块操作（点击打开菜单，Shift+点击多选）");
    this.element.setAttribute("aria-haspopup", "menu");
    this.element.setAttribute("tabindex", "0");
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
    this.menu.setAttribute("role", "menu");
    this.menu.setAttribute("aria-label", "块操作菜单");
    Object.assign(this.menu.style, {
      display: "none",
      position: "fixed",
      zIndex: "9999",
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08), 0 10px 24px -4px rgba(0,0,0,0.12)",
      padding: "4px",
      minWidth: "192px",
      flexDirection: "column",
    });

    // Add menu items
    this.renderMenu();

    document.body.appendChild(this.menu);

    // Event Listeners
    this.element.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent focus loss
      e.stopPropagation();

      if (e.shiftKey && this.currentBlockPos !== null) {
        // Shift+click: toggle block into multi-selection
        this.editor.commands.toggleBlockSelection(this.currentBlockPos);
        return;
      }

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
    const ICON = {
      arrowUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
      arrowDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
      copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    };

    const items: {label: string; icon: string; action: () => void; danger?: boolean; divider?: boolean}[] = [
      {
        label: "上移一块",
        icon: ICON.arrowUp,
        action: () => this.moveBlock(-1),
      },
      {
        label: "下移一块",
        icon: ICON.arrowDown,
        action: () => this.moveBlock(1),
      },
      {
        label: "复制块",
        icon: ICON.copy,
        action: () => this.duplicateBlock(),
      },
      {
        label: "复制块链接",
        icon: ICON.link,
        action: () => this.copyBlockLink(),
      },
      {
        label: "删除块",
        icon: ICON.trash,
        action: () => this.deleteBlock(),
        danger: true,
        divider: true,
      },
      {
        label: "转为正文",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>',
        action: () => this.runCommand("setParagraph"),
      },
      {
        label: "转为 H1",
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H1</span>',
        action: () => this.runCommand("toggleHeading", { level: 1 }),
      },
      {
        label: "转为 H2",
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H2</span>',
        action: () => this.runCommand("toggleHeading", { level: 2 }),
      },
      {
        label: "转为 H3",
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H3</span>',
        action: () => this.runCommand("toggleHeading", { level: 3 }),
      },
      {
        label: "转为无序列表",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>',
        action: () => this.runCommand("toggleBulletList"),
      },
      {
        label: "转为有序列表",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
        action: () => this.runCommand("toggleOrderedList"),
      },
      {
        label: "转为任务列表",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>',
        action: () => this.runCommand("toggleTaskList"),
      },
      {
        label: "转为引用",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
        action: () => this.runCommand("toggleBlockquote"),
      },
      {
        label: "添加到多选",
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        action: () => {
          if (this.currentBlockPos !== null) {
            this.editor.commands.toggleBlockSelection(this.currentBlockPos);
          }
        },
        divider: true,
      },
    ];

    this.menu.innerHTML = "";
    items.forEach((item) => {
      if (item.divider) {
        const hr = document.createElement("hr");
        hr.style.cssText = "margin:4px 0;border:none;border-top:1px solid #f0f0f0;";
        this.menu.appendChild(hr);
      }

      const btn = document.createElement("button");
      const dangerColor = "#ef4444";
      const normalColor = "#374151";
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-label", item.label);
      btn.style.cssText = `
        display:flex;align-items:center;gap:8px;width:100%;
        padding:6px 8px;font-size:13px;line-height:1.4;text-align:left;
        border:none;border-radius:5px;background:transparent;
        color:${item.danger ? dangerColor : normalColor};
        cursor:pointer;transition:background 0.1s;white-space:nowrap;
        font-family:inherit;
      `.replace(/\s+/g, " ").trim();

      btn.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;color:#9ca3af;">${item.icon}</span>
        <span>${item.label}</span>
      `;

      btn.addEventListener("mouseenter", () => {
        btn.style.background = item.danger ? "#fef2f2" : "#f3f4f6";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "transparent";
      });

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
      const selection = TextSelection.near(
        this.editorView.state.doc.resolve(this.currentBlockPos + 1),
      );
      this.editorView.dispatch(
        this.editorView.state.tr.setSelection(selection),
      );

      chain[name](attrs).run();
    }
  }

  moveBlock(direction: 1 | -1) {
    if (this.currentBlockPos === null) return;
    const { doc } = this.editorView.state;
    const node = doc.nodeAt(this.currentBlockPos);
    if (!node) return;

    const nodeSize = node.nodeSize;
    const nodeEnd = this.currentBlockPos + nodeSize;

    if (direction === -1) {
      // Move up: swap with previous sibling
      if (this.currentBlockPos === 0) return;
      const resolvedPrev = doc.resolve(this.currentBlockPos - 1);
      if (resolvedPrev.depth < 1) return;
      const prevBlockStart = resolvedPrev.before(1);
      const prevNode = doc.nodeAt(prevBlockStart);
      if (!prevNode) return;

      // Build fresh tr: replace the range [prevBlockStart, nodeEnd] with [thisNode, prevNode]
      const tr = this.editorView.state.tr;
      tr.replaceWith(prevBlockStart, nodeEnd, [node, prevNode]);
      this.editorView.dispatch(tr);
      this.currentBlockPos = prevBlockStart;
    } else {
      // Move down: swap with next sibling
      const nextPos = nodeEnd;
      if (nextPos >= doc.content.size) return;
      const nextNode = doc.nodeAt(nextPos);
      if (!nextNode) return;

      const tr = this.editorView.state.tr;
      tr.replaceWith(this.currentBlockPos, nodeEnd + nextNode.nodeSize, [nextNode, node]);
      this.editorView.dispatch(tr);
      this.currentBlockPos = this.currentBlockPos + nextNode.nodeSize;
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
      const json = node.toJSON() as any;
      if (json?.attrs?.blockId) {
        json.attrs = { ...json.attrs };
        delete json.attrs.blockId;
      }
      // Insert after
      this.editor
        .chain()
        .insertContentAt(this.currentBlockPos + node.nodeSize, json)
        .run();
    }
  }

  private createBlockId() {
    return `be-block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private ensureCurrentBlockId() {
    if (this.currentBlockPos === null) return null;

    const { state } = this.editorView;
    const node = state.doc.nodeAt(this.currentBlockPos);
    if (!node) return null;

    const existingId = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : "";
    if (existingId) return existingId;

    const blockId = this.createBlockId();
    const tr = state.tr.setNodeMarkup(
      this.currentBlockPos,
      undefined,
      { ...node.attrs, blockId },
      node.marks,
    );
    this.editorView.dispatch(tr);
    return blockId;
  }

  private fallbackCopy(text: string) {
    window.prompt("复制块链接", text);
  }

  copyBlockLink() {
    const blockId = this.ensureCurrentBlockId();
    if (!blockId) return;

    const url = new URL(window.location.href);
    url.hash = blockId;
    const text = url.toString();

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
      return;
    }

    this.fallbackCopy(text);
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

  handleMouseMove = throttle((event: MouseEvent) => {
    // throttled at 16ms (~60fps)
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
  }, 16);

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
      this.editor.commands.setBlockMenuOpen(true);
      this.editor.commands.setInteractionMode("block-selection");
    } else {
      this.hideMenu();
    }
  }

  hideMenu() {
    if (this.menu.style.display === "none") return;

    this.menu.style.display = "none";
    this.editor.commands.setBlockMenuOpen(false);

    if (this.editor.isActive("table")) {
      this.editor.commands.setInteractionMode("table-editing");
      return;
    }

    const mode = this.editor.state.selection.empty ? "idle" : "text-selection";
    this.editor.commands.setInteractionMode(mode);
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
