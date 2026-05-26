/**
 * BlockMultiSelectBar — 块多选时显示的浮动操作栏
 */

import { EditorCore } from '../../core/EditorCore'
import { BlockMultiSelectStorage } from '../../extensions/BlockMultiSelect'
import { icons } from '../toolbar/icons'
import { resolveUILayerHost } from '../layer-root'

export class BlockMultiSelectBar {
  private bar: HTMLElement
  private countLabel: HTMLElement
  private editorCore: EditorCore
  private mountContainer?: HTMLElement
  private rafId: number | null = null
  private readonly handleWindowResize = () => this.scheduleUpdate()
  private readonly handleWindowScroll = () => this.scheduleUpdate()
  private readonly disposeShortcuts: Array<() => void> = []

  constructor(editorCore: EditorCore, mountContainer?: HTMLElement) {
    this.editorCore = editorCore
    this.mountContainer = mountContainer

    this.bar = document.createElement('div')
    this.bar.className = 'be-multiselect-bar'
    this.bar.setAttribute('role', 'toolbar')
    this.bar.setAttribute('aria-label', this.editorCore.i18n.blockMultiSelectBar.toolbarAriaLabel)
    Object.assign(this.bar.style, {
      display: 'none',
    })

    this.countLabel = document.createElement('span')
    this.countLabel.className = 'be-multiselect-bar__count'

    const btnMoveUp = this.createBtn(
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
      this.editorCore.i18n.blockMultiSelectBar.moveUp,
    )
    btnMoveUp.addEventListener('click', () => {
      editorCore.editor.commands.moveSelectedBlocks('up')
    })

    const btnMoveDown = this.createBtn(
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
      this.editorCore.i18n.blockMultiSelectBar.moveDown,
    )
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
    }

    const btnToParagraph = this.createBtn(
      icons.paragraph,
      this.editorCore.i18n.blockMultiSelectBar.toParagraph,
    )
    btnToParagraph.addEventListener('click', () => applyConvert('paragraph'))

    const btnToHeading1 = this.createBtn(
      '<span style="font-size:12px;font-weight:800;line-height:1">H1</span>',
      this.editorCore.i18n.blockMultiSelectBar.toHeading1,
    )
    btnToHeading1.addEventListener('click', () => applyConvert('heading', { level: 1 }))

    const btnToQuote = this.createBtn(
      icons.quote,
      this.editorCore.i18n.blockMultiSelectBar.toBlockquote,
    )
    btnToQuote.addEventListener('click', () => applyConvert('blockquote'))

    const btnToTask = this.createBtn(
      icons.task,
      this.editorCore.i18n.blockMultiSelectBar.toTaskList,
    )
    btnToTask.addEventListener('click', () => applyConvert('taskList'))

    const btnToBullet = this.createBtn(
      icons.list,
      this.editorCore.i18n.blockMultiSelectBar.toBulletList,
    )
    btnToBullet.addEventListener('click', () => applyConvert('bulletList'))

    const btnToOrdered = this.createBtn(
      icons.listOrdered,
      this.editorCore.i18n.blockMultiSelectBar.toOrderedList,
    )
    btnToOrdered.addEventListener('click', () => applyConvert('orderedList'))

    const btnToCallout = this.createBtn(
      icons.info,
      this.editorCore.i18n.blockMultiSelectBar.toCallout,
    )
    btnToCallout.addEventListener('click', () => applyConvert('callout', { calloutType: 'info' }))

    const divider = document.createElement('div')
    divider.className = 'be-multiselect-bar__divider'

    const btnClear = this.createBtn(
      icons.close,
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
    this.bar.appendChild(btnToHeading1)
    this.bar.appendChild(btnToQuote)
    this.bar.appendChild(btnToTask)
    this.bar.appendChild(btnToBullet)
    this.bar.appendChild(btnToOrdered)
    this.bar.appendChild(btnToCallout)
    this.bar.appendChild(divider)
    this.bar.appendChild(btnClear)

    this.getMountContainer().appendChild(this.bar)

    editorCore.editor.on('transaction', () => this.scheduleUpdate())
    this.registerShortcuts()
    window.addEventListener('resize', this.handleWindowResize, { passive: true })
    window.addEventListener('scroll', this.handleWindowScroll, true)
  }

  private registerShortcuts() {
    this.disposeShortcuts.push(
      this.editorCore.shortcuts.registerShortcut({
        id: 'multiselect.clear',
        source: 'BlockMultiSelectBar',
        scope: 'selection',
        command: 'clearBlockSelection',
        combo: { mac: 'Escape', windows: 'Escape' },
        priority: 100,
        allowInInput: true,
        when: () => {
          const storage = this.editorCore.editor.storage.blockMultiSelect as BlockMultiSelectStorage
          return (storage?.selectedPositions?.size || 0) > 0
        },
        run: () => {
          this.editorCore.editor.commands.clearBlockSelection()
        },
      }),
    )
  }

