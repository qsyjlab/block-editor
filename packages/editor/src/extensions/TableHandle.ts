import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0
  return function (this: any, ...args: any[]) {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn.apply(this, args)
    }
  } as T
}

export interface TableHandleOptions {
  enabled: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableHandle: {
      setTableHandleEnabled: (enabled: boolean) => ReturnType
    }
  }
}

export const TableHandle = Extension.create<TableHandleOptions>({
  name: 'tableHandle',

  addOptions() {
    return {
      enabled: true,
    }
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    }
  },

  addCommands() {
    return {
      setTableHandleEnabled: (enabled: boolean) => () => {
        this.storage.enabled = enabled
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableHandle'),
        view: (editorView) => new TableHandleView(editorView, this.editor),
      }),
    ]
  },
})

class TableHandleView {
  private readonly editorView: EditorView
  private readonly editor: any
  private readonly handle: HTMLButtonElement
  private currentTablePos: number | null = null
  private selectedTablePos: number | null = null
  private selectedTableDom: HTMLTableElement | null = null
  private scrollTarget: HTMLElement | Document = document

  constructor(editorView: EditorView, editor: any) {
    this.editorView = editorView
    this.editor = editor

    this.handle = document.createElement('button')
    this.handle.type = 'button'
    this.handle.className = 'be-table-handle'
    this.handle.setAttribute('aria-label', 'Table handle')
    this.handle.setAttribute('title', 'Table')
    this.handle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>
    `
    this.handle.style.display = 'none'

    this.handle.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
    this.handle.addEventListener('click', this.handleClick)

    window.addEventListener('mousemove', this.handleMouseMove, true)
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('selectionchange', this.handleSelectionChange, true)

    this.scrollTarget = this.getScrollContainer() || document
    if (this.scrollTarget === document) {
      document.addEventListener('scroll', this.handleScroll, true)
    } else {
      ;(this.scrollTarget as HTMLElement).addEventListener('scroll', this.handleScroll, {
        passive: true,
      })
    }

    this.mountToContainer()
  }

  update() {
    this.mountToContainer()

    if (!this.isEnabled()) {
      this.hideHandle()
      this.clearSelectedTable()
      return
    }

    if (this.currentTablePos !== null) {
      const current = this.getTableDom(this.currentTablePos)
      if (!current) {
        this.currentTablePos = null
        this.hideHandle()
      }
    }

    if (this.selectedTablePos !== null) {
      const selected = this.getTableDom(this.selectedTablePos)
      if (!selected) {
        this.clearSelectedTable()
      } else if (selected !== this.selectedTableDom) {
        this.applySelectedTable(selected, this.selectedTablePos)
      }
    }
  }

  destroy() {
    this.clearSelectedTable()
    this.handle.removeEventListener('click', this.handleClick)
    window.removeEventListener('mousemove', this.handleMouseMove, true)
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('selectionchange', this.handleSelectionChange, true)
    if (this.scrollTarget === document) {
      document.removeEventListener('scroll', this.handleScroll, true)
    } else {
      ;(this.scrollTarget as HTMLElement).removeEventListener('scroll', this.handleScroll)
    }
    this.handle.remove()
  }

  private isEnabled() {
    return this.editor?.storage?.tableHandle?.enabled !== false
  }

  private getEditorContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement
    return (
      (dom.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (dom.closest('.editor-container') as HTMLElement | null)
    )
  }

  private getScrollContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement
    return (
      (dom.closest('[data-be-scroll-container="true"]') as HTMLElement | null) ||
      (dom.closest('.editor-scroll-area') as HTMLElement | null)
    )
  }

  private mountToContainer() {
    const container = this.getEditorContainer()
    if (!container) return
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }
    if (this.handle.parentNode !== container) {
      container.appendChild(this.handle)
    }
  }

  private getTableInfoFromPos(pos: number): { pos: number } | null {
    const resolvedPos = this.editorView.state.doc.resolve(pos)
    for (let depth = resolvedPos.depth; depth >= 1; depth -= 1) {
      const node = resolvedPos.node(depth)
      if (node.type.name === 'table') {
        return { pos: resolvedPos.before(depth) }
      }
    }
    return null
  }

  private getTableDom(pos: number): HTMLTableElement | null {
    const nodeDom = this.editorView.nodeDOM(pos)
    if (nodeDom instanceof HTMLTableElement) return nodeDom
    if (nodeDom instanceof HTMLElement) {
      const nested = nodeDom.querySelector('table')
      return nested instanceof HTMLTableElement ? nested : null
    }
    return null
  }

  private isInTableHotZone(tablePos: number, clientX: number, clientY: number) {
    const table = this.getTableDom(tablePos)
    if (!table) return false
    const rect = table.getBoundingClientRect()
    return (
      clientX >= rect.left - 56 &&
      clientX <= rect.right + 10 &&
      clientY >= rect.top - 10 &&
      clientY <= rect.bottom + 10
    )
  }

  private showHandleAt(tablePos: number) {
    const container = this.getEditorContainer()
    if (!container) return
    const table = this.getTableDom(tablePos)
    if (!table) return

    const tableRect = table.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const top = tableRect.top - containerRect.top + 2
    const left = tableRect.left - containerRect.left - 34

    this.currentTablePos = tablePos
    this.handle.style.top = `${top}px`
    this.handle.style.left = `${left}px`
    this.handle.style.display = 'flex'
  }

  private hideHandle() {
    this.handle.style.display = 'none'
    this.currentTablePos = null
  }

  private clearSelectedTable() {
    this.selectedTableDom?.classList.remove('be-table-selected')
    this.selectedTableDom = null
    this.selectedTablePos = null
  }

  private applySelectedTable(tableDom: HTMLTableElement, tablePos: number) {
    if (this.selectedTableDom && this.selectedTableDom !== tableDom) {
      this.selectedTableDom.classList.remove('be-table-selected')
    }
    this.selectedTableDom = tableDom
    this.selectedTablePos = tablePos
    this.currentTablePos = tablePos
    tableDom.classList.add('be-table-selected')
  }

  private focusFirstCell(tablePos: number) {
    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return

    let cursorPos = tablePos + 1
    let current = tableNode
    while (current.childCount > 0) {
      current = current.firstChild!
      cursorPos += 1
    }

    const maxPos = this.editorView.state.doc.content.size
    const safePos = Math.max(1, Math.min(cursorPos, maxPos))
    this.editor.commands.setTextSelection(safePos)
    this.editor.commands.focus()
  }

  private handleClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (this.currentTablePos === null) return
    const tableDom = this.getTableDom(this.currentTablePos)
    if (!tableDom) return

    this.applySelectedTable(tableDom, this.currentTablePos)
    this.focusFirstCell(this.currentTablePos)
    this.editor.commands.setInteractionMode('table-editing')
  }

  private handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    if (this.handle.contains(target)) return

    const clickedTable = target.closest('table')
    if (clickedTable && clickedTable === this.selectedTableDom) return

    this.clearSelectedTable()
  }

  private handleSelectionChange = () => {
    if (document.documentElement.getAttribute('data-be-marquee-selecting') === '1') {
      return
    }
    const selection = this.editorView.state.selection
    const tableInfo = this.getTableInfoFromPos(selection.from)
    if (!tableInfo) return
    this.showHandleAt(tableInfo.pos)
  }

  private handleScroll = () => {
    if (this.currentTablePos !== null) {
      this.showHandleAt(this.currentTablePos)
    }
  }

  private handleMouseMove = throttle((event: MouseEvent) => {
    if (document.documentElement.getAttribute('data-be-marquee-selecting') === '1') {
      this.hideHandle()
      return
    }

    if (!this.isEnabled()) {
      this.hideHandle()
      this.clearSelectedTable()
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest('.be-block-handle-menu')) return
    if (target && this.handle.contains(target)) {
      if (this.currentTablePos !== null) {
        this.showHandleAt(this.currentTablePos)
      } else if (this.selectedTablePos !== null) {
        this.showHandleAt(this.selectedTablePos)
      }
      return
    }

    if (
      this.currentTablePos !== null &&
      this.isInTableHotZone(this.currentTablePos, event.clientX, event.clientY)
    ) {
      this.showHandleAt(this.currentTablePos)
      return
    }
    if (
      this.selectedTablePos !== null &&
      this.isInTableHotZone(this.selectedTablePos, event.clientX, event.clientY)
    ) {
      this.showHandleAt(this.selectedTablePos)
      return
    }

    if (target?.closest('table')) {
      const pos = this.editorView.posAtCoords({ left: event.clientX, top: event.clientY })
      if (!pos) return
      const tableInfo = this.getTableInfoFromPos(pos.pos)
      if (tableInfo) {
        this.showHandleAt(tableInfo.pos)
        return
      }
    }

    const pos = this.editorView.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!pos) {
      if (!this.selectedTableDom) this.hideHandle()
      return
    }

    const tableInfo = this.getTableInfoFromPos(pos.pos)
    if (tableInfo) {
      this.showHandleAt(tableInfo.pos)
    } else if (this.selectedTablePos !== null) {
      this.showHandleAt(this.selectedTablePos)
    } else if (!this.selectedTableDom) {
      this.hideHandle()
    }
  }, 16)
}
