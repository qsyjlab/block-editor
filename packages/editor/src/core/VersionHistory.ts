import { Editor, JSONContent } from "@tiptap/core";

export interface VersionSnapshot {
  id: string;
  createdAt: number;
  source: "auto" | "manual" | "restore";
  label: string;
  excerpt: string;
  authorName: string;
  content: JSONContent;
}

export type VersionSnapshotMeta = Omit<VersionSnapshot, "content">;

export type SnapshotDiffLineType = "added" | "deleted" | "modified" | "context";

export interface SnapshotDiffLine {
  type: SnapshotDiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  oldText: string;
  newText: string;
  authorName: string;
  updatedAt: number;
}

export interface SnapshotBlameLine {
  lineNumber: number;
  text: string;
  authorName: string;
  updatedAt: number;
}

export interface SnapshotDiffResult {
  currentSnapshot: VersionSnapshotMeta;
  baseSnapshot: VersionSnapshotMeta | null;
  lines: SnapshotDiffLine[];
}

interface RawDiffLine {
  type: "added" | "deleted" | "context";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  text: string;
}

export interface VersionHistoryOptions {
  maxSnapshots?: number;
  autoSnapshotIntervalMs?: number;
  authorName?: string;
  getAuthorName?: () => string;
}

const DEFAULT_MAX_SNAPSHOTS = 30;
const DEFAULT_INTERVAL = 15000;

export class VersionHistoryManager {
  private editor: Editor;
  private snapshots: VersionSnapshot[] = [];
  private maxSnapshots: number;
  private autoSnapshotIntervalMs: number;
  private lastContentHash = "";
  private lastAutoSnapshotAt = 0;
  private suspendAutoCapture = false;
  private storageKey: string;
  private authorName: string;
  private getAuthorName: (() => string) | null;

  constructor(editor: Editor, options: VersionHistoryOptions = {}) {
    this.editor = editor;
    this.maxSnapshots = options.maxSnapshots || DEFAULT_MAX_SNAPSHOTS;
    this.autoSnapshotIntervalMs = options.autoSnapshotIntervalMs || DEFAULT_INTERVAL;
    this.storageKey = this.buildStorageKey();
    this.authorName = options.authorName || "当前用户";
    this.getAuthorName = options.getAuthorName || null;
    this.load();

    if (this.snapshots.length > 0) {
      this.lastContentHash = JSON.stringify(this.snapshots[0].content);
    } else {
      this.createSnapshot("初始版本", "manual", true);
    }
  }

  public captureAutoSnapshot() {
    if (this.suspendAutoCapture) return;
    const now = Date.now();
    if (now - this.lastAutoSnapshotAt < this.autoSnapshotIntervalMs) return;

    this.lastAutoSnapshotAt = now;
    this.createSnapshot("自动保存", "auto");
  }

  public createManualSnapshot(label = "手动快照") {
    return this.createSnapshot(label, "manual", true);
  }

  public listSnapshots(): VersionSnapshotMeta[] {
    return this.snapshots.map(({ content, ...meta }) => meta);
  }

  public getSnapshot(snapshotId: string): VersionSnapshotMeta | null {
    const target = this.snapshots.find((item) => item.id === snapshotId);
    if (!target) return null;
    const { content, ...meta } = target;
    return meta;
  }

