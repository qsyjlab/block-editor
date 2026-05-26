/**
 * BlockMultiSelect — Shift+点击块手柄连续选块，支持批量删除/转换/移动
 */

import { Extension } from '@tiptap/core'
import { Fragment, Node as ProseMirrorNode } from 'prosemirror-model'
import { Plugin, PluginKey, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

export interface BlockMultiSelectStorage {
  selectedPositions: Set<number>
}

type MoveDirection = 'up' | 'down'
type DropPlacement = 'before' | 'after'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMultiSelect: {
      /** 切换单个块的选中状态 */
      toggleBlockSelection: (pos: number) => ReturnType
      /** 范围选中：从 fromPos 到 toPos（按文档顺序） */
      rangeSelectBlocks: (fromPos: number, toPos: number) => ReturnType
      /** 清除所有多选块 */
      clearBlockSelection: () => ReturnType
      /** 直接设置多选块（覆盖） */
      setBlockSelectionPositions: (positions: number[]) => ReturnType
      /** 删除所有选中块 */
      deleteSelectedBlocks: () => ReturnType
      /** 转换选中块类型 */
      convertSelectedBlocks: (nodeType: string, attrs?: Record<string, any>) => ReturnType
      /** 批量移动选中块 */
      moveSelectedBlocks: (direction: MoveDirection) => ReturnType
      /** 将当前选中块组拖放到目标块前/后 */
      moveSelectedBlocksToTarget: (targetPos: number, placement: DropPlacement) => ReturnType
    }
  }
}

