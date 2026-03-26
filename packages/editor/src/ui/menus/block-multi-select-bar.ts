/**
 * BlockMultiSelectBar — 块多选时显示的浮动操作栏
 */

import { EditorCore } from '../../core/EditorCore'
import { BlockMultiSelectStorage } from '../../extensions/BlockMultiSelect'

export class BlockMultiSelectBar {
  private bar: HTMLElement
  private countLabel: HTMLElement
  private editorCore: EditorCore
  private rafId: number | null = null

  constructor(editorCore: EditorCore) {
    this.editorCore = editorCore

    this.bar = document.createElement('div')
    this.bar.className = 'be-multiselect-bar'
    this.bar.setAttribute('role', 'toolbar')
    this.bar.setAttribute('aria-label', this.editorCore.i18n.blockMultiSelectBar.toolbarAriaLabel)
    Object.assign(this.bar.style, {
      display: 'none',
    })

    this.countLabel = document.createElement('span')
    this.countLabel.className = 'be-multiselect-bar__count'

    const btnMoveUp = this.createBtn('↑', this.editorCore.i18n.blockMultiSelectBar.moveUp)
    btnMoveUp.addEventListener('click', () => {
      editorCore.editor.commands.moveSelectedBlocks('up')
    })

    const btnMoveDown = this.createBtn('↓', this.editorCore.i18n.blockMultiSelectBar.moveDown)
    btnMoveDown.addEventListener('click', () => {
      editorCore.editor.commands.moveSelectedBlocks('down')
    })

    const btnDelete = this.createBtn(
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
      this.editorCore.i18n.blockMultiSelectBar.deleteSelected,
      true,
    )
    btnDelete.addEventListener('click', () => {
      editorCore.editor.commands.deleteSelectedBlocks()
    })

    const applyConvert = (nodeType: string, attrs?: Record<string, any>) => {
      editorCore.editor.commands.convertSelectedBlocks(nodeType, attrs)
      editorCore.editor.commands.clearBlockSelection()
    }

    const btnToParagraph = this.createBtn('¶', this.editorCore.i18n.blockMultiSelectBar.toParagraph)
    btnToParagraph.style.fontWeight = '600'
    btnToParagraph.addEventListener('click', () => applyConvert('paragraph'))

    const btnToQuote = this.createBtn('❝', this.editorCore.i18n.blockMultiSelectBar.toBlockquote)
    btnToQuote.addEventListener('click', () => applyConvert('blockquote'))

    const btnToTask = this.createBtn('☑', this.editorCore.i18n.blockMultiSelectBar.toTaskList)
    btnToTask.addEventListener('click', () => applyConvert('taskList'))

    const btnToBullet = this.createBtn('•', this.editorCore.i18n.blockMultiSelectBar.toBulletList)
    btnToBullet.addEventListener('click', () => applyConvert('bulletList'))

    const btnToOrdered = this.createBtn('1.', this.editorCore.i18n.blockMultiSelectBar.toOrderedList)
    btnToOrdered.addEventListener('click', () => applyConvert('orderedList'))

    const btnToCallout = this.createBtn('ℹ', this.editorCore.i18n.blockMultiSelectBar.toCallout)
    btnToCallout.addEventListener('click', () => applyConvert('callout', { calloutType: 'info' }))

    const divider = document.createElement('div')
    divider.className = 'be-multiselect-bar__divider'

    const btnClear = this.createBtn(
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      this.editorCore.i18n.blockMultiSelectBar.clearSelection,
    )
    btnClear.addEventListener('click', () => {
      editorCore.editor.commands.clearBlockSelection()
    })

    this.bar.appendChild(this.countLabel)
    this.bar.appendChild(btnMoveUp)
    this.bar.appendChild(btnMoveDown)
    this.bar.appendChild(btnDelete)
    this.bar.appendChild(divider.cloneNode())
    this.bar.appendChild(btnToParagraph)
    this.bar.appendChild(btnToQuote)
    this.bar.appendChild(btnToTask)
    this.bar.appendChild(btnToBullet)
    this.bar.appendChild(btnToOrdered)
    this.bar.appendChild(btnToCallout)
    this.bar.appendChild(divider)
    this.bar.appendChild(btnClear)

    document.body.appendChild(this.bar)

    editorCore.editor.on('transaction', () => this.scheduleUpdate())
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const storage = this.editorCore.editor.storage
        .blockMultiSelect as BlockMultiSelectStorage
      if (storage?.selectedPositions?.size > 0) {
        this.editorCore.editor.commands.clearBlockSelection()
      }
    }
  }

  private scheduleUpdate() {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.update()
    })
  }

  private update() {
    const storage = this.editorCore.editor.storage
      .blockMultiSelect as BlockMultiSelectStorage
    if (!storage) return

    const count = storage.selectedPositions.size
    if (count === 0) {
      this.bar.style.display = 'none'
      return
    }

    this.countLabel.textContent = this.editorCore.i18n.blockMultiSelectBar.selectedCount(count)
    this.bar.style.display = 'flex'
  }

  private createBtn(html: string, title: string, danger = false): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'be-multiselect-bar__btn' + (danger ? ' danger' : '')
    btn.title = title
    btn.setAttribute('aria-label', title)
    btn.innerHTML = html
    return btn
  }

  destroy() {
    this.bar.remove()
    document.removeEventListener('keydown', this.handleKeyDown)
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }
}
