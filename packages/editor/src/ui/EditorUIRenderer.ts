import { TextSelection } from "prosemirror-state";
import { EditorCore } from "../core/EditorCore";
import { Toolbar } from "./Toolbar";
import { Outline, OutlineI18n } from "./Outline";
import { TableBubbleMenu } from "./menus/TableBubbleMenu";
import { BlockMultiSelectBar } from "./menus/block-multi-select-bar";
import { CommentPanel } from "./CommentPanel";
import { resolveEditorI18n } from "../i18n";
import type { EditorI18n } from "../i18n";
import type { EditorUIConfig } from "./config/operation-bars";
import type {
  EditorUILayoutSchema,
  EditorUIModuleDefinition,
  EditorUIModuleId,
  EditorUIModuleInstance,
} from "./modules/contracts";

export type ToolbarMode = "top" | "inline";
export type EditorThemeMode = "light" | "dark" | "auto";

export interface EditorUILayoutSlots {
  toolbarContainer?: HTMLElement | null;
  editorContainer: HTMLElement;
  scrollContainer?: HTMLElement | null;
  overlayContainer?: HTMLElement | null;
  outlineContainer?: HTMLElement | null;
  commentContainer?: HTMLElement | null;
}

export interface EditorUILayoutBuilderParams {
  container: HTMLElement;
  editorCore: EditorCore;
  toolbarMode: ToolbarMode;
}

export interface EditorUIRendererOptions {
  toolbarMode?: ToolbarMode;
  commentPanelDefaultVisible?: boolean;
  theme?: EditorThemeMode;
  i18n?: string | Partial<EditorI18n>;
  outlineI18n?: Partial<OutlineI18n>;
  uiConfig?: EditorUIConfig;
  layoutBuilder?: (params: EditorUILayoutBuilderParams) => EditorUILayoutSlots;
  layoutSchema?: EditorUILayoutSchema;
  modules?: Partial<Record<EditorUIModuleId, EditorUIModuleDefinition>>;
}

export class EditorUIRenderer {
  private editorCore: EditorCore;
  private container: HTMLElement;
  private options: EditorUIRendererOptions;

  private slots: EditorUILayoutSlots;
  private tiptapElement: HTMLElement;
  private commentPanelVisible = false;
  private linkPreviewEl: HTMLElement | null = null;
  private hoverAnchor: HTMLAnchorElement | null = null;
  private readonly i18n: EditorI18n;
  private readonly moduleDefinitions: Record<
    EditorUIModuleId,
    EditorUIModuleDefinition
  >;
  private readonly mountedModules: Partial<
    Record<EditorUIModuleId, EditorUIModuleInstance>
  > = {};

  constructor(
    editorCore: EditorCore,
    container: HTMLElement,
    options: EditorUIRendererOptions = {},
  ) {
    this.editorCore = editorCore;
    this.container = container;
    this.options = {
      toolbarMode: options.toolbarMode || "top",
      commentPanelDefaultVisible: options.commentPanelDefaultVisible ?? false,
      theme: options.theme || "auto",
      i18n: options.i18n,
      outlineI18n: options.outlineI18n,
      uiConfig: options.uiConfig,
      layoutBuilder: options.layoutBuilder,
      layoutSchema: options.layoutSchema,
      modules: options.modules,
    };

    this.i18n = resolveEditorI18n(this.options.i18n || this.editorCore.i18n);

    this.slots =
      this.options.layoutBuilder?.({
        container: this.container,
        editorCore: this.editorCore,
        toolbarMode: this.options.toolbarMode || "top",
      }) || this.createDefaultLayout();

    this.commentPanelVisible = Boolean(this.options.commentPanelDefaultVisible);
    this.applyLayoutSchemaToSlots();
    this.applyTheme();
    this.applyLayoutDataAttributes();
    this.moduleDefinitions = this.buildModuleDefinitions(this.options.modules);

    this.mountModules();

    this.editorCore.events.on("toggleCommentPanel", () =>
      this.toggleCommentPanel(),
    );
    this.editorCore.events.on("openCommentPanel", () =>
      this.openCommentPanel(),
    );

    this.tiptapElement = this.editorCore.editor.options.element as HTMLElement;
    this.tiptapElement.dataset.beToolbarMode =
      this.options.toolbarMode || "top";
    this.slots.editorContainer.appendChild(this.tiptapElement);

    window.addEventListener("hashchange", this.handleHashChange);
    this.tiptapElement.addEventListener("click", this.handleEditorLinkClick);
    this.tiptapElement.addEventListener("click", this.handleEditorCommentClick);
    this.tiptapElement.addEventListener(
      "mouseover",
      this.handleEditorLinkHover,
    );
    this.tiptapElement.addEventListener("mouseout", this.handleEditorLinkLeave);
    queueMicrotask(() => this.navigateToCurrentHash());
  }