export const BlockMultiSelect = Extension.create<{}, BlockMultiSelectStorage>({
  name: 'blockMultiSelect',

  addStorage() {
    return {
      selectedPositions: new Set<number>(),
    }
  },

  addCommands() {
    return {
      toggleBlockSelection:
        (pos: number) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.has(pos)) {
            storage.selectedPositions.delete(pos)
          } else {
            storage.selectedPositions.add(pos)
          }
          editor.view.dispatch(editor.state.tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      rangeSelectBlocks:
        (fromPos: number, toPos: number) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          const doc = editor.state.doc
          const start = Math.min(fromPos, toPos)
          const end = Math.max(fromPos, toPos)

          doc.forEach((_node, offset) => {
            if (offset >= start && offset <= end) {
              storage.selectedPositions.add(offset)
            }
          })
          editor.view.dispatch(editor.state.tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      clearBlockSelection:
        () =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return true
          storage.selectedPositions.clear()
          editor.view.dispatch(editor.state.tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      setBlockSelectionPositions:
        (positions: number[]) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          const next = new Set<number>(positions.filter((pos) => Number.isFinite(pos)))
          const prev = storage.selectedPositions
          const unchanged =
            prev.size === next.size && Array.from(prev).every((pos) => next.has(pos))
          if (unchanged) return true
          storage.selectedPositions = next
          editor.view.dispatch(editor.state.tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      deleteSelectedBlocks:
        () =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const positions = Array.from(storage.selectedPositions).sort((a, b) => b - a)
          const state = editor.view?.state || editor.state
          let tr: Transaction = state.tr

          for (const pos of positions) {
            const node = tr.doc.nodeAt(pos)
            if (!node) continue
            try {
              tr = tr.delete(pos, pos + node.nodeSize)
            } catch {
              // pos out of range after previous deletions
            }
          }

          if (!tr.docChanged) return false
          if (editor.view?.state && tr.before !== editor.view.state.doc) {
            return false
          }
          storage.selectedPositions.clear()
          editor.view.dispatch(tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      convertSelectedBlocks:
        (nodeType: string, attrs?: Record<string, any>) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const state = editor.view?.state || editor.state
          const schema = state.schema
          const paragraphType = schema.nodes.paragraph
          if (!paragraphType) return false

          const selected = new Set(storage.selectedPositions)
          const rebuilt: ProseMirrorNode[] = []
          const newSelected = new Set<number>()
          let rebuiltOffset = 0

          const pushNode = (node: ProseMirrorNode, selectedAfterConvert: boolean) => {
            if (selectedAfterConvert) {
              newSelected.add(rebuiltOffset)
            }
            rebuilt.push(node)
            rebuiltOffset += node.nodeSize
          }

          const toParagraph = (node: ProseMirrorNode): ProseMirrorNode => {
            if (node.type === paragraphType) return node
            if (node.isTextblock) return paragraphType.create(null, node.content)
            return paragraphType.create(
              null,
              node.textContent ? schema.text(node.textContent) : undefined,
            )
          }

          const wrapAsList = (
            baseNode: ProseMirrorNode,
            listTypeName: 'bulletList' | 'orderedList' | 'taskList',
          ): ProseMirrorNode | null => {
            const listType = schema.nodes[listTypeName]
            if (!listType) return null

            const paragraph = toParagraph(baseNode)

            if (listTypeName === 'taskList') {
              const taskItemType = schema.nodes.taskItem
              if (!taskItemType) return null
              const taskItem = taskItemType.create({ checked: false }, paragraph)
              return listType.create(null, taskItem)
            }

            const listItemType = schema.nodes.listItem
            if (!listItemType) return null
            const listItem = listItemType.create(null, paragraph)
            return listType.create(null, listItem)
          }

          const wrapAsQuoteOrCallout = (
            baseNode: ProseMirrorNode,
            wrapperName: 'blockquote' | 'callout',
          ): ProseMirrorNode | null => {
            const wrapperType = schema.nodes[wrapperName]
            if (!wrapperType) return null
            const paragraph = toParagraph(baseNode)
            if (wrapperName === 'callout') {
              return wrapperType.create({ calloutType: 'info', ...attrs }, paragraph)
            }
            return wrapperType.create(attrs || null, paragraph)
          }

          const topLevel: Array<{ node: ProseMirrorNode; offset: number }> = []
          state.doc.forEach((node, offset) => {
            topLevel.push({ node, offset })
          })

          for (let index = 0; index < topLevel.length; index += 1) {
            const { node, offset } = topLevel[index]
            if (!selected.has(offset)) {
              pushNode(node, false)
              continue
            }

            if (nodeType === 'paragraph') {
              pushNode(toParagraph(node), true)
              continue
            }

            if (nodeType === 'heading') {
              const headingType = schema.nodes.heading
              if (!headingType) {
                pushNode(node, true)
                continue
              }
              pushNode(headingType.create({ level: 1, ...attrs }, toParagraph(node).content), true)
              continue
            }

            if (nodeType === 'blockquote' || nodeType === 'callout') {
              const wrapped = wrapAsQuoteOrCallout(node, nodeType)
              pushNode(wrapped ?? node, true)
              continue
            }

            if (
              nodeType === 'bulletList' ||
              nodeType === 'orderedList' ||
              nodeType === 'taskList'
            ) {
              const listType = schema.nodes[nodeType]
              const listItemType =
                nodeType === 'taskList' ? schema.nodes.taskItem : schema.nodes.listItem
              if (!listType || !listItemType) {
                pushNode(node, true)
                continue
              }

              const listItems: ProseMirrorNode[] = []
              let cursor = index
              while (cursor < topLevel.length && selected.has(topLevel[cursor].offset)) {
                const paragraph = toParagraph(topLevel[cursor].node)
                const itemAttrs = nodeType === 'taskList' ? { checked: false } : null
                listItems.push(listItemType.create(itemAttrs, paragraph))
                cursor += 1
              }

              if (listItems.length === 0) {
                const wrapped = wrapAsList(node, nodeType)
                pushNode(wrapped ?? node, true)
              } else {
                pushNode(listType.create(null, Fragment.fromArray(listItems)), true)
                index = cursor - 1
              }
              continue
            }

            const targetType = schema.nodes[nodeType]
            if (!targetType) {
              pushNode(node, true)
              continue
            }

            try {
              pushNode(targetType.create({ ...node.attrs, ...attrs }, node.content, node.marks), true)
            } catch {
              pushNode(node, true)
            }
          }

          const tr = state.tr.replaceWith(
            0,
            state.doc.content.size,
            Fragment.fromArray(rebuilt),
          )

          storage.selectedPositions = newSelected
          editor.view.dispatch(tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      moveSelectedBlocks:
        (direction: MoveDirection) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const nodes: ProseMirrorNode[] = []
          const offsets: number[] = []
          const state = editor.view?.state || editor.state
          state.doc.forEach((node, offset) => {
            nodes.push(node)
            offsets.push(offset)
          })

          if (nodes.length <= 1) return false

          const selectedIndexSet = new Set<number>()
          offsets.forEach((offset, i) => {
            if (storage.selectedPositions.has(offset)) selectedIndexSet.add(i)
          })
          if (selectedIndexSet.size === 0) return false

          const order = nodes.map((_, i) => i)
          let moved = false

          if (direction === 'up') {
            for (let i = 1; i < order.length; i += 1) {
              if (selectedIndexSet.has(order[i]) && !selectedIndexSet.has(order[i - 1])) {
                ;[order[i - 1], order[i]] = [order[i], order[i - 1]]
                moved = true
              }
            }
          } else {
            for (let i = order.length - 2; i >= 0; i -= 1) {
              if (selectedIndexSet.has(order[i]) && !selectedIndexSet.has(order[i + 1])) {
                ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
                moved = true
              }
            }
          }

          if (!moved) return false

          const reorderedNodes = order.map((idx) => nodes[idx])
          const reorderedOriginalIdx = order

          const newSelected = new Set<number>()
          let runningOffset = 0
          for (let i = 0; i < reorderedNodes.length; i += 1) {
            if (selectedIndexSet.has(reorderedOriginalIdx[i])) {
              newSelected.add(runningOffset)
            }
            runningOffset += reorderedNodes[i].nodeSize
          }

          storage.selectedPositions = newSelected

          const tr = state.tr.replaceWith(
            0,
            state.doc.content.size,
            Fragment.fromArray(reorderedNodes),
          )
          editor.view.dispatch(tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },

      moveSelectedBlocksToTarget:
        (targetPos: number, placement: DropPlacement) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const nodes: ProseMirrorNode[] = []
          const offsets: number[] = []
          const state = editor.view?.state || editor.state
          state.doc.forEach((node, offset) => {
            nodes.push(node)
            offsets.push(offset)
          })
          if (nodes.length <= 1) return false

          const selectedIndexSet = new Set<number>()
          offsets.forEach((offset, i) => {
            if (storage.selectedPositions.has(offset)) selectedIndexSet.add(i)
          })
          if (selectedIndexSet.size === 0) return false

          const targetIndex = offsets.findIndex((offset) => offset === targetPos)
          if (targetIndex < 0) return false
          if (selectedIndexSet.has(targetIndex)) return false

          const movingNodes: ProseMirrorNode[] = []
          const remainingNodes: ProseMirrorNode[] = []
          const remainingOriginalIndices: number[] = []

          for (let i = 0; i < nodes.length; i += 1) {
            if (selectedIndexSet.has(i)) {
              movingNodes.push(nodes[i])
            } else {
              remainingNodes.push(nodes[i])
              remainingOriginalIndices.push(i)
            }
          }
          if (movingNodes.length === 0 || remainingNodes.length === 0) return false

          const targetInRemaining = remainingOriginalIndices.indexOf(targetIndex)
          if (targetInRemaining < 0) return false

          const insertAt = placement === 'after' ? targetInRemaining + 1 : targetInRemaining
          const reorderedNodes = remainingNodes.slice()
          reorderedNodes.splice(insertAt, 0, ...movingNodes)

          const movingNodeSet = new Set(movingNodes)
          const newSelected = new Set<number>()
          let runningOffset = 0
          for (const node of reorderedNodes) {
            if (movingNodeSet.has(node)) {
              newSelected.add(runningOffset)
            }
            runningOffset += node.nodeSize
          }
          storage.selectedPositions = newSelected

          const tr = state.tr.replaceWith(
            0,
            state.doc.content.size,
            Fragment.fromArray(reorderedNodes),
          )
          editor.view.dispatch(tr.setMeta('blockMultiSelectUpdate', true))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage as BlockMultiSelectStorage

    return [
      new Plugin({
        key: new PluginKey('blockMultiSelectOverlay'),

        view(editorView: EditorView) {
          return new BlockMultiSelectOverlayView(editorView, storage)
        },
      }),
    ]
  },
})

class BlockMultiSelectOverlayView {
  private view: EditorView
  private storage: BlockMultiSelectStorage
  private overlayContainer: HTMLElement
  private marqueeBox: HTMLElement
  private mountedContainer: HTMLElement | null = null
  private listenersBound = false
  private selectedOverlayRects: HTMLElement[] = []
  private marqueeActive = false
  private marqueePending = false
  private pendingStartX = 0
  private pendingStartY = 0
  private marqueeStartLocalX = 0
  private marqueeStartLocalY = 0
  private marqueeCurrentX = 0
  private marqueeCurrentY = 0
  private marqueeCurrentLocalX = 0
  private marqueeCurrentLocalY = 0
  private marqueeRafId: number | null = null
  private viewportRafId: number | null = null
  private blockSnapshot: Array<{
    top: number
    bottom: number
    left: number
    right: number
    topLevelPos: number
  }> = []
  private readonly marqueeSelectingAttr = 'data-be-marquee-selecting'
  private lastSelectionKey = ''

  constructor(view: EditorView, storage: BlockMultiSelectStorage) {
    this.view = view
    this.storage = storage

    this.overlayContainer = document.createElement('div')
    this.overlayContainer.className = 'be-block-multiselect-overlays'
    Object.assign(this.overlayContainer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '80',
    })

    this.marqueeBox = document.createElement('div')
    this.marqueeBox.className = 'be-block-multiselect-marquee'
    Object.assign(this.marqueeBox.style, {
      position: 'absolute',
      display: 'none',
      pointerEvents: 'none',
      border: '1px solid color-mix(in srgb, var(--primary-color) 78%, transparent)',
      background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
      borderRadius: '4px',
      zIndex: '81',
    })
    this.overlayContainer.appendChild(this.marqueeBox)
    this.ensureMounted()
  }

  update(view: EditorView, prevState: any) {
    this.ensureMounted()
    const nextSelectionKey = this.getSelectionKey(this.storage.selectedPositions)
    const docUnchanged = !!prevState && prevState.doc === view.state.doc
    if (!this.marqueeActive && docUnchanged && nextSelectionKey === this.lastSelectionKey) {
      return
    }
    this.lastSelectionKey = nextSelectionKey
    this.renderOverlays()
  }

  renderOverlays() {
    const existingMarquee = this.marqueeBox
    this.overlayContainer.innerHTML = ''

    this.overlayContainer.appendChild(existingMarquee)
    this.applyHighlightedSelection(this.storage.selectedPositions)
  }

  private applyHighlightedSelection(selectedPositions: Set<number>) {
    this.clearSelectedOverlays()
    if (selectedPositions.size === 0) return
    const container = this.getEditorContainer()
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const root = this.view.dom as HTMLElement
    const topBlocks = Array.from(root.children) as HTMLElement[]
    const topLevelOffsets = this.getTopLevelOffsets()
    const limit = Math.min(topBlocks.length, topLevelOffsets.length)

    for (let i = 0; i < limit; i += 1) {
      const topLevelPos = topLevelOffsets[i]
      if (!selectedPositions.has(topLevelPos)) continue
      const blockRect = topBlocks[i].getBoundingClientRect()
      const overlay = document.createElement('div')
      overlay.className = 'be-block-multiselect-selected-overlay'
      Object.assign(overlay.style, {
        position: 'absolute',
        left: `${Math.max(0, blockRect.left - containerRect.left)}px`,
        top: `${Math.max(0, blockRect.top - containerRect.top)}px`,
        width: `${Math.max(0, blockRect.width)}px`,
        height: `${Math.max(0, blockRect.height)}px`,
        borderRadius: '4px',
        outline: '1px solid color-mix(in srgb, var(--primary-color) 60%, transparent)',
        background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
        pointerEvents: 'none',
        zIndex: '79',
      })
      const accent = document.createElement('div')
      Object.assign(accent.style, {
        position: 'absolute',
        left: '-10px',
        top: '2px',
        bottom: '2px',
        width: '4px',
        borderRadius: '999px',
        background: 'color-mix(in srgb, var(--primary-color) 76%, transparent)',
      })
      overlay.appendChild(accent)
      this.overlayContainer.appendChild(overlay)
      this.selectedOverlayRects.push(overlay)
    }
  }

  private getTopLevelOffsets() {
    const offsets: number[] = []
    this.view.state.doc.forEach((_node, offset) => {
      offsets.push(offset)
    })
    return offsets
  }

  private getSelectionKey(selected: Set<number>) {
    if (selected.size === 0) return ''
    return Array.from(selected)
      .sort((a, b) => a - b)
      .join(',')
  }

  private clearSelectedOverlays() {
    for (const overlay of this.selectedOverlayRects) {
      overlay.remove()
    }
    this.selectedOverlayRects = []
  }

  private getEditorContainer() {
    const dom = this.view.dom as HTMLElement
    return (
      (dom.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (dom.closest('.editor-container') as HTMLElement | null) ||
      dom.parentElement
    )
  }

  private ensureMounted() {
    const container = this.getEditorContainer()
    if (!container) return

    if (this.mountedContainer !== container || !container.contains(this.overlayContainer)) {
      this.overlayContainer.remove()
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative'
      }
      container.appendChild(this.overlayContainer)
      this.mountedContainer = container
    }

    if (!this.listenersBound) {
      window.addEventListener('mousedown', this.handleMouseDown, true)
      window.addEventListener('mousemove', this.handleMouseMove, true)
      window.addEventListener('mouseup', this.handleMouseUp, true)
      window.addEventListener('scroll', this.handleScroll, true)
      window.addEventListener('resize', this.handleViewportChange, {
        passive: true,
      })
      this.listenersBound = true
    }
  }

  private getCanvasBounds() {
    const container = this.getEditorContainer()
    const prose = this.view.dom as HTMLElement
    if (!container || !prose) return null
    const c = container.getBoundingClientRect()
    const p = prose.getBoundingClientRect()
    return {
      containerRect: c,
      proseRect: p,
      gutterRight: p.left + 20,
      marqueeStartLeft: p.left - 140,
      marqueeStartRight: p.left + 56,
    }
  }

  private handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement)?.closest('.be-block-handle')) return
    if ((event.target as HTMLElement)?.closest('.be-block-handle-menu')) return
    if ((event.target as HTMLElement)?.closest('.be-toolbar')) return
    if ((event.target as HTMLElement)?.closest('.be-table-toolbar')) return
    if ((event.target as HTMLElement)?.closest('.be-selection-tooltip')) return

    const bounds = this.getCanvasBounds()
    if (!bounds) return
    const inMarqueeArea =
      event.clientX >= bounds.marqueeStartLeft &&
      event.clientX <= bounds.marqueeStartRight &&
      event.clientY >= bounds.proseRect.top &&
      event.clientY <= bounds.proseRect.bottom
    if (!inMarqueeArea) return

    event.preventDefault()
    this.marqueePending = true
    this.pendingStartX = event.clientX
    this.pendingStartY = event.clientY
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.marqueeActive) {
      if (!this.marqueePending) return
      const dx = event.clientX - this.pendingStartX
      const dy = event.clientY - this.pendingStartY
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 4) return

      this.marqueePending = false
      this.marqueeActive = true
      const startLocal = this.clientToLocal(this.pendingStartX, this.pendingStartY)
      this.marqueeStartLocalX = startLocal.x
      this.marqueeStartLocalY = startLocal.y
      this.marqueeCurrentX = event.clientX
      this.marqueeCurrentY = event.clientY
      const currentLocal = this.clientToLocal(event.clientX, event.clientY)
      this.marqueeCurrentLocalX = currentLocal.x
      this.marqueeCurrentLocalY = currentLocal.y
      this.setMarqueeSelectingState(true)
      this.clearNativeSelection()
      this.captureBlockSnapshot()
      this.updateMarqueeBox()
      this.clearSelectedOverlays()
    }

    event.preventDefault()
    this.marqueeCurrentX = event.clientX
    this.marqueeCurrentY = event.clientY
    const currentLocal = this.clientToLocal(event.clientX, event.clientY)
    this.marqueeCurrentLocalX = currentLocal.x
    this.marqueeCurrentLocalY = currentLocal.y
    this.scheduleMarqueeFrame()
  }

  private handleMouseUp = (event: MouseEvent) => {
    if (this.marqueePending && !this.marqueeActive) {
      this.marqueePending = false
      return
    }
    if (!this.marqueeActive) return
    event.preventDefault()
    this.marqueeCurrentX = event.clientX
    this.marqueeCurrentY = event.clientY
    const currentLocal = this.clientToLocal(event.clientX, event.clientY)
    this.marqueeCurrentLocalX = currentLocal.x
    this.marqueeCurrentLocalY = currentLocal.y
    this.flushMarqueeFrame()
    this.updateSelectionByMarquee(true)
    this.marqueeActive = false
    this.marqueeBox.style.display = 'none'
    this.blockSnapshot = []
    this.setMarqueeSelectingState(false)
    this.marqueePending = false
  }

  private handleScroll = () => {
    if (this.marqueeActive) {
      const currentLocal = this.clientToLocal(this.marqueeCurrentX, this.marqueeCurrentY)
      this.marqueeCurrentLocalX = currentLocal.x
      this.marqueeCurrentLocalY = currentLocal.y
      this.scheduleMarqueeFrame()
      return
    }
    this.scheduleViewportRefresh()
  }

  private handleViewportChange = () => {
    this.scheduleViewportRefresh()
  }

  private scheduleViewportRefresh() {
    if (this.marqueeActive) return
    if (this.storage.selectedPositions.size === 0) return
    if (this.viewportRafId !== null) return
    this.viewportRafId = window.requestAnimationFrame(() => {
      this.viewportRafId = null
      this.renderOverlays()
    })
  }

  private setMarqueeSelectingState(active: boolean) {
    const root = document.documentElement
    if (active) {
      root.setAttribute(this.marqueeSelectingAttr, '1')
    } else {
      root.removeAttribute(this.marqueeSelectingAttr)
    }
    const container = this.getEditorContainer()
    const prose = this.view.dom as HTMLElement
    if (container) {
      container.style.userSelect = active ? 'none' : ''
      container.style.cursor = active ? 'crosshair' : ''
    }
    if (prose) {
      prose.style.userSelect = active ? 'none' : ''
    }
  }

  private clearNativeSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    selection.removeAllRanges()
  }

  private scheduleMarqueeFrame() {
    if (this.marqueeRafId !== null) return
    this.marqueeRafId = window.requestAnimationFrame(() => {
      this.marqueeRafId = null
      this.flushMarqueeFrame()
    })
  }

  private flushMarqueeFrame() {
    if (!this.marqueeActive) return
    this.updateMarqueeBox()
  }

  private captureBlockSnapshot() {
    const bounds = this.getCanvasBounds()
    if (!bounds) return
    const root = this.view.dom as HTMLElement
    const topBlocks = Array.from(root.children) as HTMLElement[]
    const topLevelOffsets = this.getTopLevelOffsets()
    const limit = Math.min(topBlocks.length, topLevelOffsets.length)
    const next: Array<{
      top: number
      bottom: number
      left: number
      right: number
      topLevelPos: number
    }> = []
    for (let i = 0; i < limit; i += 1) {
      const block = topBlocks[i]
      const rect = block.getBoundingClientRect()
      next.push({
        top: rect.top - bounds.containerRect.top,
        bottom: rect.bottom - bounds.containerRect.top,
        left: rect.left - bounds.containerRect.left,
        right: rect.right - bounds.containerRect.left,
        topLevelPos: topLevelOffsets[i],
      })
    }
    this.blockSnapshot = next
  }

  private updateMarqueeBox() {
    const bounds = this.getCanvasBounds()
    const canvasWidth = bounds?.containerRect.width ?? 0
    const canvasHeight = bounds?.containerRect.height ?? 0
    const startX = Math.min(canvasWidth, Math.max(0, this.marqueeStartLocalX))
    const currentX = Math.min(canvasWidth, Math.max(0, this.marqueeCurrentLocalX))
    const startY = Math.min(canvasHeight, Math.max(0, this.marqueeStartLocalY))
    const currentY = Math.min(canvasHeight, Math.max(0, this.marqueeCurrentLocalY))

    const left = Math.min(startX, currentX)
    const top = Math.min(startY, currentY)
    const width = Math.max(0, Math.abs(currentX - startX))
    const height = Math.max(0, Math.abs(currentY - startY))
    Object.assign(this.marqueeBox.style, {
      display: 'block',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    })
  }

  private updateSelectionByMarquee(commit: boolean) {
    const minX = Math.min(this.marqueeStartLocalX, this.marqueeCurrentLocalX)
    const maxX = Math.max(this.marqueeStartLocalX, this.marqueeCurrentLocalX)
    const minY = Math.min(this.marqueeStartLocalY, this.marqueeCurrentLocalY)
    const maxY = Math.max(this.marqueeStartLocalY, this.marqueeCurrentLocalY)

    const selected = new Set<number>()
    const source = this.blockSnapshot
    for (const item of source) {
      if (item.bottom < minY) continue
      if (item.top > maxY) break
      const intersectsX = item.right >= minX && item.left <= maxX
      if (!intersectsX) continue
      selected.add(item.topLevelPos)
    }

    const prev = this.storage.selectedPositions
    const changed =
      prev.size !== selected.size || Array.from(prev).some((pos) => !selected.has(pos))
    if (!changed) return

    if (!commit) return
    this.storage.selectedPositions = selected
    this.view.dispatch(this.view.state.tr.setMeta('blockMultiSelectUpdate', true))
  }

  private clientToLocal(clientX: number, clientY: number) {
    const bounds = this.getCanvasBounds()
    if (!bounds) return { x: 0, y: 0 }
    const localX = clientX - bounds.containerRect.left
    const localY = clientY - bounds.containerRect.top
    return {
      x: Math.min(bounds.containerRect.width, Math.max(0, localX)),
      y: Math.min(bounds.containerRect.height, Math.max(0, localY)),
    }
  }

  destroy() {
    this.clearSelectedOverlays()
    this.setMarqueeSelectingState(false)
    this.marqueePending = false
    if (this.marqueeRafId !== null) {
      window.cancelAnimationFrame(this.marqueeRafId)
      this.marqueeRafId = null
    }
    if (this.viewportRafId !== null) {
      window.cancelAnimationFrame(this.viewportRafId)
      this.viewportRafId = null
    }
    if (this.listenersBound) {
      window.removeEventListener('mousedown', this.handleMouseDown, true)
      window.removeEventListener('mousemove', this.handleMouseMove, true)
      window.removeEventListener('mouseup', this.handleMouseUp, true)
      window.removeEventListener('scroll', this.handleScroll, true)
      window.removeEventListener('resize', this.handleViewportChange)
      this.listenersBound = false
    }
    this.overlayContainer.remove()
    this.mountedContainer = null
  }
}
