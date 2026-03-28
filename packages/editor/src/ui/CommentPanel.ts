/**
 * CommentPanel — 评论面板 UI
 * - 面板创建评论（不再使用 prompt）
 * - 线程回复 / 解决 / 重新打开 / 删除
 * - 已解决筛选（全部 / 未解决 / 已解决）
 */

import { TextSelection } from "prosemirror-state";
import { EditorCore } from "../core/EditorCore";
import { resolveEditorI18n } from "../i18n";
import { commentStore, CommentThread } from "../extensions/Comment";
import type { CommentPanelI18n } from "../i18n/types";
import { createBaseButton } from "./components/BaseButton";
import { createBaseInput } from "./components/BaseInput";
import { createBaseTag } from "./components/BaseTag";
import { createPanelCard } from "./components/PanelCard";
import { createQuotePreview } from "./components/QuotePreview";
import {
  type SelectionSnapshot,
  buildCreateCommentDraft,
  buildSelectionSnapshot,
  resolvePendingSelection,
} from "./comment-panel-logic";

type CommentFilter = "all" | "open" | "resolved";

function splitLegacyQuotedComment(text: string): {
  quoteText?: string;
  bodyText: string;
} {
  const match =
    text.match(/^关于「(.+?)」：\s*(.*)$/s) ||
    text.match(/^About ["“](.+?)["”]:\s*(.*)$/is);
  if (!match) return { bodyText: text };
  return {
    quoteText: match[1]?.trim() || undefined,
    bodyText: (match[2] || "").trim(),
  };
}

const DEFAULT_COMMENT_PANEL_I18N: CommentPanelI18n =
  resolveEditorI18n("en-US").commentPanel;