  public getSnapshotDiff(snapshotId: string, baseSnapshotId?: string): SnapshotDiffResult | null {
    const currentIndex = this.snapshots.findIndex((item) => item.id === snapshotId);
    if (currentIndex < 0) return null;

    const current = this.snapshots[currentIndex];
    const base = baseSnapshotId
      ? this.snapshots.find((item) => item.id === baseSnapshotId) || null
      : this.snapshots[currentIndex + 1] || null;

    const currentLines = this.contentToLines(current.content);
    const baseLines = base ? this.contentToLines(base.content) : [];
    const rawDiff = this.buildRawDiff(baseLines, currentLines);

    const lines: SnapshotDiffLine[] = [];
    for (let i = 0; i < rawDiff.length; i += 1) {
      const line = rawDiff[i];
      const next = rawDiff[i + 1];

      if (
        line.type === "deleted" &&
        next?.type === "added" &&
        this.isLikelyModifiedPair(line.text, next.text)
      ) {
        lines.push({
          type: "modified",
          oldLineNumber: line.oldLineNumber,
          newLineNumber: next.newLineNumber,
          oldText: line.text,
          newText: next.text,
          authorName: current.authorName,
          updatedAt: current.createdAt,
        });
        i += 1;
        continue;
      }

      if (line.type === "deleted") {
        lines.push({
          type: "deleted",
          oldLineNumber: line.oldLineNumber,
          newLineNumber: null,
          oldText: line.text,
          newText: "",
          authorName: base?.authorName || "未知",
          updatedAt: base?.createdAt || current.createdAt,
        });
        continue;
      }

      if (line.type === "added") {
        lines.push({
          type: "added",
          oldLineNumber: null,
          newLineNumber: line.newLineNumber,
          oldText: "",
          newText: line.text,
          authorName: current.authorName,
          updatedAt: current.createdAt,
        });
        continue;
      }

      lines.push({
        type: "context",
        oldLineNumber: line.oldLineNumber,
        newLineNumber: line.newLineNumber,
        oldText: line.text,
        newText: line.text,
        authorName: current.authorName,
        updatedAt: current.createdAt,
      });
    }

    const { content: _currentContent, ...currentMeta } = current;
    const baseMeta = base
      ? (() => {
          const { content: _baseContent, ...meta } = base;
          return meta;
        })()
      : null;

    return {
      currentSnapshot: currentMeta,
      baseSnapshot: baseMeta,
      lines,
    };
  }

  public getSnapshotBlame(snapshotId: string): SnapshotBlameLine[] {
    const targetIndex = this.snapshots.findIndex((item) => item.id === snapshotId);
    if (targetIndex < 0) return [];

    const chain = [...this.snapshots].reverse();
    const target = this.snapshots[targetIndex];
    const blame: SnapshotBlameLine[] = [];

    let prevLines: string[] = [];
    let prevBlame: SnapshotBlameLine[] = [];

    for (const snapshot of chain) {
      const nextLines = this.contentToLines(snapshot.content);

      if (prevLines.length === 0) {
        prevBlame = nextLines.map((text, idx) => ({
          lineNumber: idx + 1,
          text,
          authorName: snapshot.authorName,
          updatedAt: snapshot.createdAt,
        }));
      } else {
        const raw = this.buildRawDiff(prevLines, nextLines);
        const nextBlame: SnapshotBlameLine[] = [];
        let prevPtr = 0;

        raw.forEach((line) => {
          if (line.type === "context") {
            const keep = prevBlame[prevPtr];
            nextBlame.push({
              lineNumber: 0,
              text: line.text,
              authorName: keep?.authorName || snapshot.authorName,
              updatedAt: keep?.updatedAt || snapshot.createdAt,
            });
            prevPtr += 1;
            return;
          }

          if (line.type === "deleted") {
            prevPtr += 1;
            return;
          }

          nextBlame.push({
            lineNumber: 0,
            text: line.text,
            authorName: snapshot.authorName,
            updatedAt: snapshot.createdAt,
          });
        });

        prevBlame = nextBlame.map((item, idx) => ({
          ...item,
          lineNumber: idx + 1,
        }));
      }

      prevLines = nextLines;
      if (snapshot.id === target.id) {
        blame.push(...prevBlame);
        break;
      }
    }

    return blame;
  }

  public restoreSnapshot(snapshotId: string): boolean {
    const target = this.snapshots.find((item) => item.id === snapshotId);
    if (!target) return false;

    this.createSnapshot("回滚前快照", "restore", true);

    this.suspendAutoCapture = true;
    this.editor.commands.setContent(target.content, true);
    this.suspendAutoCapture = false;

    this.lastContentHash = JSON.stringify(target.content);
    this.lastAutoSnapshotAt = Date.now();
    return true;
  }

  private createSnapshot(label: string, source: VersionSnapshot["source"], force = false) {
    const content = this.editor.getJSON();
    const hash = JSON.stringify(content);

    if (!force && hash === this.lastContentHash) {
      return null;
    }

    const snapshot: VersionSnapshot = {
      id: this.createId(),
      createdAt: Date.now(),
      source,
      label,
      excerpt: this.buildExcerpt(),
      authorName: this.resolveAuthorName(),
      content,
    };

    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
    }

