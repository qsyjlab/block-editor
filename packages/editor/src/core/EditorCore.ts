import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ImageEnhanced } from '../extensions/ImageEnhanced'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Link from '@tiptap/extension-link'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Comment } from '../extensions/Comment'
import { CustomCodeBlock } from '../extensions/CodeBlock'
import FontFamily from '@tiptap/extension-font-family'
import { FontSize } from '../extensions/FontSize'
import { LineHeight } from '../extensions/LineHeight'
import { BlockHandle } from '../extensions/block-handle'
import { CurrentLineHighlight } from '../extensions/CurrentLineHighlight'
import { SelectionTooltip } from '../extensions/SelectionTooltip'
import { FindReplace } from '../extensions/FindReplace'
import { Exporter } from '../export/Exporter'
import { DocxImporter } from '../import/DocxImporter'
import { MarkdownImporter } from '../import/MarkdownImporter'
import { InteractionMode, InteractionState } from '../extensions/InteractionState'
import { Indent } from '../extensions/Indent'
import { SlashCommand } from '../extensions/SlashCommand'
import { Callout } from '../extensions/Callout'
import { SmartPaste } from '../extensions/SmartPaste'
import { BlockMultiSelect } from '../extensions/BlockMultiSelect'
import { BlockAnchor } from '../extensions/BlockAnchor'
import { VersionHistoryManager } from './VersionHistory'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {
  DEFAULT_MARKDOWN_REGRESSION_CASES,
  MarkdownRegressionCase,
  MarkdownRegressionResult,
  normalizeMarkdownForCompare,
} from '../utils/markdownRegression'
import {
  PerformanceBenchmarkOptions,
  PerformanceBenchmarkResult,
  runEditorPerformanceBenchmark,
} from '../utils/performanceBenchmark'
import { resolveEditorI18n } from '../i18n'
import type { EditorI18n } from '../i18n'
import type { EditorUIConfig } from '../ui/config/operation-bars'
import { ShortcutManager } from './ShortcutManager'

// Simple Event Bus
type Listener = (...args: any[]) => void
class EventBus {
  private listeners: Record<string, Listener[]> = {}

  on(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(fn)
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((fn) => fn(...args))
    }
  }

  off(event: string, fn: Listener) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn)
  }
}

export interface CollaborationOptions {
  enabled?: boolean
  roomName?: string
  websocketUrl?: string
  user?: {
    name: string
    color: string
  }
}

export interface EditorCoreOptions {
  element: HTMLElement
  content?: any
  onUpdate?: (editor: Editor) => void
  imageCaptionEnabled?: boolean
  collaboration?: CollaborationOptions
  i18n?: string | Partial<EditorI18n>
  uiConfig?: EditorUIConfig
}

export class EditorCore {
  public editor: Editor
  public events: EventBus
  public exporter: Exporter
  public importer: DocxImporter
  public markdownImporter!: MarkdownImporter
  public versionHistory: VersionHistoryManager
  public provider: WebsocketProvider | null = null
  public i18n: EditorI18n
  public uiConfig?: EditorUIConfig
  public shortcuts: ShortcutManager
  private ydoc: Y.Doc | null = null
  private shortcutDisposers: Array<() => void> = []