  public toggleCommentPanel() {
    if (!this.slots.commentContainer) return;
    this.commentPanelVisible = !this.commentPanelVisible;
    this.applyCommentPanelVisibility();
  }

  public openCommentPanel() {
    if (!this.slots.commentContainer) return;
    this.commentPanelVisible = true;
    this.applyCommentPanelVisibility();
  }

  private applyCommentPanelVisibility() {
    if (!this.slots.commentContainer) return;
    if (this.options.layoutSchema?.regions?.comment?.visible === false) {
      this.slots.commentContainer.style.display = "none";
      return;
    }
    this.slots.commentContainer.style.display = this.commentPanelVisible
      ? "block"
      : "none";
  }

  private applyLayoutDataAttributes() {
    this.container.dataset.beUiRoot = "true";
    this.slots.editorContainer.dataset.beEditorContainer = "true";
    if (this.slots.scrollContainer) {
      this.slots.scrollContainer.dataset.beScrollContainer = "true";
    }

    const overlayHost = this.slots.overlayContainer || this.container;
    overlayHost.dataset.beOverlayContainer = "true";
  }

  private applyTheme() {
    const preferred = this.options.theme || "auto";
    const resolved =
      preferred === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : preferred;
    this.container.dataset.beTheme = resolved;
  }

  private applyLayoutSchemaToSlots() {
    const regions = this.options.layoutSchema?.regions;
    if (!regions) return;

    const applyRegion = (
      el: HTMLElement | null | undefined,
      region?: { visible?: boolean; width?: string | number; order?: number },
    ) => {
      if (!el || !region) return;
      if (typeof region.visible === "boolean") {
        el.style.display = region.visible ? "" : "none";
      }
      if (region.width !== undefined) {
        el.style.width =
          typeof region.width === "number" ? `${region.width}px` : region.width;
      }
      if (typeof region.order === "number") {
        el.style.order = String(region.order);
      }
    };

    applyRegion(this.slots.toolbarContainer, regions.toolbar);
    applyRegion(this.slots.editorContainer, regions.editor);
    applyRegion(this.slots.outlineContainer, regions.outline);
    applyRegion(this.slots.commentContainer, regions.comment);
    applyRegion(this.slots.overlayContainer, regions.overlay);
  }