    this.lastContentHash = hash;
    this.persist();
    return snapshot;
  }

  private resolveAuthorName() {
    const dynamicName = this.getAuthorName?.().trim();
    if (dynamicName) return dynamicName;
    return this.authorName;
  }

  private buildExcerpt() {
    const text = (this.editor.state.doc.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return "（空文档）";
    return text.slice(0, 60);
  }

  private contentToLines(content: JSONContent): string[] {
    const text = this.serializeJsonToText(content)
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd();

    if (!text) return [];
    return text.split("\n");
  }

  private serializeJsonToText(node: JSONContent | JSONContent[] | null | undefined): string {
    if (!node) return "";

    if (Array.isArray(node)) {
      return node.map((item) => this.serializeJsonToText(item)).join("");
    }

    if (node.type === "text") {
      return typeof node.text === "string" ? node.text : "";
    }

    if (node.type === "hardBreak") {
      return "\n";
    }

    if (node.type === "horizontalRule") {
      return "---\n";
    }

    if (node.type === "image") {
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
      return alt ? `[image] ${alt}\n` : "[image]\n";
    }

    const child = this.serializeJsonToText(node.content as JSONContent[] | undefined);
    if (this.isBlockNode(node.type)) {
      return `${child}\n`;
    }

    return child;
  }

  private isBlockNode(type: string | undefined) {
    if (!type) return false;
    return [
      "doc",
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "orderedList",
      "taskList",
      "listItem",
      "taskItem",
      "codeBlock",
      "callout",
      "table",
      "tableRow",
      "tableCell",
      "tableHeader",
    ].includes(type);
  }

  private buildRawDiff(oldLines: string[], newLines: string[]): RawDiffLine[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const ops: Array<{ type: "added" | "deleted" | "context"; text: string }> = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        ops.push({ type: "context", text: oldLines[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "added", text: newLines[j - 1] });
        j -= 1;
      } else {
        ops.push({ type: "deleted", text: oldLines[i - 1] });
        i -= 1;
      }
    }

    ops.reverse();

    let oldNo = 1;
    let newNo = 1;
    return ops.map((op) => {
      if (op.type === "context") {
        const item: RawDiffLine = {
          type: "context",
          oldLineNumber: oldNo,
          newLineNumber: newNo,
          text: op.text,
        };
        oldNo += 1;
        newNo += 1;
        return item;
      }

      if (op.type === "deleted") {
        const item: RawDiffLine = {
          type: "deleted",
          oldLineNumber: oldNo,
          newLineNumber: null,
          text: op.text,
        };
        oldNo += 1;
        return item;
      }

      const item: RawDiffLine = {
        type: "added",
        oldLineNumber: null,
        newLineNumber: newNo,
        text: op.text,
      };
      newNo += 1;
      return item;
    });
  }

  private isLikelyModifiedPair(oldText: string, newText: string) {
    const a = oldText.trim();
    const b = newText.trim();
    if (!a || !b) return false;
    if (a === b) return true;

    const maxLen = Math.max(a.length, b.length);
    const minLen = Math.min(a.length, b.length);
    if (maxLen === 0) return false;

    const lengthGapRatio = (maxLen - minLen) / maxLen;
    if (lengthGapRatio > 0.7) return false;

    let prefix = 0;
    const prefixLimit = minLen;
    while (prefix < prefixLimit && a[prefix] === b[prefix]) {
      prefix += 1;
    }

    let suffix = 0;
    while (
      suffix < minLen - prefix &&
      a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    const commonRatio = (prefix + suffix) / minLen;
    if (commonRatio >= 0.35) return true;

    const aTokens = new Set(a.split(/\s+/).filter(Boolean));
    const bTokens = new Set(b.split(/\s+/).filter(Boolean));
    if (!aTokens.size || !bTokens.size) return false;

    let overlap = 0;
    aTokens.forEach((token) => {
      if (bTokens.has(token)) overlap += 1;
    });
    const tokenRatio = overlap / Math.min(aTokens.size, bTokens.size);

    return tokenRatio >= 0.5;
  }

  private createId() {
    return `vh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildStorageKey() {
    const path = typeof window !== "undefined" ? window.location.pathname : "default";
    return `be-version-history-v2:${path}`;
  }

  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.snapshots));
    } catch {
      // ignore
    }
  }

  private load() {
    try {
      const current = localStorage.getItem(this.storageKey);
      const legacy = localStorage.getItem(this.storageKey.replace("v2", "v1"));
      const raw = current || legacy;
      if (!raw) return;
      const parsed = JSON.parse(raw) as VersionSnapshot[];
      if (!Array.isArray(parsed)) return;
      this.snapshots = parsed
        .filter((item) => item && item.id && item.content)
        .map((item) => ({
          ...item,
          authorName: item.authorName || "未知",
        }))
        .slice(0, this.maxSnapshots);
    } catch {
      this.snapshots = [];
    }
  }
}
