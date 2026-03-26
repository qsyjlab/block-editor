import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
import { EditorCore } from '../../core/EditorCore'
import { ToolbarItem } from '../toolbar/ToolbarItem'
import { ToolbarDropdown } from '../toolbar/ToolbarDropdown'
import { ToolbarColorPicker } from '../toolbar/ToolbarColorPicker'
import { getTableMenuButtons } from './tableMenuItems'
import { ToolbarItemType } from '../toolbar/ToolbarRegistry'

export class TableBubbleMenu {
  private element: HTMLElement
  private editorCore: EditorCore
  private isOpen = false
  private cleanupFloating: (() => void) | null = null
  private currentTable: HTMLElement | null = null
  private rafId: number | null = null

  constructor(editorCore: EditorCore) {
    this.editorCore = editorCore
    this.element = this.render()

    this.getOverlayContainer().appendChild(this.element)

    const scheduleUpdate = () => {
      if (this.rafId !== null) return
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        this.update()
      })
    }

    this.editorCore.events.on('selectionUpdate', scheduleUpdate)
    this.editorCore.events.on('transaction', scheduleUpdate)
    this.editorCore.events.on('update', scheduleUpdate)
    this.editorCore.events.on('modeChange', scheduleUpdate)
  }

  private getOverlayContainer(): HTMLElement {
    const editorRoot = this.editorCore.editor.options.element as HTMLElement
    const container =
      (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null)
    return container || document.body
  }

  private render(): HTMLElement {
    const menu = document.createElement('div')
    menu.className = 'table-bubble-menu toolbar be-fixed be-z-[1000] be-bg-white be-border be-border-gray-200 be-rounded-md be-shadow-lg be-p-1 be-gap-1'
    menu.style.display = 'none'
    menu.setAttribute('role', 'toolbar')
    menu.setAttribute('aria-label', this.editorCore.i18n.toolbar.tableToolbar)
    menu.setAttribute('aria-orientation', 'horizontal')

    this.renderItems(menu, getTableMenuButtons(this.editorCore.i18n))
    return menu
  }

  private renderItems(container: HTMLElement, items: ToolbarItemType[]) {
    items.forEach(item => {
      if (item.type === 'button') {
        const component = new ToolbarItem(item, this.editorCore)
        container.appendChild(component.getElement())
      } else if (item.type === 'dropdown') {
        const component = new ToolbarDropdown(item, this.editorCore)
        container.appendChild(component.getElement())
      } else if (item.type === 'color') {
        const component = new ToolbarColorPicker(item.label, this.editorCore)
        container.appendChild(component.getElement())
      } else if (item.type === 'divider') {
        const divider = document.createElement('div')
        divider.className = 'divider'
        container.appendChild(divider)
      }
    })
  }

  private setTableMode() {
    const state = this.editorCore.editor.storage.interactionState as { mode?: string } | undefined
    if (state?.mode !== 'block-selection' && state?.mode !== 'table-editing') {
      this.editorCore.editor.commands.setInteractionMode('table-editing')
      this.editorCore.events.emit('modeChange', 'table-editing')
    }
  }

  private recoverModeFromTable() {
    const editor = this.editorCore.editor
    const state = editor.storage.interactionState as { mode?: string } | undefined
    if (state?.mode !== 'table-editing') return

    const mode = editor.state.selection.empty ? 'idle' : 'text-selection'
    editor.commands.setInteractionMode(mode)
    this.editorCore.events.emit('modeChange', mode)
  }

  private update() {
    const editor = this.editorCore.editor
    const state = editor.storage.interactionState as
      | { mode?: string; blockMenuOpen?: boolean }
      | undefined

    if (state?.mode === 'block-selection' || state?.blockMenuOpen) {
      this.hide()
      return
    }

    if (!editor.isActive('table')) {
      this.hide()
      return
    }

    let dom = editor.view.domAtPos(editor.state.selection.from).node as HTMLElement | null
    if (dom && dom.nodeType === 3) {
      dom = dom.parentElement
    }

    const tableEl = dom ? (dom.closest('table') as HTMLElement) : null
    if (!tableEl) {
      this.hide()
      return
    }

    this.setTableMode()

    if (this.currentTable !== tableEl || !this.isOpen) {
      this.currentTable = tableEl
      this.show(tableEl)
    }
  }

  private show(tableEl: HTMLElement) {
    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }

    this.isOpen = true
    this.element.style.display = 'flex'

    this.cleanupFloating = autoUpdate(tableEl, this.element, () => {
      computePosition(tableEl, this.element, {
        placement: 'top',
        middleware: [offset(10), flip(), shift({ padding: 5 })],
      }).then(({ x, y }) => {
        Object.assign(this.element.style, {
          left: `${x}px`,
          top: `${y}px`,
        })
      })
    })
  }

  private hide() {
    if (!this.isOpen) return

    this.isOpen = false
    this.element.style.display = 'none'

    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }

    this.recoverModeFromTable()
  }

  public destroy() {
    this.hide()
    this.element.remove()
  }
}