  private createDefaultLayout(): EditorUILayoutSlots {
    this.container.innerHTML = "";
    this.container.classList.add("layout");
    this.container.style.flexDirection = "column";

    let toolbarContainer: HTMLElement | null = null;
    if (this.options.toolbarMode === "top") {
      toolbarContainer = document.createElement("div");
      this.container.appendChild(toolbarContainer);
    }

    const workspace = document.createElement("div");
    workspace.style.display = "flex";
    workspace.style.flex = "1";
    workspace.style.overflow = "hidden";
    workspace.style.width = "100%";
    this.container.appendChild(workspace);

    const mainContentArea = document.createElement("div");
    mainContentArea.classList.add("main-content");
    workspace.appendChild(mainContentArea);

    const scrollArea = document.createElement("div");
    scrollArea.classList.add("editor-scroll-area");
    mainContentArea.appendChild(scrollArea);

    const editorPaper = document.createElement("div");
    editorPaper.classList.add("editor-container");
    scrollArea.appendChild(editorPaper);

    const outlineSidebar = document.createElement("div");
    outlineSidebar.classList.add("outline-sidebar");
    outlineSidebar.style.width = "260px";
    outlineSidebar.style.padding = "16px 14px";
    outlineSidebar.style.borderLeft = "1px solid var(--border-color)";
    outlineSidebar.style.backgroundColor = "var(--paper-bg)";
    outlineSidebar.style.display = "block";
    outlineSidebar.style.overflow = "hidden";
    workspace.appendChild(outlineSidebar);

    const commentSidebar = document.createElement("div");
    commentSidebar.style.display = "none";
    commentSidebar.style.width = "280px";
    commentSidebar.style.flexShrink = "0";
    workspace.appendChild(commentSidebar);

    return {
      toolbarContainer,
      editorContainer: editorPaper,
      scrollContainer: scrollArea,
      overlayContainer: this.container,
      outlineContainer: outlineSidebar,
      commentContainer: commentSidebar,
    };
  }

  private handleHashChange = () => {
    this.navigateToCurrentHash();
  };

  private handleEditorLinkClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href") || "";
    let hash = "";

    if (href.startsWith("#")) {
      hash = href;
    } else {
      try {
        const url = new URL(href, window.location.href);
        if (
          url.origin !== window.location.origin ||
          url.pathname !== window.location.pathname
        ) {
          return;
        }
        hash = url.hash;
      } catch {
        return;
      }
    }

    if (!hash) return;

