import { Extension, Editor } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { SlashCommandI18n } from '../i18n/types'

// ── 命令定义 ──────────────────────────────────────────────────────────────────

export interface SlashCommandItem {
  title: string
  description: string
  icon: string
  keywords: string[]
  command: (editor: Editor) => void
}

export interface SlashCommandOptions {
  i18n: SlashCommandI18n
}

const DEFAULT_SLASH_I18N: SlashCommandI18n = {
  menuAriaLabel: 'Slash 命令菜单',
  paragraphTitle: '正文',
  paragraphDescription: '普通文本段落',
  heading1Title: '标题 1',
  heading1Description: '大型标题',
  heading2Title: '标题 2',
  heading2Description: '中等标题',
  heading3Title: '标题 3',
  heading3Description: '小型标题',
  bulletListTitle: '无序列表',
  bulletListDescription: '点式列表',
  orderedListTitle: '有序列表',
  orderedListDescription: '数字列表',
  taskListTitle: '任务列表',
  taskListDescription: '带复选框的列表',
  blockquoteTitle: '引用',
  blockquoteDescription: '引用文本块',
  codeBlockTitle: '代码块',
  codeBlockDescription: '带语法高亮的代码',
  horizontalRuleTitle: '分割线',
  horizontalRuleDescription: '水平分隔线',
  tableTitle: '表格',
  tableDescription: '插入表格',
  calloutTitle: 'Callout',
  calloutDescription: '高亮信息块',
}

