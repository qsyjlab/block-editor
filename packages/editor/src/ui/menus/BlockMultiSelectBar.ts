/**
 * BlockMultiSelectBar — 块多选时显示的浮动操作栏
 * 出现在编辑器顶部，提供：已选 N 块 / 删除 / 转换类型 / 取消
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
    this.bar.setAttribute('aria-label', '块多选操作栏')
    Object.assign(this.bar.style, {
      display: 'none',
    })

    this.countLabel = document.createElement('span')
    this.countLabel.className = 'be-multiselect-bar__count'

    const btnDelete = this.createBtn(
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
      '删除选中块',
      true,
    )
    btnDelete.addEventListener('click', () => {
      editorCore.editor.commands.deleteSelectedBlocks()
    })

    const btnToParagraph = this.createBtn('¶', '转为正文')
    btnToParagraph.style.fontWeight = '600'
    btnToParagraph.addEventListener('click', () => {
      editorCore.editor.commands.convertSelectedBlocks('paragraph')
      editorCore.editor.commands.clearBlockSelection()
    })

    const btnToH1 = this.createBtn('H1', '转为 H1')
    btnToH1.style.fontWeight = '700'
    btnToH1.addEventListener('click', () => {
      editorCore.editor.commands.convertSelectedBlocks('heading', { level: 1 })
      editorCore.editor.commands.clearBlockSelection()
    })

    const btnToH2 = this.createBtn('H2', '转为 H2')
    btnToH2.style.fontWeight = '700'
    btnToH2.addEventListener('click', () => {
      editorCore.editor.commands.convertSelectedBlocks('heading', { level: 2 })
      editorCore.editor.commands.clearBlockSelection()
    })

    const divider = document.createElement('div')
    divider.className = 'be-multiselect-bar__divider'

    const btnClear = this.createBtn(
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '取消多选',
    )
    btnClear.addEventListener('click', () => {
      editorCore.editor.commands.clearBlockSelection()
    })

    this.bar.appendChild(this.countLabel)
    this.bar.appendChild(btnDelete)
    this.bar.appendChild(divider.cloneNode())
    this.bar.appendChild(btnToParagraph)
    this.bar.appendChild(btnToH1)
    this.bar.appendChild(btnToH2)
    this.bar.appendChild(divider)
    this.bar.appendChild(btnClear)

    document.body.appendChild(this.bar)

    // Listen for selection changes via transaction meta
    editorCore.editor.on('transaction', () => this.scheduleUpdate())

    // ESC to cancel multi-select
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

    this.countLabel.textContent = `已选 ${count} 块`

    // Position bar at top-center of viewport
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