function formatTime(ts: number, locale: string): string {
  const d = new Date(ts);
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export class CommentPanel {
  private listEl: HTMLElement;
  private editorCore: EditorCore;
  private i18n: CommentPanelI18n;
  private unsubscribe: () => void;
  private filter: CommentFilter = "open";
  private filterBtns: Record<CommentFilter, HTMLButtonElement>;
  private draftInput: HTMLTextAreaElement;
  private hintEl: HTMLElement;
  private selectionQuoteEl: HTMLButtonElement;
  private pendingSelection: { from: number; to: number } | null = null;
  private pendingSelectionPreview = "";
  private lastKnownSelection: SelectionSnapshot | null = null;
  private readonly openCommentPanelHandler: () => void;
  private readonly focusCommentThreadHandler: (commentId: string) => void;

  constructor(
    editorCore: EditorCore,
    container: HTMLElement,
    i18n?: Partial<CommentPanelI18n>,
  ) {
    this.editorCore = editorCore;
    this.i18n = {
      ...DEFAULT_COMMENT_PANEL_I18N,
      ...(i18n || {}),
    };

    container.classList.add("comment-panel");
    container.setAttribute("role", "complementary");
    container.setAttribute("aria-label", this.i18n.panelAriaLabel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-shrink:0;";

    const title = document.createElement("h3");
    title.textContent = this.i18n.title;
    title.style.cssText =
      "margin:0;font-size:14px;font-weight:600;color:var(--text-color);";
    header.appendChild(title);

    const filterWrap = document.createElement("div");
    filterWrap.style.cssText = "display:flex;gap:4px;";

    this.filterBtns = {
      all: this.createFilterBtn(this.i18n.filterAll, "all"),
      open: this.createFilterBtn(this.i18n.filterOpen, "open"),
      resolved: this.createFilterBtn(this.i18n.filterResolved, "resolved"),
    };

    filterWrap.appendChild(this.filterBtns.open);
    filterWrap.appendChild(this.filterBtns.resolved);
    filterWrap.appendChild(this.filterBtns.all);
    header.appendChild(filterWrap);
    container.appendChild(header);

    const draftWrap = document.createElement("div");
    draftWrap.style.cssText =
      "border:1px solid var(--border-color);border-radius:8px;padding:8px;background:var(--surface-muted);margin-bottom:10px;flex-shrink:0;";

    this.selectionQuoteEl = createQuotePreview({
      text: "",
      ariaLabel: this.i18n.selectionQuoteAriaLabel,
      title: this.i18n.selectionQuoteTitle,
      className: "comment-selection-quote",
      onClick: () => this.jumpToPendingSelection(),
    });
    this.selectionQuoteEl.style.display = "none";

    const draftInputField = createBaseInput({
      placeholder: this.i18n.draftPlaceholder,
      ariaLabel: this.i18n.draftAriaLabel,
      multiline: true,
      rows: 2,
      className: "comment-draft-input",
    });
    this.draftInput = draftInputField.control as HTMLTextAreaElement;

    const createRow = document.createElement("div");
    createRow.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;";

    this.hintEl = document.createElement("span");
    this.hintEl.style.cssText = "font-size:12px;color:var(--text-muted);";

    const createBtn = createBaseButton({
      label: this.i18n.createButton,
      ariaLabel: this.i18n.createButtonAriaLabel,
      variant: "primary",
      size: "sm",
      className: "comment-create-btn",
    });
    createBtn.addEventListener("click", () =>
      this.createCommentFromSelection(),
    );

    createRow.appendChild(this.hintEl);
    createRow.appendChild(createBtn);

    draftWrap.appendChild(this.selectionQuoteEl);
    draftWrap.appendChild(draftInputField.container);
    draftWrap.appendChild(createRow);
    container.appendChild(draftWrap);

    this.listEl = document.createElement("div");
    this.listEl.style.cssText = "flex:1;overflow-y:auto;";
    this.listEl.setAttribute("role", "list");
    container.appendChild(this.listEl);

    this.unsubscribe = commentStore.on(() => this.render());
    editorCore.editor.on("update", () => this.render());
    editorCore.editor.on("selectionUpdate", () => this.handleSelectionUpdate());
    this.openCommentPanelHandler = () => this.handleOpenCommentPanel();
    this.focusCommentThreadHandler = (commentId: string) =>
      this.focusCommentThread(commentId);
    this.editorCore.events.on("openCommentPanel", this.openCommentPanelHandler);
    this.editorCore.events.on(
      "focusCommentThread",
      this.focusCommentThreadHandler,
    );

    this.handleSelectionUpdate();
    this.render();
  }

  private handleSelectionUpdate() {
    const selection = this.editorCore.editor.state.selection;
    if (!selection.empty) {
      const selectedText = this.editorCore.editor.state.doc.textBetween(
        selection.from,
        selection.to,
        " ",
      );
      const snapshot = buildSelectionSnapshot(
        { from: selection.from, to: selection.to },
        selectedText,
      );
      if (snapshot) this.lastKnownSelection = snapshot;
    }
    this.renderSelectionHint();
  }

  private handleOpenCommentPanel() {
    const selection = this.editorCore.editor.state.selection;
    const current = !selection.empty
      ? buildSelectionSnapshot(
          { from: selection.from, to: selection.to },
          this.editorCore.editor.state.doc.textBetween(
            selection.from,
            selection.to,
            " ",
          ),
        )
      : null;
    if (current) {
      this.lastKnownSelection = current;
    }

    const pending = resolvePendingSelection(current, this.lastKnownSelection);
    if (pending) {
      this.pendingSelection = {
        from: pending.from,
        to: pending.to,
      };
      this.pendingSelectionPreview = pending.preview;
    } else {
      this.pendingSelection = null;
      this.pendingSelectionPreview = "";
    }
    this.renderPendingSelectionQuote();
    queueMicrotask(() => {
      this.draftInput.focus();
      const end = this.draftInput.value.length;
      this.draftInput.setSelectionRange(end, end);
    });
    this.renderSelectionHint();
  }

  private createFilterBtn(
    label: string,
    filter: CommentFilter,
  ): HTMLButtonElement {
    const btn = createBaseTag({
      label,
      ariaLabel: `${this.i18n.filterAriaPrefix}${label}`,
      className: "comment-filter-btn",
    });
    btn.addEventListener("click", () => {
      this.filter = filter;
      this.render();
    });
    return btn;
  }

  private focusCommentThread(commentId: string) {
    this.filter = "all";
    this.render();

    const item = this.listEl.querySelector(
      `[data-comment-id="${commentId}"]`,
    ) as HTMLElement | null;
    if (!item) return;

    item.scrollIntoView({ block: "center", behavior: "smooth" });
    item.style.boxShadow = "0 0 0 2px var(--primary-color)";
    setTimeout(() => {
      item.style.boxShadow = "";
    }, 1400);
  }

  private renderPendingSelectionQuote() {
    if (!this.pendingSelection || !this.pendingSelectionPreview) {
      this.selectionQuoteEl.style.display = "none";
      this.selectionQuoteEl.textContent = "";
      return;
    }

    this.selectionQuoteEl.style.display = "block";
    this.selectionQuoteEl.textContent = `${this.i18n.selectionQuotePrefix}${this.pendingSelectionPreview}`;
    this.selectionQuoteEl.title = this.i18n.selectionQuoteTitle;
  }

  private jumpToPendingSelection() {
    if (!this.pendingSelection) return;
    const { state, view } = this.editorCore.editor;
    const { from, to } = this.pendingSelection;
    if (from < 0 || to > state.doc.content.size || from >= to) return;

    const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  }

  private renderSelectionHint() {
    const empty =
      this.editorCore.editor.state.selection.empty && !this.pendingSelection;
    this.hintEl.textContent = empty
      ? this.i18n.selectionHintEmpty
      : this.i18n.selectionHintReady;
    this.hintEl.style.color = empty ? "var(--text-muted)" : "var(--primary-color)";
    this.renderPendingSelectionQuote();
  }

  private createCommentFromSelection() {
    const editor = this.editorCore.editor;
    const draft = buildCreateCommentDraft({
      draftText: this.draftInput.value,
      currentRange: !editor.state.selection.empty
        ? { from: editor.state.selection.from, to: editor.state.selection.to }
        : null,
      pendingRange: this.pendingSelection,
      pendingPreview: this.pendingSelectionPreview,
    });

    if (!draft) {
      this.renderSelectionHint();
      return;
    }

    // Ensure command applies to the originally captured range.
    if (
      editor.state.selection.empty ||
      editor.state.selection.from !== draft.range.from ||
      editor.state.selection.to !== draft.range.to
    ) {
      const tr = editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, draft.range.from, draft.range.to),
      );
      editor.view.dispatch(tr);
    }

    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    commentStore.addThread(id, draft.text, this.i18n.currentUser, draft.quoteText);
    editor.chain().focus().setComment(id).run();

    this.draftInput.value = "";
    this.pendingSelection = null;
    this.pendingSelectionPreview = "";
    this.renderPendingSelectionQuote();
    this.jumpToComment(id);
    this.render();
  }

  private getFilteredThreads(): CommentThread[] {
    const all = commentStore.getAll();
    if (this.filter === "all") return all;
    if (this.filter === "resolved") return all.filter((t) => t.resolved);
    return all.filter((t) => !t.resolved);
  }

  private render() {
    this.listEl.innerHTML = "";
    (["all", "open", "resolved"] as CommentFilter[]).forEach((key) => {
      const active = key === this.filter;
      this.filterBtns[key].classList.toggle("is-active", active);
      this.filterBtns[key].setAttribute(
        "aria-pressed",
        active ? "true" : "false",
      );
    });

    this.renderSelectionHint();

    const threads = this.getFilteredThreads();
    if (threads.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText =
        "text-align:center;color:var(--text-muted);font-size:13px;padding:32px 0;";
      empty.textContent =
        this.filter === "resolved"
          ? this.i18n.emptyResolved
          : this.i18n.emptyNoComments;
      this.listEl.appendChild(empty);
      return;
    }

    threads.forEach((thread) => {
      this.listEl.appendChild(this.renderThread(thread));
    });
  }

  private renderThread(thread: CommentThread): HTMLElement {
    const item = createPanelCard({
      className: "comment-item",
      role: "listitem",
      clickable: true,
    });
    item.setAttribute("data-comment-id", thread.id);
    item.style.cursor = "pointer";
    item.title = this.i18n.threadJumpTitle;

    item.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("button, textarea, input")) return;
      this.jumpToComment(thread.id);
    });

    const headerEl = document.createElement("div");
    headerEl.style.cssText =
      "display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;";

    const authorDate = document.createElement("div");
    authorDate.innerHTML = `<span style="font-weight:600;color:var(--text-color);font-size:13px;">${escapeHtml(thread.author)}</span> <span class="comment-date">${formatTime(thread.createdAt, this.editorCore.i18n.locale)}</span>`;
    headerEl.appendChild(authorDate);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;";

    if (!thread.resolved) {
      const resolveBtn = this.createActionBtn(
        "✓",
        this.i18n.resolveAction,
        "success",
      );
      resolveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        commentStore.resolve(thread.id);
        this.removeMarkFromEditor(thread.id);
      });
      actions.appendChild(resolveBtn);
    } else {
      const reopenBtn = this.createActionBtn(
        "↺",
        this.i18n.reopenAction,
        "primary",
      );
      reopenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        commentStore.reopen(thread.id);
      });
      actions.appendChild(reopenBtn);
    }

    const deleteBtn = this.createActionBtn(
      "✕",
      this.i18n.deleteAction,
      "danger",
    );
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      commentStore.delete(thread.id);
      this.removeMarkFromEditor(thread.id);
    });
    actions.appendChild(deleteBtn);
    headerEl.appendChild(actions);
    item.appendChild(headerEl);

    const { quoteText: legacyQuote, bodyText } = splitLegacyQuotedComment(
      thread.text,
    );
    const finalQuoteText = thread.quoteText || legacyQuote;

    if (finalQuoteText) {
      const quoteEl = createQuotePreview({
        text: finalQuoteText,
        title: this.i18n.selectionQuoteTitle,
        className: "comment-thread-quote",
      });
      quoteEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.jumpToComment(thread.id);
      });
      item.appendChild(quoteEl);
    }

    const textEl = document.createElement("div");
    textEl.className = "comment-content";
    textEl.textContent = bodyText;
    item.appendChild(textEl);

    if (thread.replies.length > 0) {
      const repliesEl = document.createElement("div");
      repliesEl.style.cssText =
        "margin-top:8px;border-left:2px solid var(--border-color);padding-left:10px;display:flex;flex-direction:column;gap:6px;";
      thread.replies.forEach((reply) => {
        const r = document.createElement("div");
        r.innerHTML = `
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px;">
            <strong style="color:var(--text-secondary);">${escapeHtml(reply.author)}</strong> · ${formatTime(reply.createdAt, this.editorCore.i18n.locale)}
          </div>
          <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(reply.text)}</div>
        `;
        repliesEl.appendChild(r);
      });
      item.appendChild(repliesEl);
    }

    if (!thread.resolved) {
      const replyRow = document.createElement("div");
      replyRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";

      const inputField = createBaseInput({
        placeholder: this.i18n.replyPlaceholder,
        ariaLabel: this.i18n.replyAriaLabel,
        className: "comment-reply-input",
      });
      const input = inputField.control as HTMLInputElement;
      inputField.container.style.flex = "1";
      input.addEventListener("click", (e) => e.stopPropagation());

      const sendBtn = createBaseButton({
        label: this.i18n.replyButton,
        ariaLabel: this.i18n.replyButtonAriaLabel,
        variant: "primary",
        size: "xs",
        className: "comment-reply-send-btn",
      });
      sendBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const text = input.value.trim();
        if (!text) return;
        commentStore.addReply(thread.id, text, this.i18n.currentUser);
        input.value = "";
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          sendBtn.click();
        }
      });

      replyRow.appendChild(inputField.container);
      replyRow.appendChild(sendBtn);
      item.appendChild(replyRow);
    }

    if (thread.resolved) {
      item.style.opacity = "0.7";
    }

    return item;
  }

  private createActionBtn(
    text: string,
    title: string,
    tone: "success" | "primary" | "danger",
  ): HTMLButtonElement {
    const btn = createBaseButton({
      label: text,
      ariaLabel: title,
      title,
      variant: "ghost",
      size: "xs",
      iconOnly: true,
      className: `comment-action-btn comment-action-btn--${tone}`,
    });
    return btn;
  }

  private jumpToComment(commentId: string) {
    const editor = this.editorCore.editor;
    const { state, view } = editor;
    let foundPos: number | null = null;

    state.doc.descendants((node, pos) => {
      if (foundPos !== null) return false;
      if (!node.isText) return true;
      for (const mark of node.marks) {
        if (
          mark.type.name === "comment" &&
          mark.attrs.commentId === commentId
        ) {
          foundPos = pos;
          return false;
        }
      }
      return true;
    });

    if (foundPos === null) return;

    const tr = state.tr.setSelection(
      TextSelection.near(state.doc.resolve(foundPos)),
    );
    view.dispatch(tr.scrollIntoView());
    view.focus();

    const span = view.dom.querySelector(
      `[data-comment-id="${commentId}"]`,
    ) as HTMLElement | null;
    if (span) {
      span.style.outline = "2px solid var(--primary-color)";
      setTimeout(() => {
        span.style.outline = "";
      }, 1500);
    }
  }

  private removeMarkFromEditor(commentId: string) {
    const { state, view } = this.editorCore.editor;
    const schema = state.schema;
    const commentMark = schema.marks.comment;
    if (!commentMark) return;

    let tr = state.tr;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (!node.isInline) return;
      node.marks.forEach((mark) => {
        if (mark.type === commentMark && mark.attrs.commentId === commentId) {
          tr = tr.removeMark(pos, pos + node.nodeSize, commentMark);
          changed = true;
        }
      });
    });

    if (changed) view.dispatch(tr);
  }

  destroy() {
    this.unsubscribe();
    this.editorCore.events.off(
      "openCommentPanel",
      this.openCommentPanelHandler,
    );
    this.editorCore.events.off(
      "focusCommentThread",
      this.focusCommentThreadHandler,
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
