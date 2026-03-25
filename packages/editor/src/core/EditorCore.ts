import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ImageEnhanced } from "../extensions/ImageEnhanced";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Comment } from "../extensions/Comment";
import { CustomCodeBlock } from "../extensions/CodeBlock";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../extensions/FontSize";
import { LineHeight } from "../extensions/LineHeight";
import { BlockHandle } from "../extensions/block-handle";
import { CurrentLineHighlight } from "../extensions/CurrentLineHighlight";
import { SelectionTooltip } from "../extensions/SelectionTooltip";
import { Exporter } from "../export/Exporter";
import { DocxImporter } from "../import/DocxImporter";
import { MarkdownImporter } from "../import/MarkdownImporter";
import {
  InteractionMode,
  InteractionState,
} from "../extensions/InteractionState";
import { Indent } from "../extensions/Indent";
import { SlashCommand } from "../extensions/SlashCommand";
import { Callout } from "../extensions/Callout";
import { SmartPaste } from "../extensions/SmartPaste";
import { BlockMultiSelect } from "../extensions/BlockMultiSelect";
import { BlockAnchor } from "../extensions/BlockAnchor";
import { VersionHistoryManager } from "./VersionHistory";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  DEFAULT_MARKDOWN_REGRESSION_CASES,
  MarkdownRegressionCase,
  MarkdownRegressionResult,
  normalizeMarkdownForCompare,
} from "../utils/markdownRegression";
import {
  PerformanceBenchmarkOptions,
  PerformanceBenchmarkResult,
  runEditorPerformanceBenchmark,
} from "../utils/performanceBenchmark";
import { resolveEditorI18n } from "../i18n";
import type { EditorI18n } from "../i18n";

// Simple Event Bus
type Listener = (...args: any[]) => void;
class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((fn) => fn(...args));
    }
  }

  off(event: string, fn: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }
}

export interface CollaborationOptions {
  enabled?: boolean;
  roomName?: string;
  websocketUrl?: string;
  user?: {
    name: string;
    color: string;
  };
}

export interface EditorCoreOptions {
  element: HTMLElement;
  content?: any;
  onUpdate?: (editor: Editor) => void;
  collaboration?: CollaborationOptions;
  i18n?: string | Partial<EditorI18n>;
}

export class EditorCore {
  public editor: Editor;
  public events: EventBus;
  public exporter: Exporter;
  public importer: DocxImporter;
  public markdownImporter!: MarkdownImporter;
  public versionHistory: VersionHistoryManager;
  public provider: WebsocketProvider | null = null;
  public i18n: EditorI18n;
  private ydoc: Y.Doc | null = null;

  constructor(options: EditorCoreOptions) {
    this.events = new EventBus();
    this.i18n = resolveEditorI18n(options.i18n);

    const collaborationEnabled = Boolean(options.collaboration?.enabled);
    const roomName = options.collaboration?.roomName || "block-editor-room";
    const websocketUrl = options.collaboration?.websocketUrl;
    const user =
      options.collaboration?.user ||
      ({
        name: `用户-${Math.random().toString(36).slice(2, 6)}`,
        color: `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`,
      } as const);

    if (collaborationEnabled) {
      this.ydoc = new Y.Doc();

      if (websocketUrl) {
        this.provider = new WebsocketProvider(
          websocketUrl,
          roomName,
          this.ydoc,
        );
      }
    }

    const extensions: any[] = [
      StarterKit.configure({
        codeBlock: false,
        history: collaborationEnabled ? false : undefined,
      }),
      ...(collaborationEnabled && this.ydoc
        ? [
            Collaboration.configure({
              document: this.ydoc,
            }),
          ]
        : []),
      ...(collaborationEnabled && this.provider
        ? [
            CollaborationCursor.configure({
              provider: this.provider,
              user,
            }),
          ]
        : []),
      CustomCodeBlock,
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      Comment,
      ImageEnhanced,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Underline,
      Subscript,
      Superscript,
      InteractionState,
      Indent,
      SlashCommand,
      Callout,
      SmartPaste,
      BlockMultiSelect,
      BlockAnchor,
      BlockHandle,
      CurrentLineHighlight,
      SelectionTooltip,
    ];

    this.editor = new Editor({
      element: options.element,
      extensions,
      content: options.content,
      onUpdate: ({ editor }) => {
        options.onUpdate?.(editor);
        this.syncInteractionMode(editor);
        this.versionHistory.captureAutoSnapshot();
        this.events.emit("update", editor);
      },
      onSelectionUpdate: ({ editor }) => {
        this.syncInteractionMode(editor);
        this.events.emit("selectionUpdate", editor);
      },
      onTransaction: ({ editor }) => {
        this.syncInteractionMode(editor);
        this.events.emit("transaction", editor);
      },
    });

    (this.editor as Editor & { __core?: EditorCore }).__core = this;

    this.exporter = new Exporter(this.editor);
    this.importer = new DocxImporter(this.editor);
    this.markdownImporter = new MarkdownImporter(this.editor);
    this.versionHistory = new VersionHistoryManager(this.editor, {
      authorName: user.name,
      getAuthorName: () => user.name,
    });
    this.syncInteractionMode(this.editor);
  }

