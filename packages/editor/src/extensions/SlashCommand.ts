import { Extension, Editor } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { resolveEditorI18n } from '../i18n'
import type { SlashCommandI18n } from '../i18n/types'
import { createDropdownItem } from '../ui/components/DropdownMenu'
import { resolveUILayerHost } from '../ui/layer-root'

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

const DEFAULT_SLASH_I18N: SlashCommandI18n = resolveEditorI18n('en-US').slashCommand

function createDefaultCommands(i18n: SlashCommandI18n): SlashCommandItem[] {
  return [
    {
      title: i18n.paragraphTitle,
      description: i18n.paragraphDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>',
      keywords: [i18n.paragraphTitle, 'paragraph', 'text', 'p'],
      command: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
      title: i18n.heading1Title,
      description: i18n.heading1Description,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M17 10l-1 2h4l-1 2"/></svg>',
      keywords: ['h1', i18n.heading1Title.replace(/\s+/g, ''), 'heading1', 'title'],
      command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: i18n.heading2Title,
      description: i18n.heading2Description,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M21 10a2 2 0 0 0-4 0c0 2 4 3 4 6h-4"/></svg>',
      keywords: ['h2', i18n.heading2Title.replace(/\s+/g, ''), 'heading2'],
      command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: i18n.heading3Title,
      description: i18n.heading3Description,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M17 6a2 2 0 0 1 0 4h0a2 2 0 0 1 0 4H17"/></svg>',
      keywords: ['h3', i18n.heading3Title.replace(/\s+/g, ''), 'heading3'],
      command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: i18n.bulletListTitle,
      description: i18n.bulletListDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>',
      keywords: ['ul', 'bullet', i18n.bulletListTitle, 'list'],
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: i18n.orderedListTitle,
      description: i18n.orderedListDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
      keywords: ['ol', i18n.orderedListTitle, 'ordered', 'number'],
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: i18n.taskListTitle,
      description: i18n.taskListDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>',
      keywords: ['task', 'todo', i18n.taskListTitle, 'check', 'checkbox'],
      command: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      title: i18n.blockquoteTitle,
      description: i18n.blockquoteDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
      keywords: ['quote', 'blockquote', i18n.blockquoteTitle],
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: i18n.codeBlockTitle,
      description: i18n.codeBlockDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      keywords: ['code', 'codeblock', i18n.codeBlockTitle, 'pre'],
      command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: i18n.horizontalRuleTitle,
      description: i18n.horizontalRuleDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
      keywords: ['hr', 'divider', i18n.horizontalRuleTitle, 'rule'],
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      title: i18n.tableTitle,
      description: i18n.tableDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
      keywords: ['table', i18n.tableTitle],
      command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
    },
    {
      title: i18n.calloutTitle,
      description: i18n.calloutDescription,
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      keywords: ['callout', 'info', i18n.calloutTitle, 'alert'],
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
  private overlayHost: HTMLElement

  constructor(view: EditorView, editor: Editor, i18n: SlashCommandI18n) {
    this.view = view
    this.editor = editor
    this.i18n = i18n
    this.commands = createDefaultCommands(i18n)
    this.overlayHost = resolveUILayerHost('dropdown', this.view.dom as HTMLElement)

    this.container = document.createElement('div')
    this.container.className = 'toolbar-dropdown-menu be-slash-menu'
    this.container.setAttribute('role', 'listbox')
    this.container.setAttribute('aria-label', this.i18n.menuAriaLabel)

    this.overlayHost.appendChild(this.container)
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
    if (this.container.style.display === 'none') {
      this.visible = false
      this.slashPos = null
      return
    }
    this.visible = false
    this.slashPos = null
    this.container.style.transition = 'opacity 0.12s ease, transform 0.12s ease'
    this.container.style.opacity = '0'
    this.container.style.transform = 'translateY(-4px) scale(0.98)'
    window.setTimeout(() => {
      this.container.style.display = 'none'
      this.container.style.transition = ''
      this.container.style.opacity = ''
      this.container.style.transform = ''
    }, 120)
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
      const menuItem = createDropdownItem({
        label: item.title,
        description: item.description,
        iconHtml: item.icon,
        role: 'option',
        className: `be-slash-menu-item${idx === this.selectedIndex ? ' active be-slash-menu-item--selected' : ''}`,
        active: idx === this.selectedIndex,
        onSelect: (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.executeAtIndex(idx)
        },
      })
      menuItem.dataset.index = String(idx)
      menuItem.setAttribute('aria-selected', idx === this.selectedIndex ? 'true' : 'false')
      menuItem.setAttribute('aria-label', `${item.title}：${item.description}`)
      menuItem.addEventListener('mouseenter', () => {
        this.selectedIndex = idx
        this.syncSelectedState()
      })
      this.container.appendChild(menuItem)
    })

    this.container.style.display = 'block'
    this.container.style.visibility = 'hidden'
    // Position near cursor with viewport collision handling
    this.positionMenu()
    this.container.style.visibility = ''
    this.container.style.opacity = '0'
    this.container.style.transform = 'translateY(-6px) scale(0.98)'
    requestAnimationFrame(() => {
      this.container.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
      this.container.style.opacity = '1'
      this.container.style.transform = 'translateY(0) scale(1)'
    })
  }

  private positionMenu() {
    if (this.slashPos === null) return
    const coords = this.view.coordsAtPos(this.slashPos)
    if (!coords) return

    const rect = this.container.getBoundingClientRect()
    const viewportPadding = 8
    const spaceBelow = window.innerHeight - coords.bottom
    const preferTop =
      spaceBelow >= rect.height + viewportPadding ? coords.bottom + 6 : coords.top - rect.height - 6
    const top = Math.max(
      viewportPadding,
      Math.min(preferTop, window.innerHeight - rect.height - viewportPadding),
    )
    const left = Math.max(
      viewportPadding,
      Math.min(coords.left, window.innerWidth - rect.width - viewportPadding),
    )

    this.container.style.top = `${top}px`
    this.container.style.left = `${left}px`
  }

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length
    this.syncSelectedState()
  }

  selectPrev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length
    this.syncSelectedState()
  }

  executeSelected() {
    this.executeAtIndex(this.selectedIndex)
  }

  private executeAtIndex(index: number) {
    const item = this.items[index]
    if (!item) return

    // Delete the "/" + query text
    if (this.slashPos !== null) {
      const queryLen = this.query.length
      const deleteFrom = this.slashPos - 1 // include the "/"
      const deleteTo = this.slashPos + queryLen

      this.editor.chain().focus().deleteRange({ from: deleteFrom, to: deleteTo }).run()
    }

    this.hide()
    // Run after the delete so node types resolve correctly
    setTimeout(() => item.command(this.editor), 0)
  }

  private syncSelectedState() {
    const options = this.container.querySelectorAll<HTMLElement>('.be-slash-menu-item')
    options.forEach((node, idx) => {
      const active = idx === this.selectedIndex
      node.classList.toggle('active', active)
      node.classList.toggle('be-slash-menu-item--selected', active)
      node.setAttribute('aria-selected', active ? 'true' : 'false')
    })
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
      const textAtSlash = newState.doc.textBetween(Math.max(0, startPos - 1), startPos)
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
