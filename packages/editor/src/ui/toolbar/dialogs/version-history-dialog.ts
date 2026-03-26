import { EditorCore } from "../../../core/EditorCore";
import {
  SnapshotBlameLine,
  SnapshotDiffLine,
  SnapshotDiffResult,
} from "../../../core/VersionHistory";
import { Dialog } from "../../components/dialog";
import type { VersionHistoryDialogI18n } from "../../../i18n";

function formatTime(ts: number, locale: string) {
  return new Date(ts).toLocaleString(locale, {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceLabel(
  source: "auto" | "manual" | "restore",
  i18n: VersionHistoryDialogI18n,
) {
  if (source === "auto") return i18n.sourceAuto;
  if (source === "manual") return i18n.sourceManual;
  return i18n.sourceRestore;
}

const DEFAULT_VERSION_HISTORY_I18N: VersionHistoryDialogI18n = {
  title: "版本历史",
  subtitle: "本地快照、逐行差异与 Blame",
  closeDialogAriaLabel: "关闭对话框",
  tips: "支持按行查看增删改、作者与时间；点击快照可查看详细变更或 Blame。",
  saveSnapshot: "立即保存快照",
  manualSnapshotLabel: "手动快照",
  noSnapshots: "暂无快照",
  sourceAuto: "自动",
  sourceManual: "手动",
  sourceRestore: "回滚前",
  viewChanges: "查看变更",
  collapse: "收起",
  restoreToThis: "回滚到此版本",
  restoreConfirm: "确认回滚到该版本？当前内容会被替换。",
  restoreCompareTip: (previousLabel) => `Diff preview（对比上一版：${previousLabel}）`,
  noChanges: "该版本暂无可展示变更",
  fullDiff: "查看完整 Diff",
  detailUnavailable: "该快照详情不可用",
  completeDiffTitle: "完整变更文本",
  oldLine: "旧行",
  newLine: "新行",
  oldVersion: "旧版本",
  blankBase: "初始空白",
  selectSnapshotDetail: "请选择一个快照查看详情",
  diffView: "变更视图",
  blameView: "Blame 视图",
  blankBaseline: "空白基线",
  diffSummary: (baseLabel, added, deleted, modified) =>
    `对比基线：${baseLabel} · +${added} / -${deleted} / ~${modified}`,
  noDiff: "无差异",
  noBlameLines: "当前快照无可展示行",
  fullDiffHeader: (baseLabel) => `完整 Diff（对比：${baseLabel}）`,
  fullDiffSubtitle: (currentLabel, baseLabel, timeText) =>
    `${currentLabel} · 对比 ${baseLabel} · ${timeText}`,
};

export class VersionHistoryDialog {
  private dialog: Dialog;
  private editorCore: EditorCore;
  private listRoot: HTMLElement;
  private detailRoot: HTMLElement;
  private activeSnapshotId: string | null = null;
  private expandedSnapshotId: string | null = null;
  private detailTab: "diff" | "blame" = "diff";
  private readonly i18n: VersionHistoryDialogI18n;
  private readonly locale: string;

  constructor(
    editorCore: EditorCore,
    i18n?: VersionHistoryDialogI18n,
    locale: string = "zh-CN",
  ) {
    this.editorCore = editorCore;
    this.i18n = i18n || DEFAULT_VERSION_HISTORY_I18N;
    this.locale = locale;
    this.listRoot = document.createElement("div");
    this.listRoot.className = "be-space-y-2";

    this.detailRoot = document.createElement("div");
    this.detailRoot.className = "be-mt-3 be-rounded-xl be-overflow-hidden";
    this.detailRoot.style.border = "1px solid var(--border-color)";
    this.detailRoot.style.display = "none";

    const content = document.createElement("div");
    content.className = "be-space-y-4";

    const tips = document.createElement("div");
    tips.className = "be-text-xs";
    tips.style.color = "var(--text-muted)";
    tips.textContent = this.i18n.tips;
    content.appendChild(tips);

    const createBtn = document.createElement("button");
    createBtn.textContent = this.i18n.saveSnapshot;
    createBtn.className =
      "be-dialog-btn be-dialog-btn--primary";
    createBtn.style.cssText = "font-family:inherit;padding:8px 16px;border-radius:10px;";
    createBtn.onclick = () => {
      this.editorCore.versionHistory.createManualSnapshot(this.i18n.manualSnapshotLabel);
      this.renderList();
    };
    content.appendChild(createBtn);

    content.appendChild(this.listRoot);
    content.appendChild(this.detailRoot);

    this.dialog = new Dialog({
      title: this.i18n.title,
      subtitle: this.i18n.subtitle,
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: "fileText",
      iconBgClass: "be-dialog-icon--primary",
      host: (this.editorCore.editor.options.element as HTMLElement).closest(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null,
      onClose: () => {},
      width: "860px",
    });

    this.dialog.setContent(content);
    this.renderList();
  }

  private renderList() {
    const snapshots = this.editorCore.versionHistory.listSnapshots();
    this.listRoot.innerHTML = "";

    if (snapshots.length === 0) {
      const empty = document.createElement("div");
      empty.className = "be-text-sm be-py-3";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.noSnapshots;
      this.listRoot.appendChild(empty);
      this.detailRoot.innerHTML = "";
      this.activeSnapshotId = null;
      return;
    }

    if (
      this.activeSnapshotId &&
      !snapshots.some((s) => s.id === this.activeSnapshotId)
    ) {
      this.activeSnapshotId = null;
    }
    if (
      this.expandedSnapshotId &&
      !snapshots.some((s) => s.id === this.expandedSnapshotId)
    ) {
      this.expandedSnapshotId = null;
    }

    snapshots.forEach((snapshot, index) => {
      const expanded = this.expandedSnapshotId === snapshot.id;
      const previousSnapshot = this.resolveBaseSnapshotForDiff(
        snapshots,
        index,
      );
      const previousSnapshotId = previousSnapshot?.id;

      const row = document.createElement("div");
      row.className = "be-rounded-xl be-overflow-hidden";
      row.style.border = "1px solid var(--border-color)";
      if (snapshot.id === this.activeSnapshotId) {
        row.style.borderColor = "color-mix(in srgb, var(--primary-color) 45%, var(--border-color))";
      }

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.gap = "12px";
      header.style.padding = "10px 12px";
      header.style.cursor = "pointer";
      header.style.background = expanded ? "var(--surface-soft)" : "var(--paper-bg)";
      header.addEventListener("click", () => {
        this.activeSnapshotId = snapshot.id;
        this.expandedSnapshotId = expanded ? null : snapshot.id;
        this.detailTab = "diff";
        this.renderList();
      });

      const left = document.createElement("div");
      left.className = "be-min-w-0";
      left.style.display = "flex";
      left.style.flexDirection = "column";

      const title = document.createElement("div");
      title.className = "be-text-sm be-font-medium";
      title.style.color = "var(--text-color)";
      title.textContent = `${expanded ? "▾" : "▸"} ${snapshot.label} · ${formatTime(snapshot.createdAt, this.locale)}`;

      const stats = this.getDiffStats(snapshot.id, previousSnapshotId);

      const meta = document.createElement("div");
      meta.className = "be-text-xs be-mt-1 be-truncate";
      meta.style.color = "var(--text-muted)";
      meta.textContent = `${sourceLabel(snapshot.source, this.i18n)} · ${snapshot.authorName} · +${stats.added}/-${stats.deleted}/~${stats.modified} · ${snapshot.excerpt}`;

      left.appendChild(title);
      left.appendChild(meta);

      const actionWrap = document.createElement("div");
      actionWrap.className = "be-flex be-items-center be-gap-2 be-shrink-0";

      const detailBtn = document.createElement("button");
      detailBtn.type = "button";
      detailBtn.textContent = expanded ? this.i18n.collapse : this.i18n.viewChanges;
      detailBtn.className = "be-dialog-btn be-dialog-btn--secondary";
      detailBtn.style.cssText =
        "padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;";
      detailBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.activeSnapshotId = snapshot.id;
        this.expandedSnapshotId = expanded ? null : snapshot.id;
        this.detailTab = "diff";
        this.renderList();
      });

      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.textContent = this.i18n.restoreToThis;
      restoreBtn.className = "be-dialog-btn be-dialog-btn--secondary";
      restoreBtn.style.cssText =
        "padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;";
      restoreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ok = window.confirm(this.i18n.restoreConfirm);
        if (!ok) return;
        this.editorCore.versionHistory.restoreSnapshot(snapshot.id);
        this.dialog.close();
      });

      actionWrap.appendChild(detailBtn);
      actionWrap.appendChild(restoreBtn);
      header.appendChild(left);
      header.appendChild(actionWrap);
      row.appendChild(header);

      if (expanded) {
        const previewWrap = document.createElement("div");
        previewWrap.style.borderTop = "1px solid var(--border-color)";
        previewWrap.style.background = "var(--paper-bg)";

        const previewHeader = document.createElement("div");
        previewHeader.style.padding = "6px 10px";
        previewHeader.style.fontSize = "12px";
        previewHeader.style.color = "var(--text-secondary)";
        previewHeader.style.background = "var(--surface-soft)";
        previewHeader.style.borderBottom = "1px solid var(--border-color)";
        const previousLabel = previousSnapshot?.label || this.i18n.blankBase;
        previewHeader.textContent = this.i18n.restoreCompareTip(previousLabel);
        previewWrap.appendChild(previewHeader);

        const lines = this.getPreviewDiffLines(snapshot.id, previousSnapshotId);
        if (lines.length === 0) {
          const empty = document.createElement("div");
          empty.style.padding = "10px";
          empty.style.fontSize = "12px";
          empty.style.color = "var(--text-muted)";
          empty.textContent = this.i18n.noChanges;
          previewWrap.appendChild(empty);
        } else {
          lines.forEach((line) => {
            const lineRow = document.createElement("div");
            lineRow.style.display = "grid";
            lineRow.style.gridTemplateColumns = "44px 1fr 44px 1fr";
            lineRow.style.alignItems = "start";
            lineRow.style.fontSize = "12px";
            lineRow.style.fontFamily =
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
            lineRow.style.borderBottom = "1px solid color-mix(in srgb, var(--border-color) 70%, transparent)";

            const oldNo = document.createElement("div");
            oldNo.style.padding = "3px 8px";
            oldNo.style.color = "var(--text-muted)";
            oldNo.textContent =
              line.oldLineNumber === null ? "" : String(line.oldLineNumber);

            const oldText = document.createElement("div");
            oldText.style.padding = "3px 8px";
            oldText.style.whiteSpace = "nowrap";
            oldText.style.overflow = "hidden";
            oldText.style.textOverflow = "ellipsis";
            oldText.style.color = "var(--text-color)";
            oldText.style.borderRight = "1px solid var(--border-color)";
            oldText.textContent = line.type === "added" ? "" : line.oldText;

            const newNo = document.createElement("div");
            newNo.style.padding = "3px 8px";
            newNo.style.color = "var(--text-muted)";
            newNo.textContent =
              line.newLineNumber === null ? "" : String(line.newLineNumber);

            const newText = document.createElement("div");
            newText.style.padding = "3px 8px";
            newText.style.whiteSpace = "nowrap";
            newText.style.overflow = "hidden";
            newText.style.textOverflow = "ellipsis";
            newText.style.color = "var(--text-color)";
            newText.textContent = line.type === "deleted" ? "" : line.newText;

            if (line.type === "deleted") {
              oldNo.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
              oldText.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
            } else if (line.type === "added") {
              newNo.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
              newText.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
            } else {
              oldNo.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
              oldText.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
              newNo.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
              newText.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
            }

            lineRow.appendChild(oldNo);
            lineRow.appendChild(oldText);
            lineRow.appendChild(newNo);
            lineRow.appendChild(newText);
            previewWrap.appendChild(lineRow);
          });

          const footer = document.createElement("div");
          footer.style.padding = "8px 10px";
          footer.style.background = "var(--paper-bg)";

          const fullBtn = document.createElement("button");
          fullBtn.type = "button";
          fullBtn.textContent = this.i18n.fullDiff;
          fullBtn.className = "be-dialog-btn be-dialog-btn--secondary";
          fullBtn.style.cssText =
            "padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;";
          fullBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openFullDiffDialog(snapshot.id, previousSnapshotId);
          });
          footer.appendChild(fullBtn);
          previewWrap.appendChild(footer);
        }

        row.appendChild(previewWrap);
      }

      this.listRoot.appendChild(row);
    });
  }

  private renderDetail() {
    this.detailRoot.innerHTML = "";

    if (!this.activeSnapshotId) {
      const empty = document.createElement("div");
      empty.className = "be-p-3 be-text-sm";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.selectSnapshotDetail;
      this.detailRoot.appendChild(empty);
      return;
    }

    const diff = this.editorCore.versionHistory.getSnapshotDiff(
      this.activeSnapshotId,
    );
    if (!diff) {
      const empty = document.createElement("div");
      empty.className = "be-p-3 be-text-sm";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.detailUnavailable;
      this.detailRoot.appendChild(empty);
      return;
    }

    const blame = this.editorCore.versionHistory.getSnapshotBlame(
      this.activeSnapshotId,
    );

    const header = document.createElement("div");
    header.className =
      "be-flex be-items-center be-justify-between be-gap-2 be-px-3 be-py-2";
    header.style.background = "var(--surface-soft)";
    header.style.borderBottom = "1px solid var(--border-color)";

    const summary = document.createElement("div");
    summary.className = "be-text-xs";
    summary.style.color = "var(--text-secondary)";
    summary.textContent = this.buildDiffSummary(diff);

    const tabWrap = document.createElement("div");
    tabWrap.className = "be-flex be-gap-1";

    const diffBtn = this.createTabBtn(
      this.i18n.diffView,
      this.detailTab === "diff",
      () => {
        this.detailTab = "diff";
        this.renderDetail();
      },
    );
    const blameBtn = this.createTabBtn(
      this.i18n.blameView,
      this.detailTab === "blame",
      () => {
        this.detailTab = "blame";
        this.renderDetail();
      },
    );

    tabWrap.appendChild(diffBtn);
    tabWrap.appendChild(blameBtn);
    header.appendChild(summary);
    header.appendChild(tabWrap);

    const body = document.createElement("div");
    body.style.maxHeight = "340px";
    body.style.overflow = "auto";
    body.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    body.style.fontSize = "12px";

    if (this.detailTab === "diff") {
      this.renderDiffBody(body, diff);
    } else {
      this.renderBlameBody(body, blame);
    }

    this.detailRoot.appendChild(header);
    this.detailRoot.appendChild(body);
  }

  private createTabBtn(label: string, active: boolean, onClick: () => void) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className =
      "be-px-2.5 be-py-1 be-text-xs be-rounded-md be-border be-cursor-pointer";
    btn.style.borderColor = active ? "color-mix(in srgb, var(--primary-color) 45%, var(--border-color))" : "var(--border-color)";
    btn.style.background = active ? "color-mix(in srgb, var(--primary-color) 18%, var(--paper-bg))" : "var(--paper-bg)";
    btn.style.color = active ? "var(--primary-color)" : "var(--text-secondary)";
    btn.onclick = onClick;
    return btn;
  }

  private buildDiffSummary(diff: SnapshotDiffResult) {
    const added = diff.lines.filter((l) => l.type === "added").length;
    const deleted = diff.lines.filter((l) => l.type === "deleted").length;
    const modified = diff.lines.filter((l) => l.type === "modified").length;
    const base = diff.baseSnapshot ? `${diff.baseSnapshot.label}` : this.i18n.blankBaseline;
    return this.i18n.diffSummary(base, added, deleted, modified);
  }

  private renderDiffBody(root: HTMLElement, diff: SnapshotDiffResult) {
    if (diff.lines.length === 0) {
      const empty = document.createElement("div");
      empty.className = "be-p-3";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.noDiff;
      root.appendChild(empty);
      return;
    }

    diff.lines.forEach((line) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "52px 52px 1fr 170px";
      row.style.gap = "8px";
      row.style.padding = "4px 8px";
      row.style.borderBottom = "1px solid color-mix(in srgb, var(--border-color) 70%, transparent)";
      row.style.alignItems = "start";

      if (line.type === "added") row.style.background = "color-mix(in srgb, #22c55e 12%, var(--paper-bg))";
      if (line.type === "deleted") row.style.background = "color-mix(in srgb, var(--danger-color) 12%, var(--paper-bg))";
      if (line.type === "modified")
        row.style.background =
          "color-mix(in srgb, var(--primary-color) 12%, var(--paper-bg))";

      const oldNo = document.createElement("span");
      oldNo.style.color = "var(--text-muted)";
      oldNo.textContent =
        line.oldLineNumber === null ? "" : String(line.oldLineNumber);

      const newNo = document.createElement("span");
      newNo.style.color = "var(--text-muted)";
      newNo.textContent =
        line.newLineNumber === null ? "" : String(line.newLineNumber);

      const text = document.createElement("div");
      text.style.whiteSpace = "pre-wrap";
      text.style.wordBreak = "break-word";
      text.style.color = "var(--text-color)";
      text.textContent =
        line.type === "deleted"
          ? `- ${line.oldText}`
          : line.type === "added"
            ? `+ ${line.newText}`
            : line.type === "modified"
              ? `~ ${line.oldText}\n→ ${line.newText}`
              : `  ${line.newText}`;

      const meta = document.createElement("span");
      meta.style.color = "var(--text-muted)";
      meta.style.fontSize = "11px";
      meta.textContent = `${line.authorName} · ${formatTime(line.updatedAt, this.locale)}`;

      row.appendChild(oldNo);
      row.appendChild(newNo);
      row.appendChild(text);
      row.appendChild(meta);
      root.appendChild(row);
    });
  }

  private renderBlameBody(root: HTMLElement, blame: SnapshotBlameLine[]) {
    if (blame.length === 0) {
      const empty = document.createElement("div");
      empty.className = "be-p-3";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.noBlameLines;
      root.appendChild(empty);
      return;
    }

    blame.forEach((line) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "48px 170px 1fr";
      row.style.gap = "8px";
      row.style.padding = "4px 8px";
      row.style.borderBottom = "1px solid color-mix(in srgb, var(--border-color) 70%, transparent)";
      row.style.alignItems = "start";

      const no = document.createElement("span");
      no.style.color = "var(--text-muted)";
      no.textContent = String(line.lineNumber);

      const meta = document.createElement("span");
      meta.style.color = "var(--text-muted)";
      meta.style.fontSize = "11px";
      meta.textContent = `${line.authorName} · ${formatTime(line.updatedAt, this.locale)}`;

      const text = document.createElement("div");
      text.style.whiteSpace = "pre-wrap";
      text.style.wordBreak = "break-word";
      text.style.color = "var(--text-color)";
      text.textContent = line.text || " ";

      row.appendChild(no);
      row.appendChild(meta);
      row.appendChild(text);
      root.appendChild(row);
    });
  }

  private resolveBaseSnapshotForDiff(
    snapshots: ReturnType<EditorCore["versionHistory"]["listSnapshots"]>,
    index: number,
  ) {
    const current = snapshots[index];
    if (!current) return null;

    const immediate = snapshots[index + 1] || null;
    if (!immediate) return null;

    for (let i = index + 1; i < snapshots.length; i += 1) {
      const candidate = snapshots[i];
      if (!candidate) continue;
      const diff = this.editorCore.versionHistory.getSnapshotDiff(
        current.id,
        candidate.id,
      );
      if (!diff) continue;
      const hasChange = diff.lines.some((line) => line.type !== "context");
      if (hasChange) return candidate;
    }

    return immediate;
  }

  private getDiffStats(snapshotId: string, previousSnapshotId?: string) {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(
      snapshotId,
      previousSnapshotId,
    );
    if (!diff) return { added: 0, deleted: 0, modified: 0 };
    return {
      added: diff.lines.filter((line) => line.type === "added").length,
      deleted: diff.lines.filter((line) => line.type === "deleted").length,
      modified: diff.lines.filter((line) => line.type === "modified").length,
    };
  }

  private getPreviewDiffLines(
    snapshotId: string,
    previousSnapshotId?: string,
  ): SnapshotDiffLine[] {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(
      snapshotId,
      previousSnapshotId,
    );
    if (!diff) return [];
    return diff.lines.filter((line) => line.type !== "context").slice(0, 3);
  }

  private openFullDiffDialog(snapshotId: string, previousSnapshotId?: string) {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(
      snapshotId,
      previousSnapshotId,
    );
    if (!diff) return;

    const changed = diff.lines.filter((line) => line.type !== "context");

    const content = document.createElement("div");
    content.style.maxHeight = "70vh";
    content.style.overflow = "auto";
    content.style.border = "1px solid var(--border-color)";
    content.style.borderRadius = "8px";
    content.style.background = "var(--paper-bg)";

    const head = document.createElement("div");
    head.style.padding = "6px 10px";
    head.style.fontSize = "12px";
    head.style.color = "var(--text-secondary)";
    head.style.background = "var(--surface-soft)";
    head.style.borderBottom = "1px solid var(--border-color)";
    head.textContent = this.i18n.fullDiffHeader(
      diff.baseSnapshot?.label || this.i18n.blankBase,
    );
    content.appendChild(head);

    if (changed.length === 0) {
      const empty = document.createElement("div");
      empty.style.padding = "10px";
      empty.style.fontSize = "12px";
      empty.style.color = "var(--text-muted)";
      empty.textContent = this.i18n.noChanges;
      content.appendChild(empty);
    } else {
      const stats = {
        added: changed.filter((line) => line.type === "added").length,
        deleted: changed.filter((line) => line.type === "deleted").length,
        modified: changed.filter((line) => line.type === "modified").length,
      };

      const summary = document.createElement("div");
      summary.style.padding = "6px 10px";
      summary.style.fontSize = "12px";
      summary.style.color = "var(--text-secondary)";
      summary.style.borderBottom = "1px solid var(--border-color)";
      summary.textContent = `+${stats.added}  -${stats.deleted}  ~${stats.modified}`;
      content.appendChild(summary);

      const splitHead = document.createElement("div");
      splitHead.style.display = "grid";
      splitHead.style.gridTemplateColumns = "56px 1fr 56px 1fr";
      splitHead.style.borderBottom = "1px solid var(--border-color)";
      splitHead.style.background = "var(--surface-soft)";
      splitHead.style.fontSize = "12px";
      splitHead.style.color = "var(--text-secondary)";

      const oldHeadNo = document.createElement("div");
      oldHeadNo.style.padding = "6px 8px";
      oldHeadNo.textContent = this.i18n.oldLine;
      const oldHead = document.createElement("div");
      oldHead.style.padding = "6px 8px";
      oldHead.textContent = diff.baseSnapshot?.label || this.i18n.oldVersion;
      const newHeadNo = document.createElement("div");
      newHeadNo.style.padding = "6px 8px";
      newHeadNo.textContent = this.i18n.newLine;
      const newHead = document.createElement("div");
      newHead.style.padding = "6px 8px";
      newHead.textContent = diff.currentSnapshot.label;

      splitHead.appendChild(oldHeadNo);
      splitHead.appendChild(oldHead);
      splitHead.appendChild(newHeadNo);
      splitHead.appendChild(newHead);
      content.appendChild(splitHead);

      changed.forEach((line) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "44px 1fr 44px 1fr";
        row.style.fontSize = "12px";
        row.style.fontFamily =
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        row.style.borderBottom = "1px solid color-mix(in srgb, var(--border-color) 70%, transparent)";

        const oldNo = document.createElement("div");
        oldNo.style.padding = "3px 8px";
        oldNo.style.color = "var(--text-muted)";
        oldNo.textContent =
          line.oldLineNumber === null ? "" : String(line.oldLineNumber);

        const oldText = document.createElement("div");
        oldText.style.padding = "3px 8px";
        oldText.style.whiteSpace = "pre-wrap";
        oldText.style.wordBreak = "break-word";
        oldText.style.color = "var(--text-color)";
        oldText.style.borderRight = "1px solid var(--border-color)";
        oldText.textContent = line.type === "added" ? "" : line.oldText;

        const newNo = document.createElement("div");
        newNo.style.padding = "3px 8px";
        newNo.style.color = "var(--text-muted)";
        newNo.textContent =
          line.newLineNumber === null ? "" : String(line.newLineNumber);

        const newText = document.createElement("div");
        newText.style.padding = "3px 8px";
        newText.style.whiteSpace = "pre-wrap";
        newText.style.wordBreak = "break-word";
        newText.style.color = "var(--text-color)";
        newText.textContent = line.type === "deleted" ? "" : line.newText;

        if (line.type === "deleted") {
          oldNo.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
          oldText.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
        } else if (line.type === "added") {
          newNo.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
          newText.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
        } else {
          oldNo.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
          oldText.style.background = "color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))";
          newNo.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
          newText.style.background = "color-mix(in srgb, #22c55e 24%, var(--paper-bg))";
        }

        row.appendChild(oldNo);
        row.appendChild(oldText);
        row.appendChild(newNo);
        row.appendChild(newText);
        content.appendChild(row);
      });
    }

    const modal = new Dialog({
      title: this.i18n.completeDiffTitle,
      subtitle: this.i18n.fullDiffSubtitle(
        diff.currentSnapshot.label,
        diff.baseSnapshot?.label || this.i18n.blankBase,
        formatTime(diff.currentSnapshot.createdAt, this.locale),
      ),
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: "fileText",
      iconBgClass: "be-dialog-icon--primary",
      host: (this.editorCore.editor.options.element as HTMLElement).closest(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null,
      onClose: () => {},
      width: "70%",
    });
    modal.setContent(content);
    modal.show();
  }

  public show() {
    this.dialog.show();
  }
}
