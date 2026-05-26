import { Extension, Editor } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { resolveEditorI18n } from '../i18n'
import type { SlashCommandI18n } from '../i18n/types'
import { createDropdownItem } from '../ui/components/DropdownMenu'
import { createSlashCommandItems } from '../ui/features/block-features'
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
    this.commands = createSlashCommandItems({ slashCommand: i18n })
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