  private scheduleUpdate() {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.update()
    })
  }

  private update() {
    const storage = this.editorCore.editor.storage.blockMultiSelect as BlockMultiSelectStorage
    if (!storage) return

    const count = storage.selectedPositions.size
    if (count === 0) {
      this.bar.style.display = 'none'
      return
    }

    this.countLabel.textContent = this.editorCore.i18n.blockMultiSelectBar.selectedCount(count)
    this.bar.style.display = 'flex'
    this.positionBar()
  }

  private createBtn(html: string, title: string, danger = false): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'icon-btn be-multiselect-bar__btn' + (danger ? ' danger' : '')
    btn.title = title
    btn.setAttribute('aria-label', title)
    btn.setAttribute('type', 'button')
    btn.innerHTML = html
    btn.addEventListener('mousedown', (event) => event.preventDefault())
    return btn
  }

  private getMountContainer(): HTMLElement {
    const editorRoot = this.editorCore.editor.options.element as HTMLElement
    const editorContainer =
      (editorRoot.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('.editor-container') as HTMLElement | null)
    if (editorContainer) return editorContainer
    if (this.mountContainer) return this.mountContainer
    const container =
      (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null)
    return container || resolveUILayerHost('overlay', editorRoot)
  }

  private positionBar() {
    const container = this.getMountContainer()
    const containerRect = container.getBoundingClientRect()
    const barRect = this.bar.getBoundingClientRect()
    const scrollViewport = this.getScrollViewport()
    const viewportRect = scrollViewport?.getBoundingClientRect()
    const minMargin = 12
    const topPadding = 8

    let targetCenterX = containerRect.left + containerRect.width / 2
    let targetTop = containerRect.top + topPadding

    const selectedBoxes = this.getSelectedBlockRects()
    if (selectedBoxes.length > 0) {
      const left = Math.min(...selectedBoxes.map((r) => r.left))
      const right = Math.max(...selectedBoxes.map((r) => r.right))
      const top = Math.min(...selectedBoxes.map((r) => r.top))
      targetCenterX = (left + right) / 2
      targetTop = top - barRect.height - 10
    }

    const maxLeft = Math.max(minMargin, containerRect.width - barRect.width - minMargin)
    const localLeft = Math.min(
      maxLeft,
      Math.max(minMargin, targetCenterX - containerRect.left - barRect.width / 2),
    )
    const visibleTop = viewportRect
      ? Math.max(viewportRect.top + topPadding, containerRect.top + topPadding)
      : containerRect.top + topPadding
    const visibleBottom = viewportRect
      ? Math.min(viewportRect.bottom - minMargin, containerRect.bottom - minMargin)
      : containerRect.bottom - minMargin
    const clampedTopInViewport = Math.min(
      visibleBottom - barRect.height,
      Math.max(visibleTop, targetTop),
    )
    const maxTop = Math.max(topPadding, containerRect.height - barRect.height - minMargin)
    const localTop = Math.min(
      maxTop,
      Math.max(topPadding, clampedTopInViewport - containerRect.top),
    )

    this.bar.style.left = `${Math.round(localLeft)}px`
    this.bar.style.top = `${Math.round(localTop)}px`
  }

  private getScrollViewport(): HTMLElement | null {
    const editorRoot = this.editorCore.editor.options.element as HTMLElement
    return (
      (editorRoot.closest('[data-be-scroll-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('.editor-scroll-area') as HTMLElement | null)
    )
  }

  private getSelectedBlockRects(): DOMRect[] {
    const storage = this.editorCore.editor.storage.blockMultiSelect as BlockMultiSelectStorage
    if (!storage || storage.selectedPositions.size === 0) return []
    const root = this.editorCore.editor.view.dom as HTMLElement
    const topBlocks = Array.from(root.children) as HTMLElement[]
    const offsets: number[] = []
    this.editorCore.editor.state.doc.forEach((_node: any, offset: number) => {
      offsets.push(offset)
    })
    const limit = Math.min(topBlocks.length, offsets.length)
    const selectedRects: DOMRect[] = []
    for (let i = 0; i < limit; i += 1) {
      if (!storage.selectedPositions.has(offsets[i])) continue
      selectedRects.push(topBlocks[i].getBoundingClientRect())
    }
    return selectedRects
  }

  destroy() {
    this.bar.remove()
    this.disposeShortcuts.forEach((dispose) => dispose())
    this.disposeShortcuts.length = 0
    window.removeEventListener('resize', this.handleWindowResize)
    window.removeEventListener('scroll', this.handleWindowScroll, true)
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }
}
