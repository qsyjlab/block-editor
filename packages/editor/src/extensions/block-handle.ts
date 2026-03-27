import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { resolveEditorI18n } from "../i18n";
import type { BlockHandleI18n } from "../i18n/types";
import { createDropdownItem } from "../ui/components/DropdownMenu";

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
  enabled: boolean;
  i18n: BlockHandleI18n;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockHandle: {
      setBlockHandleEnabled: (enabled: boolean) => ReturnType;
    };
  }
}

const DEFAULT_BLOCK_HANDLE_I18N: BlockHandleI18n =
  resolveEditorI18n("en-US").blockHandle;

export const BlockHandle = Extension.create<BlockHandleOptions>({
  name: "blockHandle",

  addOptions() {
    return {
      width: 24,
      enabled: true,
      i18n: DEFAULT_BLOCK_HANDLE_I18N,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    };
  },

  addCommands() {
    return {
      setBlockHandleEnabled:
        (enabled: boolean) =>
        () => {
          this.storage.enabled = enabled;
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockHandle"),
        view: (editorView) =>
          new BlockHandleView(
            editorView,
            this.options.width,
            this.editor,
            this.options.i18n,
          ),
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
  private menuHideTimer: number | null = null;
  private scrollTarget: HTMLElement | Document = document;
  private i18n: BlockHandleI18n;

  constructor(
    editorView: EditorView,
    _width: number,
    editor: any,
    i18n: BlockHandleI18n,
  ) {
    this.editorView = editorView;
    this.editor = editor;
    this.i18n = i18n;

    // Create Handle Element
    this.element = document.createElement("div");
    this.element.className = "be-block-handle";
    this.element.setAttribute("role", "button");
    this.element.setAttribute("aria-label", this.i18n.handleAriaLabel);
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
    this.element.style.color = "var(--text-muted)";
    this.element.style.transition = "opacity 0.2s, background-color 0.2s";
    this.element.style.zIndex = "50";

    // Hover effect
    this.element.addEventListener("mouseenter", () => {
      this.element.style.backgroundColor = "var(--surface-soft)";
      this.cancelHide();
    });
    this.element.addEventListener("mouseleave", () => {
      this.element.style.backgroundColor = "transparent";
      this.scheduleHide();
    });

    // Drag Handle Icon (6 dots)
    this.element.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; color: currentColor;">
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
    `;

    // Create Menu Element
    this.menu = document.createElement("div");
    this.menu.className = "be-block-handle-menu toolbar-dropdown-menu be-panel-card";
    this.menu.setAttribute("role", "menu");
    this.menu.setAttribute("aria-label", this.i18n.menuAriaLabel);
    Object.assign(this.menu.style, {
      display: "none",
      position: "fixed",
      zIndex: "9999",
      minWidth: "240px",
    });

    // Add menu items
    this.renderMenu();

    this.ensureMenuHost();

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

    this.scrollTarget = this.getScrollContainer() || document;
    if (this.scrollTarget === document) {
      document.addEventListener("scroll", this.handleScroll, true);
    } else {
      (this.scrollTarget as HTMLElement).addEventListener("scroll", this.handleScroll, {
        passive: true,
      });
    }
  }

  private getEditorContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement;
    return (
      (dom.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (dom.closest(".editor-container") as HTMLElement | null)
    );
  }

  private getOverlayContainer(): HTMLElement {
    const dom = this.editorView.dom as HTMLElement;
    const container =
      (dom.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (dom.closest('[data-be-ui-root="true"]') as HTMLElement | null);
    return container || document.body;
  }

  private ensureMenuHost() {
    const host = this.getOverlayContainer();
    if (this.menu.parentElement !== host) {
      host.appendChild(this.menu);
    }
  }

  private isEnabled() {
    return this.editor?.storage?.blockHandle?.enabled !== false;
  }

  private getScrollContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement;
    return (
      (dom.closest('[data-be-scroll-container="true"]') as HTMLElement | null) ||
      (dom.closest(".editor-scroll-area") as HTMLElement | null)
    );
  }

  private isCurrentBlockType(typeName: string) {
    if (this.currentBlockPos === null) return false;
    const { doc } = this.editorView.state;
    const resolved = doc.resolve(this.currentBlockPos);
    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
      if (resolved.node(depth).type.name === typeName) return true;
    }
    return false;
  }

  private isCurrentHeading(level: number) {
    if (this.currentBlockPos === null) return false;
    const { doc } = this.editorView.state;
    const node = doc.nodeAt(this.currentBlockPos);
    if (node?.type.name === "heading" && node.attrs?.level === level) return true;
    const resolved = doc.resolve(this.currentBlockPos);
    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
      const depthNode = resolved.node(depth);
      if (depthNode.type.name === "heading" && depthNode.attrs?.level === level) return true;
    }
    return false;
  }

  renderMenu() {
    const ICON = {
      arrowUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
      arrowDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
      copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    };

    const items: {
      label: string;
      icon: string;
      action: () => void;
      danger?: boolean;
      divider?: boolean;
      isActive?: () => boolean;
    }[] = [
      {
        label: this.i18n.moveUp,
        icon: ICON.arrowUp,
        action: () => this.moveBlock(-1),
      },
      {
        label: this.i18n.moveDown,
        icon: ICON.arrowDown,
        action: () => this.moveBlock(1),
      },
      {
        label: this.i18n.duplicateBlock,
        icon: ICON.copy,
        action: () => this.duplicateBlock(),
      },
      {
        label: this.i18n.copyBlockLink,
        icon: ICON.link,
        action: () => this.copyBlockLink(),
      },
      {
        label: this.i18n.deleteBlock,
        icon: ICON.trash,
        action: () => this.deleteBlock(),
        danger: true,
        divider: true,
      },
      {
        label: this.i18n.toParagraph,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>',
        action: () => this.runCommand("setParagraph"),
        isActive: () => {
          if (this.currentBlockPos === null) return false;
          const node = this.editorView.state.doc.nodeAt(this.currentBlockPos);
          return node?.type.name === "paragraph";
        },
      },
      {
        label: this.i18n.toHeading1,
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H1</span>',
        action: () => this.runCommand("toggleHeading", { level: 1 }),
        isActive: () => this.isCurrentHeading(1),
      },
      {
        label: this.i18n.toHeading2,
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H2</span>',
        action: () => this.runCommand("toggleHeading", { level: 2 }),
        isActive: () => this.isCurrentHeading(2),
      },
      {
        label: this.i18n.toHeading3,
        icon: '<span style="font-size:11px;font-weight:700;color:currentColor">H3</span>',
        action: () => this.runCommand("toggleHeading", { level: 3 }),
        isActive: () => this.isCurrentHeading(3),
      },
      {
        label: this.i18n.toBulletList,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>',
        action: () => this.runCommand("toggleBulletList"),
        isActive: () => this.isCurrentBlockType("bulletList"),
      },
      {
        label: this.i18n.toOrderedList,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
        action: () => this.runCommand("toggleOrderedList"),
        isActive: () => this.isCurrentBlockType("orderedList"),
      },
      {
        label: this.i18n.toTaskList,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>',
        action: () => this.runCommand("toggleTaskList"),
        isActive: () => this.isCurrentBlockType("taskList"),
      },
      {
        label: this.i18n.toBlockquote,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
        action: () => this.runCommand("toggleBlockquote"),
        isActive: () => this.isCurrentBlockType("blockquote"),
      },
      {
        label: this.i18n.addToMultiSelect,
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
        const hr = document.createElement("div");
        hr.className = "be-block-handle-menu-divider";
        this.menu.appendChild(hr);
      }

      const active = item.isActive?.() ?? false;
      const btn = createDropdownItem({
        label: item.label,
        iconHtml: item.icon,
        role: "menuitem",
        className: `be-block-handle-menu-item${item.danger ? " danger" : ""}`,
        active,
        danger: item.danger,
      });
      const icon = btn.querySelector("span");
      if (icon) {
        icon.classList.add("be-block-handle-menu-icon");
      }

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

    const resolved = doc.resolve(this.currentBlockPos);
    let targetDepth = 1;

    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      if (resolved.before(depth) === this.currentBlockPos) {
        targetDepth = depth;
        break;
      }
    }

    const parentDepth = targetDepth - 1;
    const parent = parentDepth >= 0 ? resolved.node(parentDepth) : doc;
    const index = resolved.index(parentDepth);

    if (direction === -1) {
      if (index <= 0) return;

      const prevNode = parent.child(index - 1);
      const prevPos = this.currentBlockPos - prevNode.nodeSize;
      const end = this.currentBlockPos + node.nodeSize;

      const tr = this.editorView.state.tr;
      tr.replaceWith(prevPos, end, [node, prevNode]);
      this.editorView.dispatch(tr);
      this.currentBlockPos = prevPos;
      return;
    }

    if (index >= parent.childCount - 1) return;

    const nextNode = parent.child(index + 1);
    const nextPos = this.currentBlockPos + node.nodeSize;
    const end = nextPos + nextNode.nodeSize;

    const tr = this.editorView.state.tr;
    tr.replaceWith(this.currentBlockPos, end, [nextNode, node]);
    this.editorView.dispatch(tr);
    this.currentBlockPos = this.currentBlockPos + nextNode.nodeSize;
  }

  deleteBlock() {
    if (this.currentBlockPos === null) return;
    const { state } = this.editorView;
    const node = state.doc.nodeAt(this.currentBlockPos);
    if (!node) return;

    const from = this.currentBlockPos;
    const to = this.currentBlockPos + node.nodeSize;
    const tr = state.tr.delete(from, to);

    const anchor = Math.max(1, Math.min(from, tr.doc.content.size));
    const selection = TextSelection.near(tr.doc.resolve(anchor), -1);
    tr.setSelection(selection);
    this.editorView.dispatch(tr);

    this.editorView.focus();
    this.editor.commands.focus();
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
    window.prompt(this.i18n.copyLinkPromptTitle, text);
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
    if (!this.isEnabled()) {
      this.hideMenu();
      this.element.style.display = "none";
      return;
    }

    const container = this.getEditorContainer();

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
    if (this.menu.style.display !== "none") {
      this.hideMenu();
    }
    // Optional: re-check handle position or hide it
    // this.scheduleHide()
  };

  scheduleHide() {
    this.hideTimer = setTimeout(() => {
      if (this.menu.style.display === "none") {
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

  private getVisualBlockFromResolvedPos(resolvedPos: any) {
    for (let depth = resolvedPos.depth; depth >= 2; depth -= 1) {
      const node = resolvedPos.node(depth);
      if (node?.type?.name === "listItem" || node?.type?.name === "taskItem") {
        return {
          pos: resolvedPos.before(depth),
          node,
        };
      }
    }

    return {
      pos: resolvedPos.before(1),
      node: resolvedPos.node(1),
    };
  }

  handleMouseMove = throttle((event: MouseEvent) => {
    if (!this.isEnabled()) {
      this.hideMenu();
      this.element.style.display = "none";
      return;
    }

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
    if (resolvedPos.depth < 1) return;

    const visual = this.getVisualBlockFromResolvedPos(resolvedPos);
    if (!visual.node) return;

    this.currentBlockPos = visual.pos;
    this.showHandle(visual.pos, visual.node);
    this.cancelHide();
  }, 16);

  showHandle(pos: number, node: any) {
    const container = this.getEditorContainer();
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const editorRect = (this.editorView.dom as HTMLElement).getBoundingClientRect();
    const nodeDom = this.editorView.nodeDOM(pos) as HTMLElement | null;

    let top = 0;
    const left = editorRect.left - containerRect.left - 28;

    if (nodeDom) {
      const blockRect = nodeDom.getBoundingClientRect();
      top = blockRect.top - containerRect.top + 1;
    } else {
      const isEmpty = node.content.size === 0;
      const alignPos = isEmpty ? pos : pos + 1;
      const coords = this.editorView.coordsAtPos(alignPos);
      top = coords.top - containerRect.top + 1;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
    this.element.style.display = "flex";
  }

  toggleMenu() {
    if (!this.isEnabled()) return;

    if (this.menu.style.display === "none") {
      this.ensureMenuHost();
      this.renderMenu();
      const rect = this.element.getBoundingClientRect();
      if (this.menuHideTimer) {
        window.clearTimeout(this.menuHideTimer);
        this.menuHideTimer = null;
      }
      this.menu.style.display = "block";
      this.menu.style.top = `${rect.bottom + 4}px`;
      this.menu.style.left = `${rect.left}px`;
      this.menu.style.opacity = "0";
      this.menu.style.transform = "translateY(-6px) scale(0.98)";
      requestAnimationFrame(() => {
        this.menu.style.transition = "opacity 0.15s ease, transform 0.15s ease";
        this.menu.style.opacity = "1";
        this.menu.style.transform = "translateY(0) scale(1)";
      });
      this.editor.commands.setBlockMenuOpen(true);
      this.editor.commands.setInteractionMode("block-selection");
    } else {
      this.hideMenu();
    }
  }

  hideMenu() {
    if (this.menu.style.display === "none") return;

    if (this.menuHideTimer) {
      window.clearTimeout(this.menuHideTimer);
      this.menuHideTimer = null;
    }
    this.menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";
    this.menu.style.opacity = "0";
    this.menu.style.transform = "translateY(-4px) scale(0.98)";
    this.menuHideTimer = window.setTimeout(() => {
      this.menu.style.display = "none";
      this.menu.style.transition = "";
      this.menu.style.opacity = "";
      this.menu.style.transform = "";
      this.menuHideTimer = null;
    }, 120);
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
    if (this.scrollTarget === document) {
      document.removeEventListener("scroll", this.handleScroll, true);
    } else {
      (this.scrollTarget as HTMLElement).removeEventListener("scroll", this.handleScroll);
    }
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.menuHideTimer) window.clearTimeout(this.menuHideTimer);
  }
}
