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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMultiSelect: {
      /** 切换单个块的选中状态 */
      toggleBlockSelection: (pos: number) => ReturnType
      /** 范围选中：从 fromPos 到 toPos（按文档顺序） */
      rangeSelectBlocks: (fromPos: number, toPos: number) => ReturnType
      /** 清除所有多选块 */
      clearBlockSelection: () => ReturnType
      /** 删除所有选中块 */
      deleteSelectedBlocks: () => ReturnType
      /** 转换选中块类型 */
      convertSelectedBlocks: (nodeType: string, attrs?: Record<string, any>) => ReturnType
      /** 批量移动选中块 */
      moveSelectedBlocks: (direction: MoveDirection) => ReturnType
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

      deleteSelectedBlocks:
        () =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const positions = Array.from(storage.selectedPositions).sort((a, b) => b - a)
          const { state } = editor
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

          editor.view.dispatch(tr)
          storage.selectedPositions.clear()
          return true
        },

      convertSelectedBlocks:
        (nodeType: string, attrs?: Record<string, any>) =>
        ({ editor }) => {
          const storage = editor.storage.blockMultiSelect as BlockMultiSelectStorage
          if (storage.selectedPositions.size === 0) return false

          const schema = editor.state.schema
          const paragraphType = schema.nodes.paragraph
          if (!paragraphType) return false

          const selected = new Set(storage.selectedPositions)
          const rebuilt: ProseMirrorNode[] = []

          const toParagraph = (node: ProseMirrorNode): ProseMirrorNode => {
            if (node.type === paragraphType) return node
            if (node.isTextblock) return paragraphType.create(null, node.content)
            return paragraphType.create(null, node.textContent ? schema.text(node.textContent) : undefined)
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
              return wrapperType.create({ calloutType: 'info', ...(attrs || {}) }, paragraph)
            }
            return wrapperType.create(attrs || null, paragraph)
          }

          editor.state.doc.forEach((node, offset) => {
            if (!selected.has(offset)) {
              rebuilt.push(node)
              return
            }

            if (nodeType === 'paragraph') {
              rebuilt.push(toParagraph(node))
              return
            }

            if (nodeType === 'heading') {
              const headingType = schema.nodes.heading
              if (!headingType) {
                rebuilt.push(node)
                return
              }
              rebuilt.push(headingType.create({ level: 1, ...(attrs || {}) }, toParagraph(node).content))
              return
            }

            if (nodeType === 'blockquote' || nodeType === 'callout') {
              const wrapped = wrapAsQuoteOrCallout(node, nodeType)
              rebuilt.push(wrapped ?? node)
              return
            }

            if (nodeType === 'bulletList' || nodeType === 'orderedList' || nodeType === 'taskList') {
              const wrapped = wrapAsList(node, nodeType)
              rebuilt.push(wrapped ?? node)
              return
            }

            const targetType = schema.nodes[nodeType]
            if (!targetType) {
              rebuilt.push(node)
              return
            }

            try {
              rebuilt.push(targetType.create({ ...node.attrs, ...(attrs || {}) }, node.content, node.marks))
            } catch {
              rebuilt.push(node)
            }
          })

          const tr = editor.state.tr.replaceWith(
            0,
            editor.state.doc.content.size,
            Fragment.fromArray(rebuilt),
          )

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
          editor.state.doc.forEach((node, offset) => {
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

          const tr = editor.state.tr.replaceWith(
            0,
            editor.state.doc.content.size,
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

  constructor(view: EditorView, storage: BlockMultiSelectStorage) {
    this.view = view
    this.storage = storage

    this.overlayContainer = document.createElement('div')
    this.overlayContainer.className = 'be-block-multiselect-overlays'
    Object.assign(this.overlayContainer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '5',
    })

    const container = view.dom.closest('.editor-container') as HTMLElement
    if (container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative'
      }
      container.appendChild(this.overlayContainer)
    }
  }

  update(_view: EditorView, _prevState: any) {
    this.renderOverlays()
  }

  renderOverlays() {
    this.overlayContainer.innerHTML = ''

    if (this.storage.selectedPositions.size === 0) return

    const container = this.view.dom.closest('.editor-container') as HTMLElement
    if (!container) return
    const containerRect = container.getBoundingClientRect()

    for (const pos of this.storage.selectedPositions) {
      const node = this.view.state.doc.nodeAt(pos)
      if (!node) continue

      try {
        const startCoords = this.view.coordsAtPos(pos + 1)
        const endPos = Math.min(pos + node.nodeSize - 1, this.view.state.doc.content.size)
        const endCoords = this.view.coordsAtPos(endPos)

        const top = startCoords.top - containerRect.top - 2
        const height = endCoords.bottom - startCoords.top + 4
        const left = 0
        const width = container.clientWidth

        const overlay = document.createElement('div')
        overlay.className = 'be-block-multiselect-overlay'

        const primary = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-color')
          .trim() || 'oklch(62.3% 0.214 259.815)'

        Object.assign(overlay.style, {
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
          background: `color-mix(in oklab, ${primary} 18%, transparent)`,
          border: `1.5px solid ${primary}`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${primary} 55%, transparent)`,
          borderRadius: '4px',
          pointerEvents: 'none',
        })
        this.overlayContainer.appendChild(overlay)
      } catch {
        // coordsAtPos may throw for out-of-range positions
      }
    }
  }

  destroy() {
    this.overlayContainer.remove()
  }
}