  constructor(options: EditorCoreOptions) {
    this.events = new EventBus()
    this.i18n = resolveEditorI18n(options.i18n)
    this.uiConfig = options.uiConfig
    this.shortcuts = new ShortcutManager()

    const collaborationEnabled = Boolean(options.collaboration?.enabled)
    const roomName = options.collaboration?.roomName || 'block-editor-room'
    const websocketUrl = options.collaboration?.websocketUrl
    const user =
      options.collaboration?.user ||
      ({
        name: `user-${Math.random().toString(36).slice(2, 6)}`,
        color: `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`,
      } as const)

    if (collaborationEnabled) {
      this.ydoc = new Y.Doc()

      if (websocketUrl) {
        this.provider = new WebsocketProvider(websocketUrl, roomName, this.ydoc)
      }
    }

    const extensions: any[] = [
      StarterKit.configure({
        codeBlock: false,
        dropcursor: false,
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
      CustomCodeBlock.configure({
        i18n: this.i18n.codeBlock,
      }),
      Placeholder.configure({
        placeholder: this.i18n.slashCommand.editorPlaceholder,
      }),
      Comment.configure({
        i18n: this.i18n.commentExtension,
      }),
      ImageEnhanced.configure({
        i18n: this.i18n.imageEnhanced,
        enableCaption: options.imageCaptionEnabled ?? false,
      }),
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
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Underline,
      Subscript,
      Superscript,
      InteractionState,
      Indent,
      SlashCommand.configure({
        i18n: this.i18n.slashCommand,
      }),
      Callout.configure({
        i18n: this.i18n.callout,
      }),
      SmartPaste,
      BlockMultiSelect,
      BlockAnchor,
      BlockHandle.configure({
        i18n: this.i18n.blockHandle,
      }),
      CurrentLineHighlight,
      SelectionTooltip,
      FindReplace,
    ]

    this.editor = new Editor({
      element: options.element,
      extensions,
      content: options.content,
      onUpdate: ({ editor }: { editor: Editor }) => {
        options.onUpdate?.(editor)
        this.syncInteractionMode(editor)
        this.versionHistory.captureAutoSnapshot()
        this.events.emit('update', editor)
      },
      onSelectionUpdate: ({ editor }: { editor: Editor }) => {
        this.syncInteractionMode(editor)
        this.events.emit('selectionUpdate', editor)
      },
      onTransaction: ({ editor }: { editor: Editor }) => {
        this.syncInteractionMode(editor)
        this.events.emit('transaction', editor)
      },
      ...(this.uiConfig ? ({ uiConfig: this.uiConfig } as any) : {}),
    } as any)
    ;(this.editor as Editor & { __core?: EditorCore }).__core = this

    this.exporter = new Exporter(this.editor)
    this.importer = new DocxImporter(this.editor)
    this.markdownImporter = new MarkdownImporter(this.editor)
    this.versionHistory = new VersionHistoryManager(this.editor, {
      authorName: user.name,
      getAuthorName: () => user.name,
      i18n: this.i18n.versionHistoryCore,
    })
    this.syncInteractionMode(this.editor)
    this.registerDefaultShortcuts()
  }

  private syncInteractionMode(editor: Editor) {
    const storage = editor.storage.interactionState as
      | {
          mode: InteractionMode
          blockMenuOpen: boolean
        }
      | undefined

    if (!storage || storage.mode === 'block-selection') {
      if (storage?.mode === 'block-selection') {
        this.events.emit('modeChange', storage.mode)
      }
      return
    }

    const nextMode: InteractionMode = editor.isActive('table')
      ? 'table-editing'
      : editor.state.selection.empty
        ? 'idle'
        : 'text-selection'

    if (storage.mode !== nextMode) {
      editor.commands.setInteractionMode(nextMode)
    }

    this.events.emit('modeChange', nextMode)
  }

  public destroy() {
    this.shortcutDisposers.forEach((dispose) => dispose())
    this.shortcutDisposers = []
    this.shortcuts.stop()
    this.editor.destroy()
    this.importer.destroy()
    this.markdownImporter.destroy()
    this.provider?.destroy()
    this.provider = null
    this.ydoc?.destroy()
    this.ydoc = null
  }

  private registerDefaultShortcuts() {
    const register = (def: Parameters<ShortcutManager['registerShortcut']>[0]) => {
      this.shortcutDisposers.push(this.shortcuts.registerShortcut(def))
    }

    const runCommand = (command: string, args?: any) => {
      this.exec(command, args)
    }

    register({
      id: 'core.undo',
      source: 'EditorCore',
      scope: 'editor',
      command: 'undo',
      combo: { mac: 'Mod+z', windows: 'Mod+z' },
      priority: 70,
      run: () => runCommand('undo'),
    })
    register({
      id: 'core.redo',
      source: 'EditorCore',
      scope: 'editor',
      command: 'redo',
      combo: { mac: 'Shift+Mod+z', windows: 'Shift+Mod+z' },
      priority: 70,
      run: () => runCommand('redo'),
    })
    register({
      id: 'core.redoAltWin',
      source: 'EditorCore',
      scope: 'editor',
      command: 'redo',
      combo: { mac: 'Mod+y', windows: 'Mod+y' },
      priority: 70,
      run: () => runCommand('redo'),
    })

    register({
      id: 'core.bold',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleBold',
      combo: { mac: 'Mod+b', windows: 'Mod+b' },
      priority: 60,
      run: () => runCommand('toggleBold'),
    })
    register({
      id: 'core.italic',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleItalic',
      combo: { mac: 'Mod+i', windows: 'Mod+i' },
      priority: 60,
      run: () => runCommand('toggleItalic'),
    })
    register({
      id: 'core.underline',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleUnderline',
      combo: { mac: 'Mod+u', windows: 'Mod+u' },
      priority: 60,
      run: () => runCommand('toggleUnderline'),
    })
    register({
      id: 'core.strike',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleStrike',
      combo: { mac: 'Shift+Mod+x', windows: 'Shift+Mod+x' },
      priority: 60,
      run: () => runCommand('toggleStrike'),
    })
    register({
      id: 'core.code',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleCode',
      combo: { mac: 'Mod+e', windows: 'Mod+e' },
      priority: 60,
      run: () => runCommand('toggleCode'),
    })
    register({
      id: 'core.highlight',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleHighlight',
      combo: { mac: 'Shift+Mod+h', windows: 'Shift+Mod+h' },
      priority: 60,
      run: () => runCommand('toggleHighlight'),
    })
    register({
      id: 'core.codeBlock',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleCodeBlock',
      combo: { mac: 'Alt+Mod+c', windows: 'Alt+Mod+c' },
      priority: 60,
      run: () => runCommand('toggleCodeBlock'),
    })
    register({
      id: 'core.clearFormatting',
      source: 'EditorCore',
      scope: 'editor',
      command: 'clearFormatting',
      combo: { mac: 'Alt+Mod+0', windows: 'Alt+Mod+0' },
      priority: 60,
      run: () => {
        this.editor.chain().focus().unsetAllMarks().clearNodes().run()
      },
    })
    register({
      id: 'core.indent',
      source: 'EditorCore',
      scope: 'editor',
      command: 'indent',
      combo: { mac: 'Mod+]', windows: 'Mod+]' },
      priority: 60,
      run: () => runCommand('indent'),
    })
    register({
      id: 'core.outdent',
      source: 'EditorCore',
      scope: 'editor',
      command: 'outdent',
      combo: { mac: 'Mod+[', windows: 'Mod+[' },
      priority: 60,
      run: () => runCommand('outdent'),
    })
    register({
      id: 'core.bulletList',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleBulletList',
      combo: { mac: 'Shift+Mod+8', windows: 'Shift+Mod+8' },
      priority: 60,
      run: () => runCommand('toggleBulletList'),
    })
    register({
      id: 'core.orderedList',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleOrderedList',
      combo: { mac: 'Shift+Mod+7', windows: 'Shift+Mod+7' },
      priority: 60,
      run: () => runCommand('toggleOrderedList'),
    })
    register({
      id: 'core.taskList',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleTaskList',
      combo: { mac: 'Shift+Mod+9', windows: 'Shift+Mod+9' },
      priority: 60,
      run: () => runCommand('toggleTaskList'),
    })
    register({
      id: 'core.blockquote',
      source: 'EditorCore',
      scope: 'editor',
      command: 'toggleBlockquote',
      combo: { mac: 'Shift+Mod+b', windows: 'Shift+Mod+b' },
      priority: 60,
      run: () => runCommand('toggleBlockquote'),
    })
    register({
      id: 'core.openCommentPanel',
      source: 'EditorCore',
      scope: 'comment',
      command: 'addComment',
      combo: { mac: 'Alt+Mod+m', windows: 'Alt+Mod+m' },
      priority: 80,
      run: () => this.events.emit('openCommentPanel'),
    })

    register({
      id: 'multiselect.delete',
      source: 'EditorCore',
      scope: 'selection',
      command: 'deleteSelectedBlocks',
      combo: { mac: 'Backspace', windows: 'Backspace' },
      priority: 120,
      allowInInput: true,
      when: () => {
        const storage = this.editor.storage.blockMultiSelect as
          | { selectedPositions?: Set<number> }
          | undefined
        return (storage?.selectedPositions?.size || 0) > 0
      },
      run: () => runCommand('deleteSelectedBlocks'),
    })
    register({
      id: 'multiselect.deleteForward',
      source: 'EditorCore',
      scope: 'selection',
      command: 'deleteSelectedBlocks',
      combo: { mac: 'Delete', windows: 'Delete' },
      priority: 120,
      allowInInput: true,
      when: () => {
        const storage = this.editor.storage.blockMultiSelect as
          | { selectedPositions?: Set<number> }
          | undefined
        return (storage?.selectedPositions?.size || 0) > 0
      },
      run: () => runCommand('deleteSelectedBlocks'),
    })
    register({
      id: 'multiselect.moveUp',
      source: 'EditorCore',
      scope: 'selection',
      command: 'moveSelectedBlocks',
      combo: { mac: 'Alt+Up', windows: 'Alt+Up' },
      priority: 120,
      allowInInput: true,
      when: () => {
        const storage = this.editor.storage.blockMultiSelect as
          | { selectedPositions?: Set<number> }
          | undefined
        return (storage?.selectedPositions?.size || 0) > 0
      },
      run: () => runCommand('moveSelectedBlocks', 'up'),
    })
    register({
      id: 'multiselect.moveDown',
      source: 'EditorCore',
      scope: 'selection',
      command: 'moveSelectedBlocks',
      combo: { mac: 'Alt+Down', windows: 'Alt+Down' },
      priority: 120,
      allowInInput: true,
      when: () => {
        const storage = this.editor.storage.blockMultiSelect as
          | { selectedPositions?: Set<number> }
          | undefined
        return (storage?.selectedPositions?.size || 0) > 0
      },
      run: () => runCommand('moveSelectedBlocks', 'down'),
    })

    const tableWhen = () => this.editor.isActive('table')
    register({
      id: 'table.addRowBefore',
      source: 'EditorCore',
      scope: 'table',
      command: 'addRowBefore',
      combo: { mac: 'Alt+Mod+Up', windows: 'Alt+Mod+Up' },
      priority: 95,
      when: tableWhen,
      run: () => runCommand('addRowBefore'),
    })
    register({
      id: 'table.addRowAfter',
      source: 'EditorCore',
      scope: 'table',
      command: 'addRowAfter',
      combo: { mac: 'Alt+Mod+Down', windows: 'Alt+Mod+Down' },
      priority: 95,
      when: tableWhen,
      run: () => runCommand('addRowAfter'),
    })
    register({
      id: 'table.addColumnBefore',
      source: 'EditorCore',
      scope: 'table',
      command: 'addColumnBefore',
      combo: { mac: 'Alt+Mod+Left', windows: 'Alt+Mod+Left' },
      priority: 95,
      when: tableWhen,
      run: () => runCommand('addColumnBefore'),
    })
    register({
      id: 'table.addColumnAfter',
      source: 'EditorCore',
      scope: 'table',
      command: 'addColumnAfter',
      combo: { mac: 'Alt+Mod+Right', windows: 'Alt+Mod+Right' },
      priority: 95,
      when: tableWhen,
      run: () => runCommand('addColumnAfter'),
    })
  }

  public getJSON() {
    return this.editor.getJSON()
  }

  public getHTML() {
    return this.editor.getHTML()
  }

  // Command dispatcher — maps plain string commands to Tiptap chain calls.
  // Supports all built-in Tiptap commands and custom extensions.
  public exec(command: string, options?: any): boolean {
    const cmds = this.editor.commands as Record<string, (...args: any[]) => boolean>
    if (typeof cmds[command] !== 'function') {
      console.warn(`[EditorCore.exec] Unknown command: "${command}"`)
      return false
    }
    return options !== undefined ? cmds[command](options) : cmds[command]()
  }

  public async runMarkdownRegressionMatrix(
    cases: MarkdownRegressionCase[] = DEFAULT_MARKDOWN_REGRESSION_CASES,
  ): Promise<MarkdownRegressionResult[]> {
    const original = this.editor.getJSON()
    const results: MarkdownRegressionResult[] = []

    try {
      for (const testCase of cases) {
        this.markdownImporter.importText(testCase.input)
        const output = await this.exporter.toMarkdownText()
        const normalized = normalizeMarkdownForCompare(output)
        const missing = testCase.expectedIncludes.filter(
          (frag) => !normalized.includes(normalizeMarkdownForCompare(frag)),
        )

        results.push({
          name: testCase.name,
          passed: missing.length === 0,
          missing,
          output,
        })
      }
    } finally {
      this.editor.commands.setContent(original, true)
    }

    return results
  }

  public async runPerformanceBenchmark(
    options: PerformanceBenchmarkOptions = {},
  ): Promise<PerformanceBenchmarkResult> {
    const result = await runEditorPerformanceBenchmark(this.editor, options)

    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : 'default'
      localStorage.setItem(`be-performance-baseline-v1:${path}`, JSON.stringify(result))
    } catch {
      // ignore persistence errors
    }

    return result
  }
}
