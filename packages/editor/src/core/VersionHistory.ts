import { Editor, JSONContent } from "@tiptap/core";

export interface VersionSnapshot {
  id: string;
  createdAt: number;
  source: "auto" | "manual" | "restore";
  label: string;
  excerpt: string;
  content: JSONContent;
}

export type VersionSnapshotMeta = Omit<VersionSnapshot, "content">;

export interface VersionHistoryOptions {
  maxSnapshots?: number;
  autoSnapshotIntervalMs?: number;
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

  constructor(editor: Editor, options: VersionHistoryOptions = {}) {
    this.editor = editor;
    this.maxSnapshots = options.maxSnapshots || DEFAULT_MAX_SNAPSHOTS;
    this.autoSnapshotIntervalMs = options.autoSnapshotIntervalMs || DEFAULT_INTERVAL;
    this.storageKey = this.buildStorageKey();
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

  private buildExcerpt() {
    const text = (this.editor.state.doc.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return "（空文档）";
    return text.slice(0, 60);
  }

  private createId() {
    return `vh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildStorageKey() {
    const path = typeof window !== "undefined" ? window.location.pathname : "default";
    return `be-version-history-v1:${path}`;
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
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as VersionSnapshot[];
      if (!Array.isArray(parsed)) return;
      this.snapshots = parsed
        .filter((item) => item && item.id && item.content)
        .slice(0, this.maxSnapshots);
    } catch {
      this.snapshots = [];
    }
  }
}