function createDefaultCommands(i18n: SlashCommandI18n): SlashCommandItem[] {
  return [
  {
    title: i18n.paragraphTitle,
    description: i18n.paragraphDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>',
    keywords: ['正文', 'paragraph', 'text', 'p'],
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: i18n.heading1Title,
    description: i18n.heading1Description,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M17 10l-1 2h4l-1 2"/></svg>',
    keywords: ['h1', '标题1', 'heading1', 'title'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: i18n.heading2Title,
    description: i18n.heading2Description,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M21 10a2 2 0 0 0-4 0c0 2 4 3 4 6h-4"/></svg>',
    keywords: ['h2', '标题2', 'heading2'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: i18n.heading3Title,
    description: i18n.heading3Description,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M17 6a2 2 0 0 1 0 4h0a2 2 0 0 1 0 4H17"/></svg>',
    keywords: ['h3', '标题3', 'heading3'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: i18n.bulletListTitle,
    description: i18n.bulletListDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>',
    keywords: ['ul', 'bullet', '无序', 'list'],
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: i18n.orderedListTitle,
    description: i18n.orderedListDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
    keywords: ['ol', '有序', 'ordered', 'number'],
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: i18n.taskListTitle,
    description: i18n.taskListDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>',
    keywords: ['task', 'todo', '任务', 'check', 'checkbox'],
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: i18n.blockquoteTitle,
    description: i18n.blockquoteDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    keywords: ['quote', 'blockquote', '引用'],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: i18n.codeBlockTitle,
    description: i18n.codeBlockDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    keywords: ['code', 'codeblock', '代码', 'pre'],
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: i18n.horizontalRuleTitle,
    description: i18n.horizontalRuleDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    keywords: ['hr', 'divider', '分割线', 'rule'],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: i18n.tableTitle,
    description: i18n.tableDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
    keywords: ['table', '表格'],
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
  },
  {
    title: i18n.calloutTitle,
    description: i18n.calloutDescription,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    keywords: ['callout', 'info', '信息块', '提示', 'alert'],
    command: (editor) => (editor.commands as any).insertCallout('info'),
  },
  ]
}

// ── Slash Menu View ────────────────────────────────────────────────────────────

class SlashMenuView {
  private container: HTMLElement
  private query = ''
  private selectedIndex = 0
  private visible = false
  private items: SlashCommandItem[] = []
  private view: EditorView
  private editor: Editor
  private slashPos: number | null = null
  private i18n: SlashCommandI18n
  private commands: SlashCommandItem[]

  constructor(view: EditorView, editor: Editor, i18n: SlashCommandI18n) {
    this.view = view
    this.editor = editor
    this.i18n = i18n
    this.commands = createDefaultCommands(i18n)

    this.container = document.createElement('div')
    this.container.className = 'be-slash-menu'
    this.container.setAttribute('role', 'listbox')
    this.container.setAttribute('aria-label', this.i18n.menuAriaLabel)
    this.container.style.cssText =
      'display:none;position:fixed;z-index:9999;background:white;border:1px solid #e8e8e8;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:4px;min-width:240px;max-height:320px;overflow-y:auto;'

    document.body.appendChild(this.container)
  }

  show(pos: number, query: string) {
    this.slashPos = pos
    this.query = query
    this.selectedIndex = 0
    this.visible = true
    this.render()
  }

  updateQuery(query: string) {
    this.query = query
    this.selectedIndex = 0
    this.render()
  }

  hide() {
    this.visible = false
    this.slashPos = null
    this.container.style.display = 'none'
  }

  isVisible() {
    return this.visible
  }

  private getFilteredItems(): SlashCommandItem[] {
    const q = this.query.toLowerCase().trim()
    if (!q) return this.commands
    return this.commands.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q)),
    )
  }

  private render() {
    this.items = this.getFilteredItems()

    if (this.items.length === 0) {
      this.hide()
      return
    }

    this.container.innerHTML = ''
    this.items.forEach((item, idx) => {
      const btn = document.createElement('button')
      btn.className = `be-slash-menu-item${idx === this.selectedIndex ? ' be-slash-menu-item--selected' : ''}`
      btn.setAttribute('role', 'option')
      btn.setAttribute('aria-selected', idx === this.selectedIndex ? 'true' : 'false')
      btn.setAttribute('aria-label', `${item.title}：${item.description}`)
      btn.style.cssText = `
        display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;
        border:none;border-radius:5px;background:${idx === this.selectedIndex ? '#f3f4f6' : 'transparent'};
        cursor:pointer;text-align:left;transition:background 0.15s;
      `
      btn.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f9fafb;border:1px solid #e8e8e8;border-radius:5px;flex-shrink:0;color:#595959;">${item.icon}</span>
        <span style="display:flex;flex-direction:column;gap:1px;">
          <span style="font-size:13px;font-weight:500;color:#262626;">${item.title}</span>
          <span style="font-size:12px;color:#9ca3af;">${item.description}</span>
        </span>
      `
      btn.onmouseenter = () => {
        this.selectedIndex = idx
        this.render()
      }
      btn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.executeSelected()
      }
      this.container.appendChild(btn)
    })

    // Position near cursor
    this.positionMenu()
    this.container.style.display = 'block'
  }

  private positionMenu() {
    if (this.slashPos === null) return
    const coords = this.view.coordsAtPos(this.slashPos)
    if (!coords) return

    const menuHeight = Math.min(this.items.length * 46 + 8, 320)
    const spaceBelow = window.innerHeight - coords.bottom
    const top = spaceBelow >= menuHeight ? coords.bottom + 4 : coords.top - menuHeight - 4

    this.container.style.top = `${top}px`
    this.container.style.left = `${Math.min(coords.left, window.innerWidth - 256)}px`
  }

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length
    this.render()
  }

  selectPrev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length
    this.render()
  }

  executeSelected() {
    const item = this.items[this.selectedIndex]
    if (!item) return

    // Delete the "/" + query text
    if (this.slashPos !== null) {
      const queryLen = this.query.length
      const deleteFrom = this.slashPos - 1 // include the "/"
      const deleteTo = this.slashPos + queryLen

      this.editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: deleteTo })
        .run()
    }

    this.hide()
    // Run after the delete so node types resolve correctly
    setTimeout(() => item.command(this.editor), 0)
  }

  destroy() {
    this.container.remove()
  }
}

// ── ProseMirror Plugin ─────────────────────────────────────────────────────────

const slashPluginKey = new PluginKey('slashCommand')

function createSlashPlugin(editor: Editor, i18n: SlashCommandI18n) {
  let menuView: SlashMenuView | null = null
  let slashStartPos: number | null = null

  return new Plugin({
    key: slashPluginKey,

    view(editorView) {
      menuView = new SlashMenuView(editorView, editor, i18n)
      return {
        destroy() {
          menuView?.destroy()
          menuView = null
        },
      }
    },

    props: {
      handleKeyDown(_view, event) {
        if (!menuView) return false

        if (menuView.isVisible()) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            menuView.selectNext()
            return true
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            menuView.selectPrev()
            return true
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            menuView.executeSelected()
            return true
          }
          if (event.key === 'Escape') {
            menuView.hide()
            slashStartPos = null
            return true
          }
        }

        return false
      },

      handleTextInput(view, from, _to, text) {
        if (!menuView) return false

        if (text === '/') {
          // Delay to let ProseMirror insert the char first
          setTimeout(() => {
            slashStartPos = from + 1
            menuView?.show(slashStartPos, '')
          }, 0)
          return false
        }

        if (menuView.isVisible() && slashStartPos !== null) {
          const { state } = view
          const pos = state.selection.from
          // Extract query: text after slash position
          const textFrom = slashStartPos
          const textTo = pos + text.length
          if (textTo >= textFrom) {
            setTimeout(() => {
              const startPos = slashStartPos
              if (!menuView || startPos === null) return
              const { state: newState } = view
              const query = newState.doc.textBetween(startPos, newState.selection.from)
              if (query.startsWith(' ') || query.includes('\n')) {
                menuView.hide()
                slashStartPos = null
                return
              }
              menuView.updateQuery(query)
            }, 0)
          }
        }

        return false
      },
    },

    appendTransaction(_transactions, _oldState, newState) {
      const startPos = slashStartPos
      if (!menuView || !menuView.isVisible() || startPos === null) return null

      const pos = newState.selection.from
      // If cursor moved before slash, hide
      if (pos < startPos - 1) {
        menuView.hide()
        slashStartPos = null
        return null
      }

      // Check if the "/" was deleted
      const textAtSlash = newState.doc.textBetween(
        Math.max(0, startPos - 1),
        startPos,
      )
      if (textAtSlash !== '/') {
        menuView.hide()
        slashStartPos = null
      }

      return null
    },
  })
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      i18n: DEFAULT_SLASH_I18N,
    }
  },

  addProseMirrorPlugins() {
    return [createSlashPlugin(this.editor, this.options.i18n)]
  },
})