  private syncInteractionMode(editor: Editor) {
    const storage = editor.storage.interactionState as
      | {
          mode: InteractionMode;
          blockMenuOpen: boolean;
        }
      | undefined;

    if (!storage || storage.mode === "block-selection") {
      if (storage?.mode === "block-selection") {
        this.events.emit("modeChange", storage.mode);
      }
      return;
    }

    const nextMode: InteractionMode = editor.isActive("table")
      ? "table-editing"
      : editor.state.selection.empty
        ? "idle"
        : "text-selection";

    if (storage.mode !== nextMode) {
      editor.commands.setInteractionMode(nextMode);
    }

    this.events.emit("modeChange", nextMode);
  }

  public destroy() {
    this.editor.destroy();
    this.importer.destroy();
    this.markdownImporter.destroy();
    this.provider?.destroy();
    this.provider = null;
    this.ydoc?.destroy();
    this.ydoc = null;
  }

  public getJSON() {
    return this.editor.getJSON();
  }

  public getHTML() {
    return this.editor.getHTML();
  }

  // Command dispatcher — maps plain string commands to Tiptap chain calls.
  // Supports all built-in Tiptap commands and custom extensions.
  public exec(command: string, options?: any): boolean {
    const cmds = this.editor.commands as Record<
      string,
      (...args: any[]) => boolean
    >;
    if (typeof cmds[command] !== "function") {
      console.warn(`[EditorCore.exec] Unknown command: "${command}"`);
      return false;
    }
    return options !== undefined ? cmds[command](options) : cmds[command]();
  }

  public async runMarkdownRegressionMatrix(
    cases: MarkdownRegressionCase[] = DEFAULT_MARKDOWN_REGRESSION_CASES,
  ): Promise<MarkdownRegressionResult[]> {
    const original = this.editor.getJSON();
    const results: MarkdownRegressionResult[] = [];

    try {
      for (const testCase of cases) {
        this.markdownImporter.importText(testCase.input);
        const output = await this.exporter.toMarkdownText();
        const normalized = normalizeMarkdownForCompare(output);
        const missing = testCase.expectedIncludes.filter(
          (frag) => !normalized.includes(normalizeMarkdownForCompare(frag)),
        );

        results.push({
          name: testCase.name,
          passed: missing.length === 0,
          missing,
          output,
        });
      }
    } finally {
      this.editor.commands.setContent(original, true);
    }

    return results;
  }

  public async runPerformanceBenchmark(
    options: PerformanceBenchmarkOptions = {},
  ): Promise<PerformanceBenchmarkResult> {
    const result = await runEditorPerformanceBenchmark(this.editor, options);

    try {
      const path =
        typeof window !== "undefined" ? window.location.pathname : "default";
      localStorage.setItem(
        `be-performance-baseline-v1:${path}`,
        JSON.stringify(result),
      );
    } catch {
      // ignore persistence errors
    }

    return result;
  }
}
