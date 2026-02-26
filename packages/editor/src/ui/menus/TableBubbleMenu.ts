import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
import { EditorCore } from '../../core/EditorCore'
import { ToolbarItem } from '../toolbar/ToolbarItem'
import { ToolbarDropdown } from '../toolbar/ToolbarDropdown'
import { ToolbarColorPicker } from '../toolbar/ToolbarColorPicker'
import { tableMenuButtons } from './tableMenuItems'
import { ToolbarItemType } from '../toolbar/ToolbarRegistry'

export class TableBubbleMenu {
  private element: HTMLElement
  private editorCore: EditorCore
  private isOpen: boolean = false
  private cleanupFloating: (() => void) | null = null
  private currentTable: HTMLElement | null = null

  constructor(editorCore: EditorCore) {
    this.editorCore = editorCore
    this.element = this.render()
    
    // Mount to body immediately but hidden
    document.body.appendChild(this.element)

    this.editorCore.events.on('selectionUpdate', () => this.update())
    this.editorCore.events.on('transaction', () => this.update())
    this.editorCore.events.on('update', () => this.update())
  }

  private render(): HTMLElement {
    const menu = document.createElement('div')
    menu.className = 'table-bubble-menu toolbar' // Add 'toolbar' class to inherit toolbar styles
    menu.style.display = 'none'
    menu.style.position = 'absolute'
    menu.style.zIndex = '1000'
    menu.style.backgroundColor = 'white'
    menu.style.border = '1px solid #e8e8e8'
    menu.style.borderRadius = '6px'
    menu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'
    menu.style.padding = '4px'
    menu.style.gap = '2px'

    this.renderItems(menu, tableMenuButtons)

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

  private update() {
    const { editor } = this.editorCore
    
    // Check if table is active
    if (!editor.isActive('table')) {
      this.hide()
      return
    }

    // Find the current table element
    const { from } = editor.state.selection
    // Safely get the DOM node
    let dom = editor.view.domAtPos(from).node as HTMLElement | null
    if (dom && dom.nodeType === 3) { // Text node
        dom = dom.parentElement
    }
    
    const tableEl = dom ? (dom.closest('table') as HTMLElement) : null

    if (!tableEl) {
        this.hide()
        return
    }

    // If table changed, or menu is closed, show it attached to new table
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
        middleware: [
          offset(10),
          flip(),
          shift({ padding: 5 }),
        ],
      }).then(({ x, y }) => {
        Object.assign(this.element.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    });
  }

  private hide() {
    if (!this.isOpen) return
    this.isOpen = false
    this.element.style.display = 'none'
    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }
  }

  public destroy() {
    this.hide()
    this.element.remove()
  }
}
