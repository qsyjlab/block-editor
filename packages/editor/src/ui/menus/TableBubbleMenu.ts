import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
import { EditorCore } from '../../core/EditorCore'
import { ToolbarItem } from '../toolbar/ToolbarItem'
import { ToolbarDropdown } from '../toolbar/ToolbarDropdown'
import { ToolbarColorPicker } from '../toolbar/ToolbarColorPicker'
import { getTableMenuButtons } from './tableMenuItems'
import { isCellSelection } from './table-selection'
import { ToolbarItemType } from '../toolbar/ToolbarRegistry'
import { applyShortcutHintsToItems } from '../toolbar/shortcut-hints'
import { resolveUILayerHost } from '../layer-root'

export class TableBubbleMenu {
  private element: HTMLElement
  private editorCore: EditorCore
  private overlayContainer?: HTMLElement
  private isOpen = false
  private cleanupFloating: (() => void) | null = null
  private currentTable: HTMLElement | null = null
  private rafId: number | null = null
  private suppressHideUntil = 0

  constructor(editorCore: EditorCore, overlayContainer?: HTMLElement) {
    this.editorCore = editorCore
    this.overlayContainer = overlayContainer
    this.element = this.render()

    this.getOverlayContainer().appendChild(this.element)

    this.element.addEventListener('mousedown', (event) => {
      this.suppressHideUntil = Date.now() + 400
      event.stopPropagation()
    })

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

    this.handleDocumentMouseDown = (event: MouseEvent) => {
      if (!this.isOpen) return
      const target = event.target as Node | null
      if (!target) return
      if (
        this.element.contains(target) ||
        (target instanceof Element &&
          target.closest('.toolbar-dropdown-menu, .color-picker-dropdown'))
      ) {
        this.suppressHideUntil = Date.now() + 600
      }
    }
    document.addEventListener('mousedown', this.handleDocumentMouseDown, true)
  }

  private handleDocumentMouseDown: (event: MouseEvent) => void

  private getOverlayContainer(): HTMLElement {
    if (this.overlayContainer) return this.overlayContainer
    const editorRoot = this.editorCore.editor.options.element as HTMLElement
    const container =
      (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null)
    return container || resolveUILayerHost('dropdown', editorRoot)
  }

  private render(): HTMLElement {
    const menu = document.createElement('div')
    menu.className =
      'table-bubble-menu toolbar be-fixed be-z-[1000] be-rounded-md be-shadow-lg be-p-1 be-gap-1'
    menu.style.display = 'none'
    menu.setAttribute('role', 'toolbar')
    menu.setAttribute('aria-label', this.editorCore.i18n.toolbar.tableToolbar)
    menu.setAttribute('aria-orientation', 'horizontal')

    this.renderItems(
      menu,
      applyShortcutHintsToItems(getTableMenuButtons(this.editorCore.i18n), this.editorCore, [
        'table',
        'editor',
      ]),
    )
    return menu
  }

  private renderItems(container: HTMLElement, items: ToolbarItemType[]) {
    items.forEach((item) => {
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

  private isToolbarInteracting(): boolean {
    if (Date.now() < this.suppressHideUntil) return true
    if (this.element.contains(document.activeElement)) return true
    if (this.element.querySelector('.toolbar-dropdown-wrapper.open')) return true
    if (this.element.querySelector('.color-picker-dropdown')) return true

    const overlay = this.getOverlayContainer()
    const openMenu = overlay.querySelector(
      '.toolbar-dropdown-menu[data-owner-in-more="false"], .color-picker-dropdown',
    ) as HTMLElement | null
    if (openMenu && openMenu.style.display !== 'none') {
      return this.element.contains(openMenu.closest('.table-bubble-menu') || this.element)
    }

    return false
  }

  private shouldShowToolbar(): boolean {
    const editor = this.editorCore.editor
    const selection = editor.state.selection

    if (isCellSelection(selection)) return true
    if (!selection.empty) return true
    if (this.isToolbarInteracting()) return true
    return false
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

    if (!this.shouldShowToolbar()) {
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
        middleware: [offset({ mainAxis: 30 }), flip(), shift({ padding: 8 })],
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
    if (this.isToolbarInteracting()) return

    this.isOpen = false
    this.element.style.display = 'none'

    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }

    this.recoverModeFromTable()
  }

  public destroy() {
    document.removeEventListener('mousedown', this.handleDocumentMouseDown, true)
    this.hide()
    this.element.remove()
  }
}
