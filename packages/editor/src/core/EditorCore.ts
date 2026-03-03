import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
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
import { Exporter } from '../export/Exporter'
import { DocxImporter } from '../import/DocxImporter'

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
      this.listeners[event].forEach(fn => fn(...args))
    }
  }

  off(event: string, fn: Listener) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter(l => l !== fn)
  }
}

export interface EditorCoreOptions {
  element: HTMLElement
  content?: any
  onUpdate?: (editor: Editor) => void
}

export class EditorCore {
  public editor: Editor
  public events: EventBus
  public exporter: Exporter
  public importer: DocxImporter

  constructor(options: EditorCoreOptions) {
    this.events = new EventBus()

    this.editor = new Editor({
      element: options.element,
      extensions: [
        StarterKit.configure({
            codeBlock: false,
        }),
        CustomCodeBlock,
        Placeholder.configure({
          placeholder: 'Type "/" for commands...',
        }),
        Comment,
        Image,
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
        BlockHandle,
        CurrentLineHighlight,
        SelectionTooltip,
      ],
      content: options.content,
      onUpdate: ({ editor }) => {
        options.onUpdate?.(editor)
        this.events.emit('update', editor)
      },
      onSelectionUpdate: ({ editor }) => {
        this.events.emit('selectionUpdate', editor)
      },
      onTransaction: ({ editor }) => {
        this.events.emit('transaction', editor)
      }
    })

    this.exporter = new Exporter(this.editor)
    this.importer = new DocxImporter(this.editor)
  }

  public destroy() {
    this.editor.destroy()
    this.importer.destroy()
  }

  public getJSON() {
    return this.editor.getJSON()
  }

  public getHTML() {
    return this.editor.getHTML()
  }

  // Command wrappers
  public exec(command: string, options?: any) {
    // Basic command dispatcher logic
    // This can be expanded to map string commands to Tiptap chains
    console.log(`Executing command: ${command}`, options)
  }
}