    event.preventDefault();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${hash}`,
    );
    this.navigateToCurrentHash();
  };

  private handleEditorCommentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const mark = target?.closest("[data-comment-id]") as HTMLElement | null;
    if (!mark) return;

    const commentId = (mark.getAttribute("data-comment-id") || "").trim();
    if (!commentId) return;

    this.openCommentPanel();
    this.editorCore.events.emit("focusCommentThread", commentId);
  };

  private navigateToCurrentHash() {
    const hash = decodeURIComponent(
      window.location.hash.replace(/^#/, "").trim(),
    );
    if (!hash) return;
    this.focusBlockById(hash);
  }

  private handleEditorLinkHover = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
    if (!anchor) return;

    this.hoverAnchor = anchor;
    const blockId = decodeURIComponent(
      (anchor.getAttribute("href") || "").replace(/^#/, "").trim(),
    );
    if (!blockId) return;

    const preview = this.getBlockPreviewText(blockId);
    if (!preview) return;
    this.showLinkPreview(anchor, preview);
  };

  private handleEditorLinkLeave = (event: MouseEvent) => {
    if (!this.hoverAnchor) return;
    const related = event.relatedTarget as Node | null;
    if (related && this.hoverAnchor.contains(related)) return;
    this.hoverAnchor = null;
    this.hideLinkPreview();
  };

  private getBlockPreviewText(blockId: string): string | null {
    const { state } = this.editorCore.editor;
    let text = "";

    state.doc.descendants((node) => {
      if (node.attrs?.blockId !== blockId) return true;
      text = (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
      return false;
    });

    if (!text) return null;
    return text;
  }

  private ensureLinkPreviewEl() {
    if (this.linkPreviewEl) return this.linkPreviewEl;

    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;z-index:10020;max-width:320px;padding:8px 10px;background:#111827;color:#fff;border-radius:8px;font-size:12px;line-height:1.5;box-shadow:0 10px 24px rgba(0,0,0,0.22);pointer-events:none;display:none;";
    const host = this.slots.overlayContainer || this.container;
    host.appendChild(el);
    this.linkPreviewEl = el;
    return el;
  }

  private showLinkPreview(anchor: HTMLAnchorElement, text: string) {
    const el = this.ensureLinkPreviewEl();
    el.textContent = text;

    const rect = anchor.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 340);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 80);

    el.style.left = `${Math.max(8, left)}px`;
    el.style.top = `${Math.max(8, top)}px`;
    el.style.display = "block";
  }

  private hideLinkPreview() {
    if (!this.linkPreviewEl) return;
    this.linkPreviewEl.style.display = "none";
  }

  private focusBlockById(blockId: string) {
    const { state, view } = this.editorCore.editor;
    let foundPos: number | null = null;

    state.doc.descendants((node, pos) => {
      if (node.attrs?.blockId === blockId) {
        foundPos = pos;
        return false;
      }
      return true;
    });

    if (foundPos === null) return false;

    const resolvedPos = state.doc.resolve(
      Math.min(foundPos + 1, state.doc.content.size),
    );
    const selection = TextSelection.near(resolvedPos);
    view.dispatch(state.tr.setSelection(selection).scrollIntoView());

    const target = this.slots.editorContainer.querySelector(
      `[data-block-id="${blockId}"]`,
    ) as HTMLElement | null;
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
  }

  private buildModuleDefinitions(
    overrides?: Partial<Record<EditorUIModuleId, EditorUIModuleDefinition>>,
  ): Record<EditorUIModuleId, EditorUIModuleDefinition> {
    const defaults: Record<EditorUIModuleId, EditorUIModuleDefinition> = {
      toolbar: {
        id: "toolbar",
        defaultRegion: "toolbar",
        mount: ({ slots, options }) => {
          if (!slots.toolbarContainer || options.toolbarMode !== "top") return;
          this.renderToolbar(slots.toolbarContainer);
        },
      },
      outline: {
        id: "outline",
        defaultRegion: "outline",
        mount: ({ slots }) => {
          if (!slots.outlineContainer) return;
          this.renderOutline(slots.outlineContainer);
        },
      },
      commentPanel: {
        id: "commentPanel",
        defaultRegion: "comment",
        mount: ({ slots }) => {
          if (!slots.commentContainer) return;
          this.renderCommentPanel(slots.commentContainer);
          this.applyCommentPanelVisibility();
        },
      },
      tableBubbleMenu: {
        id: "tableBubbleMenu",
        defaultRegion: "overlay",
        mount: () => {
          const instance = new TableBubbleMenu(this.editorCore);
          return { unmount: () => instance.destroy() };
        },
      },
      blockMultiSelectBar: {
        id: "blockMultiSelectBar",
        defaultRegion: "overlay",
        mount: () => {
          const instance = new BlockMultiSelectBar(this.editorCore);
          return { unmount: () => instance.destroy() };
        },
      },
    };

    return {
      ...defaults,
      ...(overrides || {}),
    };
  }

  private mountModules() {
    const moduleOrder: EditorUIModuleId[] = [
      "toolbar",
      "outline",
      "commentPanel",
      "tableBubbleMenu",
      "blockMultiSelectBar",
    ];

    moduleOrder.forEach((id) => {
      const cfg = this.options.layoutSchema?.modules?.[id];
      if (cfg?.enabled === false) return;

      const def = this.moduleDefinitions[id];
      const instance =
        def.mount({
          id,
          editorCore: this.editorCore,
          renderer: this,
          slots: this.slots,
          i18n: this.i18n,
          options: this.options,
        }) || {};

      this.mountedModules[id] = instance;
    });
  }

  private renderToolbar(toolbarContainer: HTMLElement): Toolbar {
    const toolbarConfig = this.options.uiConfig?.toolbar || this.editorCore.uiConfig?.toolbar;
    return new Toolbar(toolbarContainer, this.editorCore, this.i18n, toolbarConfig);
  }

  private renderOutline(outlineContainer: HTMLElement): Outline {
    return new Outline(outlineContainer, this.editorCore, {
      scrollArea: this.slots.scrollContainer || null,
      i18n: {
        ...this.i18n.outline,
        ...(this.options.outlineI18n || {}),
      },
    });
  }

  private renderCommentPanel(commentContainer: HTMLElement): CommentPanel {
    return new CommentPanel(this.editorCore, commentContainer, this.i18n.commentPanel);
  }
}
