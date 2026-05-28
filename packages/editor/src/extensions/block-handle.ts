import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey, TextSelection, type Selection } from 'prosemirror-state'
import { CellSelection, TableMap, cellAround } from 'prosemirror-tables'
import { isCellSelection } from '../ui/menus/table-selection'
import { EditorView } from 'prosemirror-view'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { resolveEditorI18n } from '../i18n'
import type { BlockHandleI18n } from '../i18n/types'
import {
  createBlockHandleActionGroups,
  createBlockHandleFeatureItems,
  createImageInsertHandleItem,
  type BlockHandleFeatureItem,
} from '../ui/features/block-features'
import { resolveUILayerHost } from '../ui/layer-root'

/** Simple throttle: fire at most once per `ms` milliseconds */
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

export interface BlockHandleOptions {
  width: number
  enabled: boolean
  i18n: BlockHandleI18n
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockHandle: {
      setBlockHandleEnabled: (enabled: boolean) => ReturnType
    }
  }
}

const DEFAULT_BLOCK_HANDLE_I18N: BlockHandleI18n = resolveEditorI18n('en-US').blockHandle

type BlockHandleMenuItem = BlockHandleFeatureItem & {
  label: string
  icon: string
  action: () => void
  danger?: boolean
}

type TableInsertIntent = {
  kind: 'row' | 'column'
  placement: 'before' | 'after'
  table: HTMLTableElement
  cell: HTMLElement
  lineX: number
  lineY: number
  /** TableMap 行/列索引，避免 DOM rowIndex 与文档结构不一致。 */
  mapIndex: number
}

export const BlockHandle = Extension.create<BlockHandleOptions>({
  name: 'blockHandle',

  addOptions() {
    return {
      width: 24,
      enabled: true,
      i18n: DEFAULT_BLOCK_HANDLE_I18N,
    }
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    }
  },

  addCommands() {
    return {
      setBlockHandleEnabled: (enabled: boolean) => () => {
        this.storage.enabled = enabled
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('blockHandle'),
        view: (editorView) => {
          const view = new BlockHandleView(
            editorView,
            this.options.width,
            editor,
            this.options.i18n,
          )
          if (editor) {
            editor.storage.blockHandleBridge = {
              beginTableDrag: (pos: number) => view.beginExternalTableDrag(pos),
              endTableDrag: () => view.endExternalTableDrag(),
            }
          }
          return view
        },
      }),
    ]
  },
})

class BlockHandleView {
  private editorView: EditorView
  private element: HTMLElement
  private menu: HTMLElement
  private menuAnchorEl: HTMLElement
  private dropIndicator: HTMLElement
  private tableInsertButton: HTMLButtonElement
  private tableInsertIndicator: HTMLElement
  private tableInsertTooltip: HTMLElement
  private tableColumnTriggerLayer: HTMLElement
  private tableRowTriggerLayer: HTMLElement
  private tableInsertIntent: TableInsertIntent | null = null
  private activeTriggerTable: HTMLTableElement | null = null
  private activeTriggerRectKey = ''
  private highlightedInsertCells: HTMLElement[] = []
  private highlightedAxisCells: HTMLElement[] = []
  private tableColumnAxisBar: HTMLElement
  private tableRowAxisBar: HTMLElement
  private axisChromeCleanup: (() => void) | null = null
  private axisChromeTable: HTMLTableElement | null = null
  private activeAxisSelection: {
    table: HTMLTableElement
    axis: 'row' | 'column'
    index: number
  } | null = null
  private axisBarHoverPreview = false
  private pendingAxisCellSelection: CellSelection | null = null
  private suppressEditorPointerUntil = 0
  private readonly columnRegionClass = 'be-table-column-region-selected'
  private readonly rowRegionClass = 'be-table-row-region-selected'
  private currentBlockPos: number | null = null
  private editor: any // Tiptap editor instance
  private hideTimer: any = null
  private menuHideTimer: number | null = null
  private cleanupMenuAutoUpdate: (() => void) | null = null
  private scrollTarget: HTMLElement | Document = document
  private i18n: BlockHandleI18n
  private draggingBlockPos: number | null = null
  private draggingBlockGroup: number[] | null = null
  private dropTargetPos: number | null = null
  private dropPlacement: 'before' | 'after' = 'before'
  private ignoreMenuClickUntil = 0
  private pointerDownAt = 0
  private pointerDownX = 0
  private pointerDownY = 0
  private pointerMaxDistance = 0
  private pointerTracking = false
  private readonly longPressMs = 0
  private readonly dragDistancePx = 2
  private lastTableHandleCell: HTMLTableCellElement | null = null
  private readonly tableHandleHitPad = 12
  /** 与 showTableTriggerLayers 顶/左热区宽度一致（仅热区层，handle 贴表更近） */
  private readonly tableCornerGutter = 14
  /** 表级 handle 贴表格角点间距 */
  private readonly tableBlockHandleSnap = 2
  /** 单元格 handle 与正文块左缘间距 */
  private readonly tableCellHandleInset = 6
  /** 单元格 handle 与列分隔线间距 */
  private readonly tableCellHandleLineGap = 2
  /** 表级 handle 与首行 cell handle 仅在垂直重叠时拉开 */
  private readonly tableCellHandleStackGap = 6
  /** 表级块 handle（与标题同级），与单元格 gutter 的 `element` 分离以便同时显示。 */
  private tableBlockHandleEl: HTMLElement
  private tableBlockHandlePos: number | null = null
  private hoveredTableDom: HTMLTableElement | null = null
  private lastTablePointer: { x: number; y: number } | null = null

  constructor(editorView: EditorView, _width: number, editor: any, i18n: BlockHandleI18n) {
    this.editorView = editorView
    this.editor = editor
    this.i18n = i18n

    // Create Handle Element
    this.element = document.createElement('div')
    this.element.className = 'be-block-handle'
    this.element.setAttribute('role', 'button')
    this.element.setAttribute('aria-label', this.i18n.handleAriaLabel)
    this.element.setAttribute('aria-haspopup', 'menu')
    this.element.setAttribute('tabindex', '0')
    this.element.setAttribute('draggable', 'true')
    this.element.style.position = 'fixed'
    this.element.style.display = 'none'
    this.element.style.alignItems = 'center'
    this.element.style.justifyContent = 'center'
    this.element.style.cursor = 'grab'
    this.element.style.transition =
      'opacity 0.14s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, top 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.12s ease'
    this.element.style.willChange = 'top, left, transform, opacity'
    this.element.style.zIndex = '240050'
    this.element.classList.add('be-block-handle-pill')

    this.dropIndicator = document.createElement('div')
    this.dropIndicator.className = 'be-block-drop-indicator'
    Object.assign(this.dropIndicator.style, {
      position: 'fixed',
      display: 'none',
      height: '3px',
      borderRadius: '999px',
      background: 'var(--primary-color)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--primary-color) 30%, transparent)',
      pointerEvents: 'none',
      zIndex: '240030',
    })
    document.body.appendChild(this.dropIndicator)

    this.tableInsertButton = document.createElement('button')
    this.tableInsertButton.type = 'button'
    this.tableInsertButton.className = 'be-table-insert-control'
    this.tableInsertButton.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
    this.tableInsertButton.style.display = 'none'
    this.tableInsertButton.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
    this.tableInsertButton.addEventListener('click', this.handleTableInsertClick)
    document.body.appendChild(this.tableInsertButton)

    this.tableInsertIndicator = document.createElement('div')
    this.tableInsertIndicator.className = 'be-table-insert-indicator'
    this.tableInsertIndicator.style.display = 'none'
    document.body.appendChild(this.tableInsertIndicator)

    this.tableInsertTooltip = document.createElement('div')
    this.tableInsertTooltip.className = 'be-table-insert-tooltip'
    this.tableInsertTooltip.style.display = 'none'
    document.body.appendChild(this.tableInsertTooltip)

    this.tableColumnTriggerLayer = document.createElement('div')
    this.tableColumnTriggerLayer.className =
      'be-table-trigger-layer be-table-trigger-layer--columns'
    this.tableColumnTriggerLayer.style.display = 'none'
    this.tableColumnTriggerLayer.addEventListener('mousemove', this.handleTableTriggerMove)
    this.tableColumnTriggerLayer.addEventListener(
      'mousedown',
      this.handleTableTriggerMouseDown,
      true,
    )
    this.tableColumnTriggerLayer.addEventListener('click', this.handleTableTriggerClick, true)
    document.body.appendChild(this.tableColumnTriggerLayer)

    this.tableRowTriggerLayer = document.createElement('div')
    this.tableRowTriggerLayer.className = 'be-table-trigger-layer be-table-trigger-layer--rows'
    this.tableRowTriggerLayer.style.display = 'none'
    this.tableRowTriggerLayer.addEventListener('mousemove', this.handleTableTriggerMove)
    this.tableRowTriggerLayer.addEventListener('mousedown', this.handleTableTriggerMouseDown, true)
    this.tableRowTriggerLayer.addEventListener('click', this.handleTableTriggerClick, true)
    document.body.appendChild(this.tableRowTriggerLayer)

    this.tableColumnAxisBar = document.createElement('div')
    this.tableColumnAxisBar.className = 'be-table-column-selection-bar'
    this.tableColumnAxisBar.style.display = 'none'
    this.tableColumnAxisBar.setAttribute('aria-hidden', 'true')
    document.body.appendChild(this.tableColumnAxisBar)

    this.tableRowAxisBar = document.createElement('div')
    this.tableRowAxisBar.className = 'be-table-row-selection-bar'
    this.tableRowAxisBar.style.display = 'none'
    this.tableRowAxisBar.setAttribute('aria-hidden', 'true')
    document.body.appendChild(this.tableRowAxisBar)

    this.editor?.on?.('selectionUpdate', () => {
      if (this.isTableBlockSelected()) {
        this.syncTableChromeFromEditor()
        this.showTableBlockHandleFromSelection()
        return
      }
      if (!this.isSelectionInTableContext()) {
        ;(this.editorView.dom as HTMLElement)
          .querySelectorAll('table.be-table-selected')
          .forEach((el) => el.classList.remove('be-table-selected'))
        this.clearStaleTableHoverState()
      }
      this.syncTableChromeFromEditor()
      this.refreshCellBlockHandleFromSelection()
    })
    this.editor?.on?.('focus', () => {
      this.syncTableChromeFromEditor()
    })
    this.editor?.on?.('blur', () => {
      this.hoveredTableDom = null
      this.lastTablePointer = null
      this.hideTableBlockHandle()
      this.hideTableInsertAffordance()
      this.clearAxisHoverHighlight()
    })

    // Hover effect
    this.element.addEventListener('mouseenter', () => {
      this.cancelHide()
    })
    this.element.addEventListener('mouseleave', () => {
      this.scheduleHide()
    })

    // Handle visual: block type icon + grip dots
    this.element.innerHTML = `
      <span class="be-block-handle-type" aria-hidden="true"></span>
      <span class="be-block-handle-grip" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
          <circle cx="3" cy="3" r="1.1" fill="currentColor"/>
          <circle cx="7" cy="3" r="1.1" fill="currentColor"/>
          <circle cx="3" cy="7" r="1.1" fill="currentColor"/>
          <circle cx="7" cy="7" r="1.1" fill="currentColor"/>
          <circle cx="3" cy="11" r="1.1" fill="currentColor"/>
          <circle cx="7" cy="11" r="1.1" fill="currentColor"/>
        </svg>
      </span>
    `

    // Create Menu Element
    this.menuAnchorEl = this.element
    this.menu = document.createElement('div')
    this.menu.className = 'be-block-handle-menu toolbar-dropdown-menu be-panel-card'
    this.menu.setAttribute('role', 'menu')
    this.menu.setAttribute('aria-label', this.i18n.menuAriaLabel)
    Object.assign(this.menu.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '240040',
      minWidth: '240px',
      pointerEvents: 'auto',
    })

    // Add menu items
    this.renderMenu()

    this.ensureMenuHost()

    // Event Listeners
    this.element.addEventListener('mousedown', (e) => {
      e.stopPropagation()

      if (e.shiftKey && this.currentBlockPos !== null) {
        e.preventDefault()
        // Shift+click: toggle block into multi-selection
        this.editor.commands.toggleBlockSelection(this.currentBlockPos)
        return
      }

      this.pointerDownAt = Date.now()
      this.pointerDownX = e.clientX
      this.pointerDownY = e.clientY
      this.pointerMaxDistance = 0
      this.pointerTracking = true
    })
    this.element.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.shiftKey) return
      if (Date.now() < this.ignoreMenuClickUntil) return
      // 单元格内段落 handle：只开段落/列表菜单，禁止 selectCurrentTableNode（否则会误锁单格 caret）
      if (this.element.dataset.beHandleInTableCell === 'true') {
        this.toggleMenu()
        return
      }
      const node =
        this.currentBlockPos === null
          ? null
          : this.editorView.state.doc.nodeAt(this.currentBlockPos)
      if (node?.type.name === 'table') {
        this.selectCurrentTableNode()
      }
      this.toggleMenu()
    })
    this.element.addEventListener('dragstart', this.handleDragStart)
    this.element.addEventListener('dragend', this.handleDragEnd)

    this.tableBlockHandleEl = document.createElement('div')
    this.tableBlockHandleEl.className =
      'be-block-handle be-block-handle-pill be-block-handle--table-block'
    this.tableBlockHandleEl.setAttribute('role', 'button')
    this.tableBlockHandleEl.setAttribute('aria-label', this.i18n.handleAriaLabel)
    this.tableBlockHandleEl.setAttribute('aria-haspopup', 'menu')
    this.tableBlockHandleEl.setAttribute('tabindex', '0')
    this.tableBlockHandleEl.setAttribute('draggable', 'true')
    Object.assign(this.tableBlockHandleEl.style, {
      position: 'fixed',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'grab',
      zIndex: '240091',
      willChange: 'top, left, transform, opacity',
      transition: this.element.style.transition,
    })
    this.tableBlockHandleEl.innerHTML = this.element.innerHTML
    this.tableBlockHandleEl.addEventListener('mouseenter', () => this.cancelHide())
    this.tableBlockHandleEl.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      if (this.tableBlockHandlePos !== null) {
        this.currentBlockPos = this.tableBlockHandlePos
      }
      this.pointerDownAt = Date.now()
      this.pointerDownX = e.clientX
      this.pointerDownY = e.clientY
      this.pointerMaxDistance = 0
      this.pointerTracking = true
    })
    this.tableBlockHandleEl.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (Date.now() < this.ignoreMenuClickUntil) return
      if (this.pointerMaxDistance >= this.dragDistancePx) return
      if (this.tableBlockHandlePos !== null) {
        this.currentBlockPos = this.tableBlockHandlePos
        this.selectCurrentTableNode()
        this.menuAnchorEl = this.tableBlockHandleEl
        this.toggleMenu()
      }
    })
    this.tableBlockHandleEl.addEventListener('dragstart', this.handleDragStart)
    this.tableBlockHandleEl.addEventListener('dragend', this.handleDragEnd)

    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('dragend', this.handleDragEnd, true)
    document.addEventListener('dragover', this.handleDragOver, true)
    document.addEventListener('drop', this.handleDrop, true)
    document.addEventListener('mousedown', this.handleGlobalPointerDown, true)
    document.addEventListener('mousedown', this.handleSuppressEditorPointer, true)
    document.addEventListener('click', this.handleSuppressEditorPointer, true)
    document.addEventListener('mouseup', this.handleSuppressEditorPointer, true)
    document.addEventListener('mousemove', this.handlePointerTrackMove, true)
    document.addEventListener('mouseup', this.handlePointerTrackEnd, true)
    window.addEventListener('blur', this.handlePointerTrackEnd)

    this.scrollTarget = this.getScrollContainer() || document
    if (this.scrollTarget === document) {
      document.addEventListener('scroll', this.handleScroll, true)
    } else {
      ;(this.scrollTarget as HTMLElement).addEventListener('scroll', this.handleScroll, {
        passive: true,
      })
    }
  }

  private getEditorContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement
    return (
      (dom.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (dom.closest('.editor-container') as HTMLElement | null)
    )
  }

  private ensureMenuHost() {
    if (this.menu.parentElement !== document.body) {
      document.body.appendChild(this.menu)
    }
    Object.assign(this.menu.style, {
      position: 'fixed',
      zIndex: '240080',
      pointerEvents: 'auto',
    })
  }

  private isTableChromeTarget(target: Node | null) {
    return Boolean(
      (target as HTMLElement | null)?.closest?.(
        '.be-table-trigger-layer, .be-table-axis-zone, .be-table-insert-dot, .be-table-column-selection-bar, .be-table-row-selection-bar, .be-table-insert-control, .be-table-insert-indicator, .be-table-insert-tooltip, .be-block-handle--table-block',
      ),
    )
  }

  private stripTableBlockSelectionVisual() {
    ;(this.editorView.dom as HTMLElement)
      .querySelectorAll('table.be-table-selected')
      .forEach((el) => el.classList.remove('be-table-selected'))
  }

  private clearTableBlockSelection() {
    this.stripTableBlockSelectionVisual()

    const { state } = this.editorView
    const selection = state.selection
    if (!(selection instanceof NodeSelection && selection.node.type.name === 'table')) {
      return
    }

    const tablePos = selection.from
    const after = tablePos + selection.node.nodeSize
    const tr = state.tr
    if (after <= state.doc.content.size) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(after), 1))
    } else if (tablePos > 0) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(tablePos - 1), -1))
    }
    this.editorView.dispatch(tr.scrollIntoView())
    this.editor.commands.setInteractionMode(
      this.editorView.state.selection.empty ? 'idle' : 'text-selection',
    )
  }

  private isEnabled() {
    return this.editor?.storage?.blockHandle?.enabled !== false
  }

  private getScrollContainer(): HTMLElement | null {
    const dom = this.editorView.dom as HTMLElement
    return (
      (dom.closest('[data-be-scroll-container="true"]') as HTMLElement | null) ||
      (dom.closest('.editor-scroll-area') as HTMLElement | null)
    )
  }

  private isCurrentBlockType(typeName: string) {
    if (this.currentBlockPos === null) return false
    const { doc } = this.editorView.state
    const resolved = doc.resolve(this.currentBlockPos)
    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
      if (resolved.node(depth).type.name === typeName) return true
    }
    return false
  }

  private isDragActivationReady() {
    const elapsed = Date.now() - this.pointerDownAt
    // Drag should feel immediate once the user moves on the handle.
    // A plain click still opens the menu because dragstart is not fired.
    if (elapsed >= this.longPressMs) return true
    return this.pointerMaxDistance >= this.dragDistancePx
  }

  private isBlockDragEvent(event: DragEvent) {
    const types = event.dataTransfer?.types
    if (!types) return false
    return Array.from(types).includes('application/x-be-block-drag')
  }

  private isCurrentHeading(level: number) {
    if (this.currentBlockPos === null) return false
    const { doc } = this.editorView.state
    const node = doc.nodeAt(this.currentBlockPos)
    if (node?.type.name === 'heading' && node.attrs?.level === level) return true
    const resolved = doc.resolve(this.currentBlockPos)
    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
      const depthNode = resolved.node(depth)
      if (depthNode.type.name === 'heading' && depthNode.attrs?.level === level) return true
    }
    return false
  }

  private isEmptyParagraphNode(node?: any) {
    return node?.type?.name === 'paragraph' && node.content?.size === 0
  }

  private getCurrentBlockNode() {
    if (this.currentBlockPos === null) return null
    return this.editorView.state.doc.nodeAt(this.currentBlockPos)
  }

  private replaceCurrentBlockWith(content: unknown) {
    if (this.currentBlockPos === null) return
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos)
    if (!node) return
    this.editor
      .chain()
      .focus()
      .insertContentAt(
        { from: this.currentBlockPos, to: this.currentBlockPos + node.nodeSize },
        content,
      )
      .run()
  }

  private getBasicFormatItems(includeParagraph = false): BlockHandleMenuItem[] {
    return createBlockHandleFeatureItems(
      {
        i18nInput: { blockHandle: this.i18n },
        runCommand: (name, attrs) => this.runCommand(name, attrs),
        replaceCurrentBlockWith: (content) => this.replaceCurrentBlockWith(content),
      },
      [
        ...(includeParagraph ? ['paragraph'] : []),
        'heading1',
        'heading2',
        'heading3',
        'orderedList',
        'bulletList',
        'taskList',
        'codeBlock',
        'blockquote',
        'horizontalRule',
      ],
    )
  }

  private getInsertCommonItems(): BlockHandleMenuItem[] {
    return [
      createImageInsertHandleItem({
        i18nInput: { blockHandle: this.i18n },
        runCommand: (name, attrs) => this.runCommand(name, attrs),
        replaceCurrentBlockWith: (content) => this.replaceCurrentBlockWith(content),
      }),
      ...createBlockHandleFeatureItems(
        {
          i18nInput: { blockHandle: this.i18n },
          runCommand: (name, attrs) => this.runCommand(name, attrs),
          replaceCurrentBlockWith: (content) => this.replaceCurrentBlockWith(content),
        },
        ['table', 'callout'],
      ),
      {
        id: 'buttonPlaceholder',
        label: this.i18n.insertButton,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6266ff" stroke-width="2"><rect x="4" y="6" width="16" height="10" rx="2"/><path d="m14 11 4 4M18 15l-2 3"/></svg>',
        action: () =>
          this.replaceCurrentBlockWith({
            type: 'paragraph',
            content: [{ type: 'text', text: '按钮' }],
          }),
      },
    ]
  }

  private insertParagraphBelow() {
    if (this.currentBlockPos === null) return
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos)
    if (!node) return
    this.editor
      .chain()
      .focus()
      .insertContentAt(this.currentBlockPos + node.nodeSize, { type: 'paragraph' })
      .run()
  }

  private getBlockActionGroups(): BlockHandleMenuItem[][] {
    return createBlockHandleActionGroups({
      i18nInput: { blockHandle: this.i18n },
      runCommand: (name, attrs) => this.runCommand(name, attrs),
      replaceCurrentBlockWith: (content) => this.replaceCurrentBlockWith(content),
      moveBlock: (direction) => this.moveBlock(direction),
      duplicateBlock: () => this.duplicateBlock(),
      deleteBlock: () => this.deleteBlock(),
      copyBlockLink: () => this.copyBlockLink(),
      openCommentPanel: () => this.editor?.events?.emit?.('openCommentPanel'),
      addToMultiSelect: () => {
        if (this.currentBlockPos !== null) {
          this.editor.commands.toggleBlockSelection(this.currentBlockPos)
        }
      },
      insertParagraphBelow: () => this.insertParagraphBelow(),
    })
  }

  private runTableCommand(name: string) {
    if (this.currentBlockPos === null) return
    const { state } = this.editorView
    const table = state.doc.nodeAt(this.currentBlockPos)
    if (!table || table.type.name !== 'table') return

    let cursorPos = this.currentBlockPos + 1
    let current = table
    while (current.childCount > 0) {
      current = current.firstChild!
      cursorPos += 1
    }

    const tr = state.tr.setSelection(
      TextSelection.near(state.doc.resolve(Math.min(cursorPos, state.doc.content.size))),
    )
    this.editorView.dispatch(tr)
    const chain = this.editor.chain().focus()
    const command = chain[name]
    if (typeof command === 'function') {
      command.call(chain).run()
    }
  }

  private distributeTableColumns() {
    if (this.currentBlockPos === null) return
    const { state } = this.editorView
    const table = state.doc.nodeAt(this.currentBlockPos)
    if (!table || table.type.name !== 'table') return

    const tr = state.tr
    table.descendants((node: any, pos: number) => {
      if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') return
      const absolutePos = this.currentBlockPos! + 1 + pos
      tr.setNodeMarkup(absolutePos, undefined, { ...node.attrs, colwidth: null }, node.marks)
    })
    this.editorView.dispatch(tr)
    this.selectCurrentTableNode()
  }

  private getTableActionGroups(): BlockHandleMenuItem[][] {
    return [
      [
        {
          id: 'duplicateBlock',
          label: this.i18n.duplicateBlock,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
          action: () => this.duplicateBlock(),
        },
        {
          id: 'deleteBlock',
          label: this.i18n.deleteBlock,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
          action: () => this.deleteBlock(),
          danger: true,
        },
        {
          id: 'copyBlockLink',
          label: this.i18n.copyBlockLink,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
          action: () => this.copyBlockLink(),
        },
      ],
      [
        {
          id: 'tableHeaderRow',
          label: this.i18n.tableHeaderRow,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18M15 3v18"/></svg>',
          action: () => this.runTableCommand('toggleHeaderRow'),
        },
        {
          id: 'tableHeaderColumn',
          label: this.i18n.tableHeaderColumn,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18M3 15h18"/></svg>',
          action: () => this.runTableCommand('toggleHeaderColumn'),
        },
        {
          id: 'tableDistributeColumns',
          label: this.i18n.tableDistributeColumns,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 19h16"/><path d="M8 5v14M16 5v14"/><path d="m11 12-3 3-3-3M13 12l3 3 3-3"/></svg>',
          action: () => this.distributeTableColumns(),
        },
      ],
      [
        {
          id: 'insertParagraphBelow',
          label: this.i18n.insertParagraphBelow,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
          action: () => this.insertParagraphBelow(),
        },
      ],
    ]
  }

  private appendMenuSection(title: string, items: BlockHandleMenuItem[], grid = false) {
    if (title) {
      const titleEl = document.createElement('div')
      titleEl.className = 'be-block-handle-insert-section-title'
      titleEl.textContent = title
      this.menu.appendChild(titleEl)
    }

    const wrap = document.createElement('div')
    wrap.className = grid ? 'be-block-handle-insert-grid' : 'be-block-handle-insert-list'
    this.menu.appendChild(wrap)

    items.forEach((item) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = grid ? 'be-block-handle-insert-grid-btn' : 'be-block-handle-insert-list-btn'
      if (item.danger) btn.classList.add('danger')
      btn.innerHTML = `<span class="be-block-handle-insert-icon">${item.icon}</span><span class="be-block-handle-insert-label">${item.label}</span>`
      const select = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        item.action()
        this.hideMenu()
      }
      btn.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      btn.addEventListener('click', select)
      wrap.appendChild(btn)
    })
  }

  private appendMenuDivider() {
    const divider = document.createElement('div')
    divider.className = 'be-block-handle-menu-divider'
    this.menu.appendChild(divider)
  }

  private renderInsertMenu() {
    this.menu.innerHTML = ''
    this.menu.classList.add('be-block-handle-menu--insert')
    this.menu.classList.remove('be-block-handle-menu--feishu')
    this.appendMenuSection('基础', this.getBasicFormatItems(false), true)
    this.appendMenuSection('常用', this.getInsertCommonItems())
  }

  private renderBlockMenu() {
    this.menu.innerHTML = ''
    this.menu.classList.remove('be-block-handle-menu--insert')
    this.menu.classList.add('be-block-handle-menu--feishu')
    this.appendMenuSection('', this.getBasicFormatItems(true), true)
    this.getBlockActionGroups().forEach((group, index) => {
      if (index > 0) this.appendMenuDivider()
      this.appendMenuSection('', group)
    })
  }

  private renderTableMenu() {
    this.menu.innerHTML = ''
    this.menu.classList.remove('be-block-handle-menu--insert')
    this.menu.classList.add('be-block-handle-menu--feishu')
    this.getTableActionGroups().forEach((group, index) => {
      if (index > 0) this.appendMenuDivider()
      this.appendMenuSection('', group)
    })
  }

  renderMenu() {
    if (this.isEmptyParagraphNode(this.getCurrentBlockNode())) {
      this.renderInsertMenu()
      return
    }

    if (this.getCurrentBlockNode()?.type.name === 'table') {
      this.renderTableMenu()
      return
    }

    this.renderBlockMenu()
  }

  runCommand(name: string, attrs?: any) {
    if (this.currentBlockPos === null) return

    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos)
    if (node) {
      const selection = TextSelection.near(
        this.editorView.state.doc.resolve(this.currentBlockPos + 1),
      )
      this.editorView.dispatch(this.editorView.state.tr.setSelection(selection))

      const chain = this.editor.chain().focus()
      if (attrs === undefined) {
        chain[name]().run()
      } else {
        chain[name](attrs).run()
      }
    }
  }

  /** 将选区提升为整表 NodeSelection；不调用 focusFirstCell，避免锁定某一单元格。 */
  private selectCurrentTableNode() {
    if (this.currentBlockPos === null) return
    const { state } = this.editorView
    const node = state.doc.nodeAt(this.currentBlockPos)
    if (!node || node.type.name !== 'table') return
    const selection = NodeSelection.create(state.doc, this.currentBlockPos)
    this.editorView.dispatch(
      state.tr.setSelection(selection).scrollIntoView().setMeta('preventScroll', true),
    )
    this.hideHandleImmediately()
    this.editor.commands.setInteractionMode('block-selection')
    const tableDom = this.getTableDomFromDocPos(this.currentBlockPos)
    tableDom?.classList.add('be-table-selected')
  }

  moveBlock(direction: 1 | -1) {
    if (this.currentBlockPos === null) return

    const { doc } = this.editorView.state
    const node = doc.nodeAt(this.currentBlockPos)
    if (!node) return

    const resolved = doc.resolve(this.currentBlockPos)
    let targetDepth = 1

    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      if (resolved.before(depth) === this.currentBlockPos) {
        targetDepth = depth
        break
      }
    }

    const parentDepth = targetDepth - 1
    const parent = parentDepth >= 0 ? resolved.node(parentDepth) : doc
    const index = resolved.index(parentDepth)

    if (direction === -1) {
      if (index <= 0) return

      const prevNode = parent.child(index - 1)
      const prevPos = this.currentBlockPos - prevNode.nodeSize
      const end = this.currentBlockPos + node.nodeSize

      const tr = this.editorView.state.tr
      tr.replaceWith(prevPos, end, [node, prevNode])
      this.editorView.dispatch(tr)
      this.currentBlockPos = prevPos
      return
    }

    if (index >= parent.childCount - 1) return

    const nextNode = parent.child(index + 1)
    const nextPos = this.currentBlockPos + node.nodeSize
    const end = nextPos + nextNode.nodeSize

    const tr = this.editorView.state.tr
    tr.replaceWith(this.currentBlockPos, end, [nextNode, node])
    this.editorView.dispatch(tr)
    this.currentBlockPos = this.currentBlockPos + nextNode.nodeSize
  }

  deleteBlock() {
    if (this.currentBlockPos === null) return
    const { state } = this.editorView
    const node = state.doc.nodeAt(this.currentBlockPos)
    if (!node) return

    const from = this.currentBlockPos
    const to = this.currentBlockPos + node.nodeSize
    const tr = state.tr.delete(from, to)

    const anchor = Math.max(1, Math.min(from, tr.doc.content.size))
    const selection = TextSelection.near(tr.doc.resolve(anchor), -1)
    tr.setSelection(selection)
    this.editorView.dispatch(tr)

    this.editorView.focus()
    this.editor.commands.focus()
  }

  duplicateBlock() {
    if (this.currentBlockPos === null) return
    const node = this.editorView.state.doc.nodeAt(this.currentBlockPos)
    if (node) {
      // Get JSON of the node
      const json = node.toJSON() as any
      if (json?.attrs?.blockId) {
        json.attrs = { ...json.attrs }
        delete json.attrs.blockId
      }
      // Insert after
      this.editor
        .chain()
        .insertContentAt(this.currentBlockPos + node.nodeSize, json)
        .run()
    }
  }

  private createBlockId() {
    return `be-block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  private ensureCurrentBlockId() {
    if (this.currentBlockPos === null) return null

    const { state } = this.editorView
    const node = state.doc.nodeAt(this.currentBlockPos)
    if (!node) return null

    const existingId = typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : ''
    if (existingId) return existingId

    const blockId = this.createBlockId()
    const tr = state.tr.setNodeMarkup(
      this.currentBlockPos,
      undefined,
      { ...node.attrs, blockId },
      node.marks,
    )
    this.editorView.dispatch(tr)
    return blockId
  }

  private fallbackCopy(text: string) {
    window.prompt(this.i18n.copyLinkPromptTitle, text)
  }

  copyBlockLink() {
    const blockId = this.ensureCurrentBlockId()
    if (!blockId) return

    const url = new URL(window.location.href)
    url.hash = blockId
    const text = url.toString()

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text))
      return
    }

    this.fallbackCopy(text)
  }

  update() {
    if (!this.isEnabled()) {
      this.hideMenu()
      this.element.style.display = 'none'
      return
    }

    const container = this.getEditorContainer()

    if (this.element.parentNode !== document.body) {
      document.body.appendChild(this.element)
    }
  }

  private isAxisZoneElement(zone: HTMLElement) {
    return (
      zone.classList.contains('be-table-axis-zone') &&
      (zone.parentElement === this.tableColumnTriggerLayer ||
        zone.parentElement === this.tableRowTriggerLayer)
    )
  }

  private activateTableAxisSelection(
    table: HTMLTableElement,
    axis: 'row' | 'column',
    index: number,
    event: MouseEvent,
    zone?: HTMLElement | null,
  ) {
    this.hideMenu()
    this.hideActiveTableInsertAffordance()
    this.stripTableBlockSelectionVisual()
    this.hideHandleImmediately()
    this.clearAxisHoverHighlight()
    this.selectTableAxis(table, axis, index, event.clientX, event.clientY)
    if (zone) {
      zone.classList.add('is-axis-active')
    }
  }

  private activateTableAxisFromZone(zone: HTMLElement, event: MouseEvent) {
    const table =
      this.activeTriggerTable ??
      this.hoveredTableDom ??
      this.getFocusedTableDom() ??
      this.getTableFromPoint(event.clientX, event.clientY, zone)
    if (!table) return

    const axis = zone.dataset.axis === 'row' ? 'row' : 'column'
    const index = Number(zone.dataset.index || 0)
    this.activateTableAxisSelection(table, axis, index, event, zone)
  }

  handleSuppressEditorPointer = (event: MouseEvent) => {
    if (Date.now() > this.suppressEditorPointerUntil) return
    const target = event.target as Node
    if (!this.editorView.dom.contains(target)) return
    if (this.isTableChromeTarget(target)) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  handleGlobalPointerDown = (e: MouseEvent) => {
    const target = e.target as Node
    const inHandleUi =
      this.menu.contains(target) ||
      this.element.contains(target) ||
      this.tableBlockHandleEl.contains(target)

    if (!inHandleUi) {
      this.hideMenu()
    }

    if (this.isTableBlockSelected() && !inHandleUi && !this.isTableChromeTarget(target)) {
      this.clearTableBlockSelection()
      this.hideTableBlockHandle()
      this.hoveredTableDom = null
      this.lastTablePointer = null
      this.hideTableChromeLayers()
    }
  }

  handleScroll = () => {
    if (this.menu.style.display !== 'none') {
      this.hideMenu()
    }
    this.ensureTableChromeForActiveTable()
    const table = this.hoveredTableDom
    if (table && this.tableBlockHandlePos !== null) {
      this.showTableNodeHandle(this.tableBlockHandlePos, table)
    }
  }

  scheduleHide() {
    this.hideTimer = setTimeout(() => {
      if (this.menu.style.display === 'none') {
        this.element.style.opacity = '0'
        this.element.style.pointerEvents = 'none'
      }
    }, 200)
  }

  cancelHide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.element.style.opacity = '1'
    this.element.style.pointerEvents = 'auto'
  }

  private isTableStructureNode(node: any) {
    const name = node?.type?.name
    if (name === 'table' || name === 'tableRow') return true
    const role = node?.type?.spec?.tableRole
    return role === 'table' || role === 'row' || role === 'cell' || role === 'header_cell'
  }

  private getVisualBlockFromResolvedPos(resolvedPos: any) {
    if (resolvedPos.depth < 1) {
      const node = this.editorView.state.doc.nodeAt(resolvedPos.pos)
      if (!node || this.isTableStructureNode(node)) return null
      return {
        pos: resolvedPos.pos,
        node,
      }
    }

    for (let depth = resolvedPos.depth; depth >= 1; depth -= 1) {
      const node = resolvedPos.node(depth)
      const role = node?.type?.spec?.tableRole

      if (role === 'cell' || role === 'header_cell') {
        for (let inner = resolvedPos.depth; inner > depth; inner -= 1) {
          const innerNode = resolvedPos.node(inner)
          if (innerNode?.type?.isBlock && !this.isTableStructureNode(innerNode)) {
            return {
              pos: resolvedPos.before(inner),
              node: innerNode,
            }
          }
        }

        const cellPos = resolvedPos.before(depth)
        if (node.childCount > 0) {
          return {
            pos: cellPos + 1,
            node: node.firstChild,
          }
        }
        return null
      }
    }

    for (let depth = resolvedPos.depth; depth >= 1; depth -= 1) {
      const node = resolvedPos.node(depth)
      const parent = depth > 0 ? resolvedPos.node(depth - 1) : null
      const parentRole = parent?.type?.spec?.tableRole

      if (parentRole === 'cell' || parentRole === 'header_cell') {
        if (node?.type?.isBlock && !this.isTableStructureNode(node)) {
          return {
            pos: resolvedPos.before(depth),
            node,
          }
        }
      }

      if (node?.type?.name === 'listItem' || node?.type?.name === 'taskItem') {
        return {
          pos: resolvedPos.before(depth),
          node,
        }
      }
    }

    const topNode = resolvedPos.node(1)
    if (!topNode || this.isTableStructureNode(topNode)) return null

    return {
      pos: resolvedPos.before(1),
      node: topNode,
    }
  }

  private getVisualBlockFromDomTarget(target: HTMLElement | null) {
    if (!target) return null

    const cell = target.closest('td, th') as HTMLElement | null
    if (cell) {
      const blockEl =
        (target.closest(
          'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol',
        ) as HTMLElement | null) ||
        (cell.querySelector('p, h1, h2, h3, h4, h5, h6') as HTMLElement | null)
      if (blockEl) {
        try {
          const pos = this.editorView.posAtDOM(blockEl, 0)
          const node = this.editorView.state.doc.nodeAt(pos)
          if (node) return { pos, node }
        } catch {
          // fall through to top-level lookup
        }
      }
    }

    const root = this.editorView.dom as HTMLElement
    let block: HTMLElement | null = target
    while (block && block.parentElement && block.parentElement !== root) {
      block = block.parentElement
    }
    if (!block || block.parentElement !== root) return null
    try {
      const pos = this.editorView.posAtDOM(block, 0)
      const node = this.editorView.state.doc.nodeAt(pos)
      if (!node) return null
      return { pos, node }
    } catch {
      return null
    }
  }

  private getNodeDom(pos: number): HTMLElement | null {
    let dom: Node | null = this.editorView.nodeDOM(pos)
    if (!dom) return null

    if (dom instanceof Text) {
      dom = dom.parentElement
    }

    if (!(dom instanceof HTMLElement)) return null

    const block = dom.closest(
      'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, li, td, th',
    ) as HTMLElement | null
    return block ?? dom
  }

  private shouldHideForImageInteraction(target: HTMLElement | null, clientX: number) {
    const figure = target?.closest('.be-image-figure') as HTMLElement | null
    if (!figure) return false
    if (figure.classList.contains('be-image-caption-editing')) return true

    const rect = figure.getBoundingClientRect()
    const nearLeftEdge = clientX <= rect.left + 24
    if (nearLeftEdge) return false

    if (target?.closest('.be-image-align-bar')) return true
    if (target?.closest('.be-resize-handle')) return true
    if (target?.closest('.be-image-caption')) return true
    if (target?.closest('[data-be-image-preview="true"]')) return true
    if (figure.classList.contains('be-image-controls-active')) return true
    return false
  }

  private setSourceDraggingClass(active: boolean) {
    if (this.draggingBlockGroup && this.draggingBlockGroup.length > 0) {
      for (const pos of this.draggingBlockGroup) {
        const dom = this.getNodeDom(pos)
        if (dom) dom.classList.toggle('be-block-drag-source', active)
      }
      return
    }
    if (this.draggingBlockPos !== null) {
      const sourceDom = this.getNodeDom(this.draggingBlockPos)
      if (sourceDom) sourceDom.classList.toggle('be-block-drag-source', active)
    }
  }

  private hideHandleImmediately() {
    this.cancelHide()
    this.element.style.display = 'none'
    this.element.style.opacity = '0'
    this.element.style.pointerEvents = 'none'
  }

  private hideTableBlockHandle() {
    this.tableBlockHandlePos = null
    this.tableBlockHandleEl.style.display = 'none'
    this.tableBlockHandleEl.style.opacity = '0'
    this.tableBlockHandleEl.style.pointerEvents = 'none'
  }

  private hideTableChromeLayers() {
    this.tableColumnTriggerLayer.style.display = 'none'
    this.tableRowTriggerLayer.style.display = 'none'
    this.tableColumnTriggerLayer.classList.remove('is-table-chrome-active')
    this.tableRowTriggerLayer.classList.remove('is-table-chrome-active')
    this.activeTriggerTable = null
    this.activeTriggerRectKey = ''
  }

  private hideTableInsertAffordance() {
    this.tableInsertIntent = null
    this.hideTableInsertControlsOnly()
    this.hideTableChromeLayers()
    this.clearTableInsertHighlight()
  }

  private getFocusedTableDom(): HTMLTableElement | null {
    const tableInfo = this.getTableInfoFromDocPos(this.editorView.state.selection.from)
    if (!tableInfo) return null
    return this.getTableDomFromDocPos(tableInfo.pos)
  }

  // ---------------------------------------------------------------------------
  // 表格交互分层（.be-block-handle 药丸；已废弃九宫格 .be-table-handle）
  //
  // 编辑器聚焦 + 鼠标悬停表格（或热区层）时同时显示：
  //   - 表级 handle：`tableBlockHandleEl`，锚在左上角外侧（列热区之上）；单元格 handle 在列 gutter
  //   - 单元格 handle：`element`，锚在当前行列 gutter；首列时与表级 handle 水平/垂直错开
  //   - 热区条 + 插入 dot：`showTableTriggerLayers` / `updateTableInsertAffordance`
  //
  // | 状态 | 表级 handle | 单元格 handle | 热区/插入点 |
  // |------|-------------|---------------|-------------|
  // | 悬停表（caret 可在表外） | 显示 | 悬停格显示 | 显示 |
  // | NodeSelection(table) | 显示 | 隐藏 | 显示 |
  // | CellSelection | 显示 | 隐藏 | 显示 |
  // ---------------------------------------------------------------------------

  /** 整表作为文档块被选中（与选中标题/段落同级，不是单元格编辑）。 */
  private isTableBlockSelected() {
    const selection = this.editorView.state.selection
    return selection instanceof NodeSelection && selection.node.type.name === 'table'
  }

  private isSelectionInTableContext() {
    if (this.isTableBlockSelected()) return true
    if (isCellSelection(this.editorView.state.selection)) return true
    return Boolean(this.editor?.isActive?.('table'))
  }

  private getActiveTableChromeDom(): HTMLTableElement | null {
    if (this.hoveredTableDom && this.isTableHoverChromeActive(this.hoveredTableDom)) {
      return this.hoveredTableDom
    }
    if (this.isTableBlockSelected()) {
      return this.getTableDomFromDocPos(this.editorView.state.selection.from)
    }
    if (isCellSelection(this.editorView.state.selection)) {
      let dom = this.editorView.domAtPos(this.editorView.state.selection.from).node as Node
      if (dom.nodeType === 3) dom = dom.parentNode as Node
      return (dom as HTMLElement | null)?.closest?.('table') as HTMLTableElement | null
    }
    return null
  }

  private isTableHoverChromeActive(table: HTMLTableElement) {
    if (this.hoveredTableDom !== table || !this.lastTablePointer) return false
    return this.isPointerOverTableBounds(table, this.lastTablePointer.x, this.lastTablePointer.y)
  }

  private shouldKeepTableHoverState() {
    return this.isTableBlockSelected() || isCellSelection(this.editorView.state.selection)
  }

  private canShowTableChrome(table: HTMLTableElement) {
    if (this.isTableHoverChromeActive(table)) return true
    if (!this.editorView.hasFocus()) return false
    if (this.isTableBlockSelected()) {
      const dom = this.getTableDomFromDocPos(this.editorView.state.selection.from)
      return dom === table
    }
    if (table.classList.contains('be-table-selected')) return true
    if (isCellSelection(this.editorView.state.selection)) {
      return this.getActiveTableChromeDom() === table
    }
    return false
  }

  private resolveHoveredTable(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ): HTMLTableElement | null {
    if (
      target?.closest(
        '.be-table-trigger-layer, .be-table-column-selection-bar, .be-table-row-selection-bar, .be-table-insert-control, .be-table-insert-indicator, .be-table-insert-tooltip, .be-table-axis-zone, .be-table-insert-dot',
      )
    ) {
      const candidate =
        this.activeTriggerTable ??
        this.hoveredTableDom ??
        this.getTableFromPoint(clientX, clientY, target)
      if (candidate && this.isPointerOverTableBounds(candidate, clientX, clientY)) {
        return candidate
      }
      return null
    }
    const fromTarget =
      (target?.closest('table') as HTMLTableElement | null) ||
      this.getTableFromPoint(clientX, clientY, target)
    if (fromTarget && this.isPointerOverTableBounds(fromTarget, clientX, clientY)) {
      return fromTarget
    }

    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const fromHit = hit?.closest('table') as HTMLTableElement | null
    if (fromHit && this.isPointerOverTableBounds(fromHit, clientX, clientY)) return fromHit

    return null
  }

  private ensureTableChromeForActiveTable() {
    const table = this.getActiveTableChromeDom()
    if (!table || !this.canShowTableChrome(table)) {
      this.hideTableChromeLayers()
      return
    }
    this.showTableTriggerLayers(table)
  }

  private syncTableHoverChrome(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
    event?: MouseEvent,
  ) {
    const table = this.resolveHoveredTable(clientX, clientY, target)

    if (table && this.isPointerOverTableBounds(table, clientX, clientY)) {
      this.hoveredTableDom = table
      this.lastTablePointer = { x: clientX, y: clientY }
    } else if (!this.shouldKeepTableHoverState()) {
      this.hoveredTableDom = null
      this.lastTablePointer = null
    }

    const activeTable = this.getActiveTableChromeDom()
    if (!activeTable || !this.canShowTableChrome(activeTable)) {
      this.hideTableBlockHandle()
      if (!activeTable) {
        this.hideTableChromeLayers()
        this.hideActiveTableInsertAffordance()
      }
      return
    }

    this.ensureTableChromeForActiveTable()

    if (event) {
      this.updateTableInsertAffordance(event, target)
    }

    const tablePos = this.getTableDocPosForDom(activeTable)
    if (tablePos !== null) {
      this.showTableNodeHandle(tablePos, activeTable)
    } else {
      this.hideTableBlockHandle()
    }

    const selection = this.editorView.state.selection
    if (this.isTableBlockSelected() || isCellSelection(selection)) {
      this.hideHandleImmediately()
      return
    }

    if (this.shouldSuppressCellHandleForTableInsert(activeTable, clientX, clientY, target)) {
      this.hideHandleImmediately()
      return
    }

    const cell = this.resolveTableCellForHandle(activeTable, clientX, clientY, target)
    if (cell) {
      this.showCellBlockHandleForHover(cell, clientX, clientY, target)
    } else {
      this.hideHandleImmediately()
    }
  }

  /** 插入列/行 UI 激活时不再显示单元格 handle，避免沿插入线移动时 handle 漂移。 */
  private shouldSuppressCellHandleForTableInsert(
    table: HTMLTableElement,
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ) {
    if (
      target?.closest(
        '.be-table-insert-dot, .be-table-insert-control, .be-table-insert-indicator, .be-table-insert-tooltip, .be-table-column-selection-bar, .be-table-row-selection-bar, .be-table-axis-zone',
      )
    ) {
      return true
    }

    const intent = this.tableInsertIntent
    if (intent?.table === table) {
      const tableRect = table.getBoundingClientRect()
      const lineBand = 14
      if (intent.kind === 'column') {
        if (
          Math.abs(clientX - intent.lineX) <= lineBand &&
          clientY >= tableRect.top - 6 &&
          clientY <= tableRect.bottom + 6
        ) {
          return true
        }
      } else if (
        Math.abs(clientY - intent.lineY) <= lineBand &&
        clientX >= tableRect.left - 6 &&
        clientX <= tableRect.right + 6
      ) {
        return true
      }
    }

    const probe = { clientX, clientY } as MouseEvent
    return Boolean(this.getTableInsertTrigger(probe, target, table))
  }

  /** 解析当前指针所在的 td/th（含左侧 gutter、表头行、单元格正文）。 */
  private resolveHoveredTableCell(
    table: HTMLTableElement,
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ): HTMLTableCellElement | null {
    if (
      target?.closest(
        '.be-table-insert-dot, .be-table-insert-control, .be-table-insert-indicator, .be-table-insert-tooltip',
      )
    ) {
      return null
    }

    const direct = target?.closest('td, th') as HTMLTableCellElement | null
    if (direct?.closest('table') === table) return direct

    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const fromHit = hit?.closest('td, th') as HTMLTableCellElement | null
    if (fromHit?.closest('table') === table) return fromHit

    const fromPoint = this.getTableCellAtPoint(clientX, clientY)
    if (fromPoint?.closest('table') === table) return fromPoint

    const tableRect = table.getBoundingClientRect()
    const pad = this.tableHandleHitPad
    if (
      clientX < tableRect.left - this.tableCornerGutter - pad ||
      clientX > tableRect.right + pad ||
      clientY < tableRect.top - pad ||
      clientY > tableRect.bottom + pad
    ) {
      return null
    }

    return this.pickTableCellInTableByPointer(table, clientX, clientY)
  }

  /** 按指针在整张表上命中单元格（行缝处取垂直距离最近的一格）。 */
  private pickTableCellInTableByPointer(
    table: HTMLTableElement,
    clientX: number,
    clientY: number,
  ): HTMLTableCellElement | null {
    const pad = this.tableHandleHitPad
    let best: { cell: HTMLTableCellElement; score: number } | null = null

    for (const row of Array.from(table.rows)) {
      const rowRect = row.getBoundingClientRect()
      if (clientY < rowRect.top - pad || clientY > rowRect.bottom + pad) continue

      for (const raw of Array.from(row.cells)) {
        const cell = raw as HTMLTableCellElement
        const rect = cell.getBoundingClientRect()
        const bounds = this.getTableCellGutterBounds(cell)
        const inGutter = clientX >= bounds.gutterStart - pad && clientX <= bounds.gutterEnd + pad
        const inCellBody =
          clientX >= rect.left - pad &&
          clientX <= rect.right + pad &&
          clientY >= rect.top - pad &&
          clientY <= rect.bottom + pad
        if (!inGutter && !inCellBody) continue

        const hDist = inGutter
          ? Math.abs(clientX - bounds.gutterEnd)
          : Math.abs(clientX - rect.left) * 0.35
        const vDist =
          clientY < rect.top
            ? rect.top - clientY
            : clientY > rect.bottom
              ? clientY - rect.bottom
              : 0
        const score = hDist * 3 + vDist
        if (!best || score < best.score) {
          best = { cell, score }
        }
      }
    }

    return best?.cell ?? null
  }

  private resolveTableCellForHandle(
    table: HTMLTableElement,
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ): HTMLTableCellElement | null {
    const hovered = this.resolveHoveredTableCell(table, clientX, clientY, target)
    if (!hovered) return null

    const selectionCell = this.getTableCellFromSelection()
    if (!selectionCell || selectionCell === hovered) return hovered

    const hoveredRect = hovered.getBoundingClientRect()
    const selectionRect = selectionCell.getBoundingClientRect()
    const vHovered =
      clientY < hoveredRect.top
        ? hoveredRect.top - clientY
        : clientY > hoveredRect.bottom
          ? clientY - hoveredRect.bottom
          : 0
    const vSelection =
      clientY < selectionRect.top
        ? selectionRect.top - clientY
        : clientY > selectionRect.bottom
          ? clientY - selectionRect.bottom
          : 0

    return vSelection <= vHovered + 4 ? selectionCell : hovered
  }

  private getVisualBlockForTableCell(cell: HTMLTableCellElement) {
    const blockEl = cell.querySelector(
      'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol',
    ) as HTMLElement | null
    if (blockEl) {
      try {
        const pos = this.editorView.posAtDOM(blockEl, 0)
        const node = this.editorView.state.doc.nodeAt(pos)
        if (node && !this.isTableStructureNode(node)) {
          return { pos, node }
        }
      } catch {
        // fall through
      }
    }

    try {
      const pos = this.editorView.posAtDOM(cell, 0)
      const resolved = this.editorView.state.doc.resolve(pos)
      const visual = this.getVisualBlockFromResolvedPos(resolved)
      if (visual?.node && !this.isTableStructureNode(visual.node)) {
        return visual
      }
    } catch {
      // ignore
    }

    return null
  }

  private showCellBlockHandleForHover(
    cell: HTMLTableCellElement,
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ) {
    const visual =
      this.resolveVisualBlockInHoveredCell(cell, clientX, clientY, target) ||
      this.getVisualBlockForTableCell(cell)
    if (!visual?.node || this.isTableStructureNode(visual.node)) {
      this.hideHandleImmediately()
      return
    }
    this.currentBlockPos = visual.pos
    this.showHandle(visual.pos, visual.node, cell)
    this.cancelHide()
  }

  private resolveVisualBlockInHoveredCell(
    cell: HTMLTableCellElement,
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ) {
    const fromCell = this.getVisualBlockForTableCell(cell)
    if (fromCell?.node) return fromCell

    const pos = this.editorView.posAtCoords({ left: clientX, top: clientY })
    if (pos) {
      const resolvedPos = this.editorView.state.doc.resolve(pos.pos)
      const visual = this.getVisualBlockFromResolvedPos(resolvedPos)
      if (visual?.node) {
        const visualCell = this.findTableCellElement(visual.pos, null, target)
        if (visualCell === cell) return visual
      }
    }

    if (this.isPointerInTableBlockHandleZone(clientX, clientY, cell)) {
      const fromDom = this.getVisualBlockFromDomTarget(cell)
      if (fromDom?.node) return fromDom
    }

    return this.getVisualBlockFromDomTarget(target && cell.contains(target) ? target : cell)
  }

  private updateTableInsertAffordance(event: MouseEvent, target: HTMLElement | null) {
    if (!this.editorView.hasFocus() && !this.hoveredTableDom) {
      this.hideTableChromeLayers()
      this.hideActiveTableInsertAffordance()
      return
    }

    this.ensureTableChromeForActiveTable()

    const table = this.getActiveTableChromeDom()
    if (!table || !this.canShowTableChrome(table)) {
      this.hideActiveTableInsertAffordance()
      return
    }

    if (target?.closest('.be-table-insert-control')) {
      return
    }

    const insertDot = target?.closest('.be-table-insert-dot') as HTMLElement | null
    if (insertDot) {
      this.clearAxisHoverHighlight()
      const intent = this.buildInsertIntentFromDot(insertDot, table)
      if (intent) {
        this.showTableInsertAffordance(intent)
      }
      return
    }

    const axisZone = target?.closest('.be-table-axis-zone') as HTMLElement | null
    if (axisZone) {
      this.hideActiveTableInsertAffordance()
      this.highlightTableAxisTarget(
        table,
        axisZone.dataset.axis === 'row' ? 'row' : 'column',
        Number(axisZone.dataset.index || 0),
      )
      return
    }

    const trigger = this.getTableInsertTrigger(event, target, table)
    if (trigger) {
      this.showTableInsertAffordance(trigger)
      return
    }

    if (this.menu.style.display !== 'none') {
      this.hideActiveTableInsertAffordance()
      this.clearAxisHoverHighlight()
      return
    }

    this.hideActiveTableInsertAffordance()
    this.clearAxisHoverHighlight()
  }

  private showTableInsertAffordance(
    trigger: TableInsertIntent & {
      lineX: number
      lineY: number
    },
  ) {
    const { kind, placement, table, cell, lineX, lineY, mapIndex } = trigger
    this.tableInsertIntent = { kind, placement, table, cell, lineX, lineY, mapIndex }
    this.hideHandleImmediately()
    this.highlightTableInsertTarget()
    this.setTableInsertChromePriority(true)

    const tableRect = table.getBoundingClientRect()
    this.showTableTriggerLayers(table)

    if (kind === 'column') {
      Object.assign(this.tableInsertButton.style, {
        display: 'inline-flex',
        left: `${lineX - 10}px`,
        top: `${tableRect.top - 26}px`,
      })
      Object.assign(this.tableInsertIndicator.style, {
        display: 'block',
        left: `${lineX - 1.5}px`,
        top: `${tableRect.top}px`,
        width: '3px',
        height: `${tableRect.height}px`,
      })
      Object.assign(this.tableInsertTooltip.style, {
        display: 'block',
        left: `${lineX - 36}px`,
        top: `${tableRect.top - 70}px`,
      })
      this.tableInsertTooltip.textContent = this.i18n.tableInsertColumn
      this.refreshTableBlockHandleForInsert(table)
      return
    }

    const buttonTop = lineY - 10
    Object.assign(this.tableInsertButton.style, {
      display: 'inline-flex',
      left: `${tableRect.left - 34}px`,
      top: `${buttonTop}px`,
    })
    Object.assign(this.tableInsertIndicator.style, {
      display: 'block',
      left: `${tableRect.left}px`,
      top: `${lineY - 1.5}px`,
      width: `${tableRect.width}px`,
      height: '3px',
    })
    Object.assign(this.tableInsertTooltip.style, {
      display: 'block',
      left: `${tableRect.left - 72}px`,
      top: `${buttonTop - 44}px`,
    })
    this.tableInsertTooltip.textContent = this.i18n.tableInsertRow
    this.refreshTableBlockHandleForInsert(table)
  }

  private refreshTableBlockHandleForInsert(table: HTMLTableElement) {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return
    this.showTableNodeHandle(tablePos, table)
  }

  private handleTableTriggerMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return

    const target = event.target as HTMLElement | null
    if (target?.closest('.be-table-insert-dot')) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const zone = target?.closest('.be-table-axis-zone') as HTMLElement | null
    if (zone && this.isAxisZoneElement(zone)) {
      event.preventDefault()
      event.stopPropagation()
      this.activateTableAxisFromZone(zone, event)
      return
    }

    if (this.tableInsertIntent) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  private handleTableTriggerMove = (event: MouseEvent) => {
    event.stopPropagation()
    this.updateTableInsertAffordance(event, event.target as HTMLElement | null)
  }

  private handleTableTriggerClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const axisZone = target?.closest('.be-table-axis-zone') as HTMLElement | null
    if (axisZone && this.isAxisZoneElement(axisZone)) {
      event.preventDefault()
      event.stopPropagation()
      this.activateTableAxisFromZone(axisZone, event)
      return
    }

    if (target?.closest('.be-table-insert-dot')) {
      return
    }
  }

  /** 选区离开表格时立即清掉悬停缓存（不依赖 mousemove）。 */
  private clearStaleTableHoverState() {
    if (this.isSelectionInTableContext()) return
    this.hoveredTableDom = null
    this.lastTablePointer = null
    this.hideTableBlockHandle()
    this.hideTableChromeLayers()
    this.hideActiveTableInsertAffordance()
    this.hideHandleImmediately()
  }

  private syncTableChromeFromEditor() {
    this.syncAxisSelectionChromeFromEditor()

    if (!this.editorView.hasFocus() && !this.hoveredTableDom) {
      this.hideTableChromeLayers()
      this.hideActiveTableInsertAffordance()
      this.clearAxisHoverHighlight()
      return
    }

    const selection = this.editorView.state.selection
    if (!isCellSelection(selection) && this.isCaretInTableCell()) {
      this.clearAxisHoverHighlight()
    }

    this.ensureTableChromeForActiveTable()
  }

  private refreshTableChromeAtPointer(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
    event?: MouseEvent,
  ) {
    this.syncTableHoverChrome(clientX, clientY, target, event)
  }

  private isCaretInTableCell() {
    if (!this.editor?.isActive?.('table')) return false
    if (isCellSelection(this.editorView.state.selection)) return false
    return this.getTableCellFromSelection() !== null
  }

  private getTableCellFromSelection(): HTMLTableCellElement | null {
    const resolved = this.editorView.state.doc.resolve(this.editorView.state.selection.from)
    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      const node = resolved.node(depth)
      const role = node?.type?.spec?.tableRole
      if (role !== 'cell' && role !== 'header_cell') continue

      const cellPos = resolved.before(depth)
      const cellDom = this.editorView.nodeDOM(cellPos)
      if (cellDom instanceof HTMLTableCellElement) return cellDom
      if (cellDom instanceof HTMLElement) {
        const nested = cellDom.closest('td, th') as HTMLTableCellElement | null
        if (nested) return nested
      }
      break
    }
    return null
  }

  private getSelectionVisualBlockInTable() {
    if (!this.getTableCellFromSelection()) return null
    const resolved = this.editorView.state.doc.resolve(this.editorView.state.selection.from)
    return this.getVisualBlockFromResolvedPos(resolved)
  }

  /** 文档 pos 是否落在某一表格单元格内部（用于拦截悬停误解析到 td 内段落）。 */
  private isDocPosInsideTableCell(pos: number) {
    const resolved = this.editorView.state.doc.resolve(pos)
    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      const role = resolved.node(depth)?.type?.spec?.tableRole
      if (role === 'cell' || role === 'header_cell') return true
    }
    return false
  }

  private getTableDocPosForDom(table: HTMLTableElement): number | null {
    let found: number | null = null
    this.editorView.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name !== 'table') return true
      if (this.getTableDomFromDocPos(pos) === table) {
        found = pos
        return false
      }
      return true
    })
    return found
  }

  private isTableBlockHandleVisibleFor(table?: HTMLTableElement | null) {
    if (this.tableBlockHandleEl.style.display === 'none' || this.tableBlockHandlePos === null) {
      return false
    }
    if (!table) return true
    return this.getTableDomFromDocPos(this.tableBlockHandlePos) === table
  }

  /**
   * 表级 handle：右下角贴近表格左上角（仅 4px 间距，不再外推到 14px gutter 外）。
   */
  private getTableBlockHandleAnchor(
    tablePos: number,
    tableEl: HTMLTableElement,
    handleWidth: number,
    handleHeight: number,
  ) {
    const cornerRect = tableEl.getBoundingClientRect()
    const snap = this.tableBlockHandleSnap

    const container = this.getEditorContainer()
    const containerRect = container?.getBoundingClientRect()
    const minLeft = Math.max(8, (containerRect?.left ?? cornerRect.left) - handleWidth - snap)

    const left = Math.max(minLeft, cornerRect.left - handleWidth - snap)
    const top = Math.max(8, cornerRect.top - handleHeight - snap)

    return { top, left, bottom: top + handleHeight, right: left + handleWidth }
  }

  private getTableCellContentLeft(cell: HTMLTableCellElement) {
    const block = cell.querySelector(
      'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol',
    ) as HTMLElement | null
    return block?.getBoundingClientRect().left ?? cell.getBoundingClientRect().left
  }

  /** 单元格 handle：对齐正文左缘/列 gutter，避免压在列缝或 td 边框上。 */
  private resolveTableCellHandleLeft(tableCell: HTMLTableCellElement, handleWidth: number) {
    const bounds = this.getTableCellGutterBounds(tableCell)
    const inset = this.tableCellHandleInset
    const lineGap = this.tableCellHandleLineGap
    const contentLeft = this.getTableCellContentLeft(tableCell)
    const anchorRight = Math.min(bounds.gutterEnd, contentLeft) - inset
    const gutterWidth = Math.max(0, anchorRight - bounds.gutterStart)

    let left =
      gutterWidth >= handleWidth + lineGap
        ? anchorRight - handleWidth
        : bounds.gutterStart + Math.max(0, (gutterWidth - handleWidth) / 2)

    const table = tableCell.closest('table')
    const tableLeft = table?.getBoundingClientRect().left ?? bounds.gutterStart
    const outerMin = tableLeft - this.tableCornerGutter - handleWidth - inset
    const maxLeft = anchorRight - handleWidth - lineGap
    return Math.round(Math.max(outerMin, Math.min(left, maxLeft)))
  }

  /** 左侧行 gutter 内按 X/Y 命中对应列的单元格。 */
  private pickTableCellInRowByPointer(
    row: HTMLTableRowElement,
    clientX: number,
    clientY: number,
  ): HTMLTableCellElement | null {
    const table = row.closest('table')
    if (!(table instanceof HTMLTableElement)) return null
    const picked = this.pickTableCellInTableByPointer(table, clientX, clientY)
    if (!picked || picked.parentElement !== row) return null
    return picked
  }

  private shouldDeferCellHandleToHover() {
    if (this.tableInsertIntent) return true
    if (!this.hoveredTableDom || !this.lastTablePointer) return false
    if (!this.isTableHoverChromeActive(this.hoveredTableDom)) return false
    const hoverCell = this.resolveHoveredTableCell(
      this.hoveredTableDom,
      this.lastTablePointer.x,
      this.lastTablePointer.y,
      null,
    )
    const selCell = this.getTableCellFromSelection()
    if (!hoverCell || !selCell) return false
    return hoverCell !== selCell
  }

  /**
   * 整表块 handle：锚在表格左上角外侧（列热区之上）。
   */
  private showTableNodeHandle(tablePos: number, tableEl: HTMLTableElement) {
    const node = this.editorView.state.doc.nodeAt(tablePos)
    if (!node || node.type.name !== 'table') return
    if (this.getTableDomFromDocPos(tablePos) !== tableEl) {
      this.hideTableBlockHandle()
      return
    }

    this.tableBlockHandlePos = tablePos
    this.update()
    if (this.tableBlockHandleEl.parentNode !== document.body) {
      document.body.appendChild(this.tableBlockHandleEl)
    }
    this.updateHandleTypeVisual(node, this.tableBlockHandleEl)
    this.tableBlockHandleEl.style.display = 'flex'
    this.tableBlockHandleEl.style.opacity = '1'
    this.tableBlockHandleEl.style.pointerEvents = 'auto'
    this.tableBlockHandleEl.style.transform = 'none'

    const measured = this.tableBlockHandleEl.getBoundingClientRect()
    const handleWidth = Math.ceil(measured.width) || this.tableBlockHandleEl.offsetWidth || 48
    const handleHeight = Math.ceil(measured.height) || this.tableBlockHandleEl.offsetHeight || 28
    const anchor = this.getTableBlockHandleAnchor(tablePos, tableEl, handleWidth, handleHeight)

    this.tableBlockHandleEl.style.top = `${anchor.top}px`
    this.tableBlockHandleEl.style.left = `${anchor.left}px`
    this.cancelHide()
  }

  private showTableBlockHandleFromSelection() {
    if (!this.isEnabled() || !this.isTableBlockSelected()) return
    const pos = this.editorView.state.selection.from
    const tableEl = this.getTableDomFromDocPos(pos)
    if (!tableEl) return
    this.showTableNodeHandle(pos, tableEl)
  }

  /** 单元格 handle：编辑时跟 caret 所在格；仅当悬停到其它格时由 syncTableHoverChrome 接管。 */
  private refreshCellBlockHandleFromSelection() {
    if (!this.isEnabled()) return
    if (this.tableInsertIntent) {
      this.hideHandleImmediately()
      return
    }
    if (this.shouldDeferCellHandleToHover()) return
    if (this.isTableBlockSelected()) return
    if (isCellSelection(this.editorView.state.selection)) {
      this.hideHandleImmediately()
      return
    }
    if (!this.isCaretInTableCell()) {
      this.hideHandleImmediately()
      return
    }

    const cell = this.getTableCellFromSelection()
    if (!cell) return

    const visual = this.getSelectionVisualBlockInTable()
    if (!visual?.node || this.isTableStructureNode(visual.node)) return

    this.currentBlockPos = visual.pos
    this.showHandle(visual.pos, visual.node, cell)
    this.cancelHide()
  }

  private getTableInfoFromDocPos(pos: number): { pos: number } | null {
    const resolved = this.editorView.state.doc.resolve(pos)
    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      if (resolved.node(depth).type.name === 'table') {
        return { pos: resolved.before(depth) }
      }
    }
    return null
  }

  private getTableDomFromDocPos(pos: number): HTMLTableElement | null {
    const nodeDom = this.editorView.nodeDOM(pos)
    if (nodeDom instanceof HTMLTableElement) return nodeDom
    if (nodeDom instanceof HTMLElement) {
      const table = nodeDom.querySelector('table') ?? nodeDom.closest('table')
      return table instanceof HTMLTableElement ? table : null
    }
    return null
  }

  private getTableDocPos(table: HTMLTableElement): number | null {
    if (
      this.currentBlockPos !== null &&
      this.editorView.state.doc.nodeAt(this.currentBlockPos)?.type.name === 'table' &&
      this.getTableDomFromDocPos(this.currentBlockPos) === table
    ) {
      return this.currentBlockPos
    }

    const selectionTableInfo = this.getTableInfoFromDocPos(this.editorView.state.selection.from)
    if (selectionTableInfo && this.getTableDomFromDocPos(selectionTableInfo.pos) === table) {
      return selectionTableInfo.pos
    }

    let found: number | null = null
    this.editorView.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name !== 'table') return true
      if (this.getTableDomFromDocPos(pos) === table) {
        found = pos
        return false
      }
      return true
    })
    return found
  }

  private hideActiveTableInsertAffordance() {
    this.tableInsertIntent = null
    this.tableInsertButton.style.display = 'none'
    this.tableInsertIndicator.style.display = 'none'
    this.tableInsertTooltip.style.display = 'none'
    this.clearTableInsertHighlight()
    this.setTableInsertChromePriority(false)
  }

  private setTableInsertChromePriority(active: boolean) {
    const toggle = (el: HTMLElement) => {
      el.classList.toggle('is-insert-chrome-priority', active)
    }
    toggle(this.tableColumnTriggerLayer)
    toggle(this.tableRowTriggerLayer)
  }

  private hideTableInsertControlsOnly() {
    this.tableInsertIntent = null
    this.tableInsertButton.style.display = 'none'
    this.tableInsertIndicator.style.display = 'none'
    this.tableInsertTooltip.style.display = 'none'
  }

  private clearTableInsertHighlight() {
    this.highlightedInsertCells.forEach((cell) => {
      cell.classList.remove('be-table-insert-active-cell')
    })
    this.highlightedInsertCells = []
    this.clearAxisHoverHighlight()
  }

  private clearAxisHoverHighlight() {
    this.highlightedAxisCells.forEach((cell) => {
      cell.classList.remove('be-table-axis-active-cell')
    })
    this.highlightedAxisCells = []
    this.tableColumnTriggerLayer
      .querySelectorAll('.be-table-axis-zone.is-axis-active')
      .forEach((zone) => zone.classList.remove('is-axis-active'))
    this.tableRowTriggerLayer
      .querySelectorAll('.be-table-axis-zone.is-axis-active')
      .forEach((zone) => zone.classList.remove('is-axis-active'))
    if (this.axisBarHoverPreview && !this.activeAxisSelection) {
      this.tableColumnAxisBar.style.display = 'none'
      this.tableRowAxisBar.style.display = 'none'
    }
    this.axisBarHoverPreview = false
  }

  private clearAxisSelectionChrome() {
    if (this.axisChromeCleanup) {
      this.axisChromeCleanup()
      this.axisChromeCleanup = null
    }
    this.tableColumnAxisBar.style.display = 'none'
    this.tableRowAxisBar.style.display = 'none'
    if (this.axisChromeTable) {
      this.axisChromeTable
        .querySelectorAll(`.${this.columnRegionClass}, .${this.rowRegionClass}`)
        .forEach((cell) => {
          cell.classList.remove(this.columnRegionClass, this.rowRegionClass)
        })
      delete this.axisChromeTable.dataset.beAxisSelection
    }
    this.axisChromeTable = null
    this.activeAxisSelection = null
    this.pendingAxisCellSelection = null
  }

  private syncAxisSelectionChromeFromEditor() {
    const selection = this.editorView.state.selection
    if (!isCellSelection(selection)) {
      this.clearAxisSelectionChrome()
      ;(this.editorView.dom as HTMLElement).classList.remove('ProseMirror-hideselection')
      return
    }

    if (this.activeAxisSelection) {
      const { table, axis, index } = this.activeAxisSelection
      if (document.contains(table)) {
        this.applyAxisSelectionChrome(table, axis, index)
        return
      }
      this.activeAxisSelection = null
    }

    let dom = this.editorView.domAtPos(selection.from).node as Node
    if (dom.nodeType === 3) dom = dom.parentNode as Node
    const tableEl = (dom as HTMLElement | null)?.closest?.('table') as HTMLTableElement | null
    if (!tableEl) {
      this.clearAxisSelectionChrome()
      return
    }

    const inferred = this.inferAxisSelectionFromCellSelection(selection, tableEl)
    if (inferred) {
      this.activeAxisSelection = {
        table: tableEl,
        axis: inferred.axis,
        index: inferred.index,
      }
      this.applyAxisSelectionChrome(tableEl, inferred.axis, inferred.index)
      return
    }

    const selected = tableEl.querySelectorAll('td.selectedCell, th.selectedCell')
    if (selected.length === 0) return

    const first = selected[0] as HTMLTableCellElement
    const colIndex = first.cellIndex
    const rowIndex = (first.parentElement as HTMLTableRowElement | null)?.rowIndex ?? -1

    const isFullColumn = Array.from(tableEl.rows).every((row) => {
      const cell = row.cells[colIndex]
      return cell && cell.classList.contains('selectedCell')
    })

    const isFullRow =
      rowIndex >= 0 &&
      Array.from(tableEl.rows[rowIndex]?.cells || []).every((cell) =>
        cell.classList.contains('selectedCell'),
      )

    if (isFullColumn) {
      this.applyAxisSelectionChrome(tableEl, 'column', colIndex)
      return
    }

    if (isFullRow) {
      this.applyAxisSelectionChrome(tableEl, 'row', rowIndex)
    }
  }

  private inferAxisSelectionFromCellSelection(
    selection: Selection,
    tableEl: HTMLTableElement,
  ): { axis: 'row' | 'column'; index: number } | null {
    if (!isCellSelection(selection)) return null
    const cellSelection = selection as CellSelection
    const $anchorCell = cellSelection.$anchorCell
    const $headCell = cellSelection.$headCell ?? $anchorCell
    if (!$anchorCell || !$headCell) return null

    const tablePos = this.getTableDocPos(tableEl)
    if (tablePos === null) return null

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return null

    const map = TableMap.get(tableNode)
    const tableStart = tablePos + 1
    const anchorRect = map.findCell($anchorCell.pos - tableStart)
    const headRect = map.findCell($headCell.pos - tableStart)
    const merged = {
      left: Math.min(anchorRect.left, headRect.left),
      right: Math.max(anchorRect.right, headRect.right),
      top: Math.min(anchorRect.top, headRect.top),
      bottom: Math.max(anchorRect.bottom, headRect.bottom),
    }

    const isFullColumn =
      merged.top === 0 && merged.bottom === map.height && merged.right - merged.left === 1
    if (isFullColumn) {
      return { axis: 'column', index: merged.left }
    }

    const isFullRow =
      merged.left === 0 && merged.right === map.width && merged.bottom - merged.top === 1
    if (isFullRow) {
      return { axis: 'row', index: merged.top }
    }

    return null
  }

  private collectDomCellsInMapColumn(table: HTMLTableElement, colIndex: number) {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return [] as HTMLTableCellElement[]

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return [] as HTMLTableCellElement[]

    const map = TableMap.get(tableNode)
    const tableStart = tablePos + 1
    const cells: HTMLTableCellElement[] = []
    const seen = new Set<HTMLTableCellElement>()

    for (let row = 0; row < map.height; row += 1) {
      const pos = tableStart + map.positionAt(row, colIndex, tableNode)
      const dom = this.editorView.nodeDOM(pos)
      let cell: HTMLTableCellElement | null = null
      if (dom instanceof HTMLTableCellElement) {
        cell = dom
      } else if (dom instanceof HTMLElement) {
        cell = dom.closest('td, th') as HTMLTableCellElement | null
      }
      if (cell && !seen.has(cell)) {
        seen.add(cell)
        cells.push(cell)
      }
    }

    return cells
  }

  private collectDomCellsInMapRow(table: HTMLTableElement, rowIndex: number) {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return [] as HTMLTableCellElement[]

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return [] as HTMLTableCellElement[]

    const map = TableMap.get(tableNode)
    const tableStart = tablePos + 1
    const cells: HTMLTableCellElement[] = []
    const seen = new Set<HTMLTableCellElement>()

    for (let col = 0; col < map.width; col += 1) {
      const pos = tableStart + map.positionAt(rowIndex, col, tableNode)
      const dom = this.editorView.nodeDOM(pos)
      let cell: HTMLTableCellElement | null = null
      if (dom instanceof HTMLTableCellElement) {
        cell = dom
      } else if (dom instanceof HTMLElement) {
        cell = dom.closest('td, th') as HTMLTableCellElement | null
      }
      if (cell && !seen.has(cell)) {
        seen.add(cell)
        cells.push(cell)
      }
    }

    return cells
  }

  private getAxisSelectionBounds(cells: HTMLTableCellElement[]) {
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity

    cells.forEach((cell) => {
      const rect = cell.getBoundingClientRect()
      left = Math.min(left, rect.left)
      top = Math.min(top, rect.top)
      right = Math.max(right, rect.right)
      bottom = Math.max(bottom, rect.bottom)
    })

    if (!Number.isFinite(left)) return null
    return { left, top, right, bottom, width: right - left, height: bottom - top }
  }

  private positionAxisSelectionBar(table: HTMLTableElement, axis: 'row' | 'column', index: number) {
    const tableRect = table.getBoundingClientRect()
    if (axis === 'column') {
      const bounds = this.getAxisSelectionBounds(this.collectDomCellsInMapColumn(table, index))
      if (!bounds) return
      Object.assign(this.tableColumnAxisBar.style, {
        display: 'block',
        left: `${bounds.left}px`,
        top: `${tableRect.top - 6}px`,
        width: `${bounds.width}px`,
        height: '6px',
      })
      this.tableRowAxisBar.style.display = 'none'
      return
    }

    const bounds = this.getAxisSelectionBounds(this.collectDomCellsInMapRow(table, index))
    if (!bounds) return
    Object.assign(this.tableRowAxisBar.style, {
      display: 'block',
      left: `${tableRect.left - 6}px`,
      top: `${bounds.top}px`,
      width: '6px',
      height: `${bounds.height}px`,
    })
    this.tableColumnAxisBar.style.display = 'none'
  }

  private applyAxisSelectionChrome(table: HTMLTableElement, axis: 'row' | 'column', index: number) {
    if (this.axisChromeTable !== table) {
      this.clearAxisSelectionChrome()
    } else if (this.axisChromeCleanup) {
      this.axisChromeCleanup()
      this.axisChromeCleanup = null
    }

    this.axisBarHoverPreview = false
    this.axisChromeTable = table
    table
      .querySelectorAll(`.${this.columnRegionClass}, .${this.rowRegionClass}`)
      .forEach((cell) => {
        cell.classList.remove(this.columnRegionClass, this.rowRegionClass)
      })
    table.dataset.beAxisSelection = `${axis}:${index}`

    if (axis === 'column') {
      this.collectDomCellsInMapColumn(table, index).forEach((cell) => {
        cell.classList.add(this.columnRegionClass)
      })
    } else {
      this.collectDomCellsInMapRow(table, index).forEach((cell) => {
        cell.classList.add(this.rowRegionClass)
      })
    }

    const positionBar = () => this.positionAxisSelectionBar(table, axis, index)
    positionBar()
    const barEl = axis === 'column' ? this.tableColumnAxisBar : this.tableRowAxisBar
    this.axisChromeCleanup = autoUpdate(table, barEl, positionBar)
  }

  private highlightTableInsertTarget() {
    this.clearTableInsertHighlight()
  }

  private highlightTableAxisTarget(table: HTMLTableElement, axis: 'row' | 'column', index: number) {
    this.clearAxisHoverHighlight()
    const layer = axis === 'column' ? this.tableColumnTriggerLayer : this.tableRowTriggerLayer
    const zone = layer.querySelector(
      `.be-table-axis-zone[data-axis="${axis}"][data-index="${index}"]`,
    )
    zone?.classList.add('is-axis-active')
  }

  private getMapIndexForDomCell(
    table: HTMLTableElement,
    cell: HTMLTableCellElement,
  ): number | null {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return cell.cellIndex

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return cell.cellIndex

    const map = TableMap.get(tableNode)
    const tableStart = tablePos + 1
    try {
      const cellPos = this.editorView.posAtDOM(cell, 0)
      const rect = map.findCell(cellPos - tableStart)
      return rect.left
    } catch {
      return cell.cellIndex
    }
  }

  private getMapRowIndexForDomRow(
    table: HTMLTableElement,
    row: HTMLTableRowElement,
  ): number | null {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return row.rowIndex

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return row.rowIndex

    const map = TableMap.get(tableNode)
    const tableStart = tablePos + 1
    const anchorCell = row.cells[0]
    if (!anchorCell) return row.rowIndex

    try {
      const cellPos = this.editorView.posAtDOM(anchorCell, 0)
      const rect = map.findCell(cellPos - tableStart)
      return rect.top
    } catch {
      return row.rowIndex
    }
  }

  /** 热区列/行选：CellSelection + 列蒙层；隐藏单元格行内 handle。 */
  private commitAxisCellSelection(
    table: HTMLTableElement,
    axis: 'row' | 'column',
    index: number,
    selection: CellSelection,
  ) {
    this.activeAxisSelection = { table, axis, index }
    this.pendingAxisCellSelection = selection
    this.applyAxisSelectionChrome(table, axis, index)
    this.hideHandleImmediately()
    this.hideMenu()
    this.editor.commands.setBlockMenuOpen?.(false)
    this.editor.commands.setInteractionMode?.('table-editing')
    ;(this.editorView.dom as HTMLElement).classList.add('ProseMirror-hideselection')
  }

  beginExternalTableDrag(tablePos: number) {
    this.draggingBlockPos = tablePos
    this.draggingBlockGroup = null
    this.currentBlockPos = tablePos
    ;(this.editorView.dom as HTMLElement).setAttribute('data-be-block-dragging', 'true')
    this.getEditorContainer()?.setAttribute('data-be-block-dragging', 'true')
    const nodeDom = this.getNodeDom(tablePos)
    nodeDom?.classList.add('be-block-drag-source')
  }

  endExternalTableDrag() {
    this.finishDrag()
    window.requestAnimationFrame(() => this.clearDragVisualState())
  }

  private resolveColumnIndexAtPointer(table: HTMLTableElement, clientX: number) {
    const row = table.rows[0]
    if (!row) return null

    let best: { index: number; distance: number } | null = null
    for (const cell of Array.from(row.cells) as HTMLTableCellElement[]) {
      const rect = cell.getBoundingClientRect()
      const index = this.getMapIndexForDomCell(table, cell) ?? cell.cellIndex
      const inBand = clientX >= rect.left - 10 && clientX <= rect.right + 10
      const distance = inBand
        ? Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right))
        : Math.abs(clientX - (rect.left + rect.width / 2))
      if (!best || distance < best.distance) {
        best = { index, distance }
      }
    }

    return best?.index ?? null
  }

  private resolveRowIndexAtPointer(table: HTMLTableElement, clientY: number) {
    let best: { index: number; distance: number } | null = null
    for (const row of Array.from(table.rows) as HTMLTableRowElement[]) {
      const rect = row.getBoundingClientRect()
      const index = this.getMapRowIndexForDomRow(table, row) ?? row.rowIndex
      const inBand = clientY >= rect.top - 10 && clientY <= rect.bottom + 10
      const distance = inBand
        ? Math.min(Math.abs(clientY - rect.top), Math.abs(clientY - rect.bottom))
        : Math.abs(clientY - (rect.top + rect.height / 2))
      if (!best || distance < best.distance) {
        best = { index, distance }
      }
    }

    return best?.index ?? null
  }

  private resolveCellAnchorPos(tableStart: number, _tableNode: any, cellOffset: number) {
    const doc = this.editorView.state.doc
    const candidates = [tableStart + cellOffset + 1, tableStart + cellOffset + 2, tableStart + cellOffset]
    for (const probe of candidates) {
      if (probe < 0 || probe > doc.content.size) continue
      const $cell = cellAround(doc.resolve(probe))
      if ($cell) return $cell.pos
    }
    throw new RangeError('No table cell at offset')
  }

  /**
   * 点击列/行热区条：选中整列/整行（CellSelection），不是单格 TextSelection。
   */
  private selectTableAxis(
    table: HTMLTableElement,
    axis: 'row' | 'column',
    index: number,
    clientX?: number,
    clientY?: number,
  ) {
    const tablePos = this.getTableDocPos(table)
    if (tablePos === null) return

    const tableNode = this.editorView.state.doc.nodeAt(tablePos)
    if (!tableNode) return

    const map = TableMap.get(tableNode)
    const doc = this.editorView.state.doc
    const tableStart = tablePos + 1

    if (axis === 'column' && clientX != null) {
      const resolved = this.resolveColumnIndexAtPointer(table, clientX)
      if (resolved != null) index = resolved
    } else if (axis === 'row' && clientY != null) {
      const resolved = this.resolveRowIndexAtPointer(table, clientY)
      if (resolved != null) index = resolved
    }

    if (axis === 'column') {
      if (index < 0 || index >= map.width) return
    } else if (index < 0 || index >= map.height) {
      return
    }

    const rect =
      axis === 'column'
        ? { left: index, top: 0, right: index + 1, bottom: map.height }
        : { left: 0, top: index, right: map.width, bottom: index + 1 }

    const cellOffsets = map.cellsInRect(rect)
    if (cellOffsets.length === 0) return

    let selection: CellSelection
    try {
      const anchorPos = this.resolveCellAnchorPos(tableStart, tableNode, cellOffsets[0])
      const headPos = this.resolveCellAnchorPos(
        tableStart,
        tableNode,
        cellOffsets[cellOffsets.length - 1],
      )
      const $anchor = doc.resolve(anchorPos)
      const $head = doc.resolve(headPos)
      selection =
        axis === 'column'
          ? CellSelection.colSelection($anchor, $head)
          : CellSelection.rowSelection($anchor, $head)
    } catch {
      return
    }

    this.suppressEditorPointerUntil = Date.now() + 80
    this.editorView.focus()
    this.editorView.dispatch(
      this.editorView.state.tr
        .setSelection(selection)
        .scrollIntoView()
        .setMeta('beAxisSelect', true),
    )

    const resolvedIndex =
      axis === 'column'
        ? (this.resolveColumnIndexAtPointer(table, clientX ?? 0) ?? index)
        : (this.resolveRowIndexAtPointer(table, clientY ?? 0) ?? index)

    const applied = this.editorView.state.selection
    if (isCellSelection(applied)) {
      this.commitAxisCellSelection(table, axis, resolvedIndex, applied as CellSelection)
    } else {
      this.commitAxisCellSelection(table, axis, resolvedIndex, selection)
    }
  }

  private showTableTriggerLayers(table: HTMLTableElement) {
    const rect = table.getBoundingClientRect()
    const firstRow = table.rows[0]
    const rectKey = [
      Math.round(rect.left),
      Math.round(rect.top),
      Math.round(rect.width),
      Math.round(rect.height),
      table.rows.length,
      firstRow?.cells.length || 0,
    ].join(':')
    const shouldRender = this.activeTriggerTable !== table || this.activeTriggerRectKey !== rectKey

    Object.assign(this.tableColumnTriggerLayer.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top - 14}px`,
      width: `${rect.width}px`,
      height: '14px',
      opacity: '1',
      visibility: 'visible',
    })
    Object.assign(this.tableRowTriggerLayer.style, {
      display: 'block',
      left: `${rect.left - 14}px`,
      top: `${rect.top}px`,
      width: '14px',
      height: `${rect.height}px`,
      opacity: '1',
      visibility: 'visible',
    })
    this.tableColumnTriggerLayer.classList.add('is-table-chrome-active')
    this.tableRowTriggerLayer.classList.add('is-table-chrome-active')
    if (shouldRender) {
      this.activeTriggerTable = table
      this.activeTriggerRectKey = rectKey
      this.renderTableColumnTriggerDots(table)
      this.renderTableRowTriggerDots(table)
    }
  }

  private appendColumnInsertDot(
    layer: HTMLElement,
    table: HTMLTableElement,
    tableRect: DOMRect,
    lineX: number,
    placement: 'before' | 'after',
    index: number,
    cell: HTMLElement,
  ) {
    const dot = document.createElement('span')
    dot.className = 'be-table-insert-dot be-table-insert-dot--column'
    dot.dataset.axis = 'column'
    dot.dataset.placement = placement
    dot.dataset.index = String(index)
    dot.dataset.lineX = String(Math.round(lineX))
    Object.assign(dot.style, {
      left: `${lineX - tableRect.left}px`,
    })
    dot.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
    layer.appendChild(dot)
  }

  private appendRowInsertDot(
    layer: HTMLElement,
    table: HTMLTableElement,
    tableRect: DOMRect,
    lineY: number,
    placement: 'before' | 'after',
    index: number,
    row: HTMLTableRowElement,
  ) {
    const dot = document.createElement('span')
    dot.className = 'be-table-insert-dot be-table-insert-dot--row'
    dot.dataset.axis = 'row'
    dot.dataset.placement = placement
    dot.dataset.index = String(index)
    dot.dataset.lineY = String(Math.round(lineY))
    Object.assign(dot.style, {
      top: `${lineY - tableRect.top}px`,
    })
    dot.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
    layer.appendChild(dot)
  }

  private buildInsertIntentFromDot(
    dot: HTMLElement,
    table: HTMLTableElement,
  ):
    | (TableInsertIntent & {
        lineX: number
        lineY: number
      })
    | null {
    const axis = dot.dataset.axis === 'row' ? 'row' : 'column'
    const placement = dot.dataset.placement === 'after' ? 'after' : 'before'
    const index = Number(dot.dataset.index || 0)
    const tableRect = table.getBoundingClientRect()

    const mapIndex = Number(dot.dataset.index || 0)

    if (axis === 'column') {
      const lineX = Number(dot.dataset.lineX || 0)
      const cell = this.collectDomCellsInMapColumn(table, mapIndex)[0] as HTMLElement | undefined
      if (!cell) return null
      return {
        kind: 'column',
        placement,
        table,
        cell,
        lineX,
        lineY: tableRect.top,
        mapIndex,
      }
    }

    const lineY = Number(dot.dataset.lineY || 0)
    const cell = this.collectDomCellsInMapRow(table, mapIndex)[0] as HTMLElement | undefined
    if (!cell) return null
    return {
      kind: 'row',
      placement,
      table,
      cell,
      lineX: tableRect.left,
      lineY,
      mapIndex,
    }
  }

  private renderTableColumnTriggerDots(table: HTMLTableElement) {
    this.tableColumnTriggerLayer.innerHTML = ''
    const tableRect = table.getBoundingClientRect()
    const firstRow = table.rows[0]
    if (!firstRow) return

    const cells = Array.from(firstRow.cells) as HTMLElement[]
    const seenBoundaryX = new Set<number>()

    cells.forEach((cell) => {
      const rect = cell.getBoundingClientRect()
      const mapIndex = this.getMapIndexForDomCell(table, cell as HTMLTableCellElement)
      const zone = document.createElement('span')
      zone.className = 'be-table-axis-zone be-table-axis-zone--column'
      zone.dataset.axis = 'column'
      zone.dataset.index = String(mapIndex ?? cell.cellIndex)
      Object.assign(zone.style, {
        left: `${rect.left - tableRect.left}px`,
        width: `${rect.width}px`,
      })
      this.tableColumnTriggerLayer.appendChild(zone)
    })

    const firstCell = cells[0] as HTMLTableCellElement | undefined
    if (firstCell) {
      const firstRect = firstCell.getBoundingClientRect()
      const leadingX = Math.round(firstRect.left)
      if (!seenBoundaryX.has(leadingX)) {
        seenBoundaryX.add(leadingX)
        this.appendColumnInsertDot(
          this.tableColumnTriggerLayer,
          table,
          tableRect,
          firstRect.left,
          'before',
          0,
          firstCell,
        )
      }
    }

    // 插入列圆点：贴在每条竖向网格线（cell 右缘），并在表格外缘补一个
    cells.forEach((cell) => {
      const rect = cell.getBoundingClientRect()
      const lineX = Math.round(rect.right)
      if (seenBoundaryX.has(lineX)) return
      seenBoundaryX.add(lineX)
      const mapIndex = this.getMapIndexForDomCell(table, cell as HTMLTableCellElement) ?? cell.cellIndex
      this.appendColumnInsertDot(
        this.tableColumnTriggerLayer,
        table,
        tableRect,
        rect.right,
        'after',
        mapIndex,
        cell as HTMLElement,
      )
    })
  }

  private renderTableRowTriggerDots(table: HTMLTableElement) {
    this.tableRowTriggerLayer.innerHTML = ''
    const tableRect = table.getBoundingClientRect()
    const rows = Array.from(table.rows) as HTMLTableRowElement[]
    const seenBoundaryY = new Set<number>()

    rows.forEach((row) => {
      const rect = row.getBoundingClientRect()
      const mapIndex = this.getMapRowIndexForDomRow(table, row)
      const zone = document.createElement('span')
      zone.className = 'be-table-axis-zone be-table-axis-zone--row'
      zone.dataset.axis = 'row'
      zone.dataset.index = String(mapIndex ?? row.rowIndex)
      Object.assign(zone.style, {
        top: `${rect.top - tableRect.top}px`,
        height: `${rect.height}px`,
      })
      this.tableRowTriggerLayer.appendChild(zone)
    })

    const firstRow = rows[0]
    if (firstRow) {
      const firstRect = firstRow.getBoundingClientRect()
      const leadingY = Math.round(firstRect.top)
      if (!seenBoundaryY.has(leadingY)) {
        seenBoundaryY.add(leadingY)
        this.appendRowInsertDot(
          this.tableRowTriggerLayer,
          table,
          tableRect,
          firstRect.top,
          'before',
          0,
          firstRow,
        )
      }
    }

    rows.forEach((row) => {
      const rect = row.getBoundingClientRect()
      const lineY = Math.round(rect.bottom)
      if (seenBoundaryY.has(lineY)) return
      seenBoundaryY.add(lineY)
      const mapIndex = this.getMapRowIndexForDomRow(table, row) ?? row.rowIndex
      this.appendRowInsertDot(
        this.tableRowTriggerLayer,
        table,
        tableRect,
        rect.bottom,
        'after',
        mapIndex,
        row as HTMLTableRowElement,
      )
    })
  }

  private isPointerOverTableAxisChrome(clientX: number, clientY: number) {
    if (this.tableColumnTriggerLayer.style.display !== 'none') {
      const rect = this.tableColumnTriggerLayer.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    if (this.tableRowTriggerLayer.style.display !== 'none') {
      const rect = this.tableRowTriggerLayer.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }

  private getTableInsertTrigger(
    event: MouseEvent,
    target: HTMLElement | null,
    focusedTable: HTMLTableElement,
  ):
    | (TableInsertIntent & {
        lineX: number
        lineY: number
      })
    | null {
    if (target?.closest('.be-table-axis-zone, .be-table-insert-dot')) return null
    if (this.isPointerOverTableAxisChrome(event.clientX, event.clientY)) return null

    const pointTable = this.getTableFromPoint(event.clientX, event.clientY, target)
    if (!pointTable || pointTable !== focusedTable) return null

    const table = focusedTable

    const tableRect = table.getBoundingClientRect()
    const topGutterTop = tableRect.top - 20
    const topGutterBottom = tableRect.top + 4
    const leftGutterLeft = tableRect.left - 20
    const leftGutterRight = tableRect.left + 4
    const inTopGutter =
      event.clientY >= topGutterTop &&
      event.clientY <= topGutterBottom &&
      event.clientX >= tableRect.left - 6 &&
      event.clientX <= tableRect.right + 6
    const inLeftGutter =
      event.clientX >= leftGutterLeft &&
      event.clientX <= leftGutterRight &&
      event.clientY >= tableRect.top - 6 &&
      event.clientY <= tableRect.bottom + 6

    if (!inTopGutter && !inLeftGutter) return null

    if (inTopGutter && (!inLeftGutter || event.clientY <= tableRect.top + 2)) {
      return this.getColumnInsertTrigger(table, event.clientX, event.clientY)
    }

    return this.getRowInsertTrigger(table, event.clientY, event.clientX)
  }

  /** 指针是否在表格本体或列/行热区 gutter 内（不含表格上方说明文字区域）。 */
  private isPointerOverTableBounds(table: HTMLTableElement, clientX: number, clientY: number) {
    const rect = table.getBoundingClientRect()
    const padX = this.tableCornerGutter + 24
    const padTop = this.tableCornerGutter + 2
    const padBottom = 24
    return (
      clientX >= rect.left - padX &&
      clientX <= rect.right + padX &&
      clientY >= rect.top - padTop &&
      clientY <= rect.bottom + padBottom
    )
  }

  private getTableLayoutRect(tablePos: number, tableEl: HTMLTableElement) {
    const nodeDom = this.editorView.nodeDOM(tablePos) as HTMLElement | null
    if (nodeDom instanceof HTMLElement) {
      const rect = nodeDom.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return rect
    }
    return tableEl.getBoundingClientRect()
  }

  private getTableFromPoint(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ): HTMLTableElement | null {
    const direct = target?.closest('table') as HTMLTableElement | null
    if (direct && this.isPointerOverTableBounds(direct, clientX, clientY)) return direct

    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const fromHit = hit?.closest('table') as HTMLTableElement | null
    if (fromHit && this.isPointerOverTableBounds(fromHit, clientX, clientY)) return fromHit

    const editorDom = this.editorView.dom as HTMLElement
    const tables = Array.from(editorDom.querySelectorAll('table')) as HTMLTableElement[]

    let best: { table: HTMLTableElement; distance: number } | null = null
    for (const table of tables) {
      if (!this.isPointerOverTableBounds(table, clientX, clientY)) continue

      const rect = table.getBoundingClientRect()
      const dy =
        clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0
      const dx =
        clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0
      const distance = Math.hypot(dx, dy)
      if (!best || distance < best.distance) {
        best = { table, distance }
      }
    }
    return best?.table ?? null
  }

  private getColumnInsertTrigger(
    table: HTMLTableElement,
    clientX: number,
    clientY: number,
  ):
    | (TableInsertIntent & {
        lineX: number
        lineY: number
      })
    | null {
    const tableRect = table.getBoundingClientRect()
    if (clientY < tableRect.top - 20 || clientY > tableRect.top + 4) return null

    const firstRow = table.rows[0]
    if (!firstRow) return null

    const cells = Array.from(firstRow.cells) as HTMLElement[]
    if (cells.length === 0) return null

    let best: {
      cell: HTMLElement
      placement: 'before' | 'after'
      lineX: number
      distance: number
    } | null = null

    for (const cell of cells) {
      const rect = cell.getBoundingClientRect()
      const innerPad = Math.max(10, rect.width * 0.28)
      if (clientX > rect.left + innerPad && clientX < rect.right - innerPad) {
        continue
      }

      const candidates = [
        { placement: 'before' as const, lineX: rect.left, distance: Math.abs(clientX - rect.left) },
        {
          placement: 'after' as const,
          lineX: rect.right,
          distance: Math.abs(clientX - rect.right),
        },
      ]
      for (const candidate of candidates) {
        if (!best || candidate.distance < best.distance) {
          best = { cell, ...candidate }
        }
      }
    }

    if (!best || best.distance > 8) return null

    const mapIndex = this.getMapIndexForDomCell(table, best.cell as HTMLTableCellElement) ?? 0
    return {
      kind: 'column',
      placement: best.placement,
      table,
      cell: best.cell,
      lineX: best.lineX,
      lineY: tableRect.top,
      mapIndex,
    }
  }

  private getRowInsertTrigger(
    table: HTMLTableElement,
    clientY: number,
    clientX: number,
  ):
    | (TableInsertIntent & {
        lineX: number
        lineY: number
      })
    | null {
    const tableRect = table.getBoundingClientRect()
    if (clientX < tableRect.left - 20 || clientX > tableRect.left + 4) return null

    const rows = Array.from(table.rows) as HTMLTableRowElement[]
    if (rows.length === 0) return null

    let best: {
      row: HTMLTableRowElement
      placement: 'before' | 'after'
      lineY: number
      distance: number
    } | null = null

    for (const row of rows) {
      const rect = row.getBoundingClientRect()
      const innerPad = Math.max(8, rect.height * 0.28)
      if (clientY > rect.top + innerPad && clientY < rect.bottom - innerPad) {
        continue
      }

      const candidates = [
        { placement: 'before' as const, lineY: rect.top, distance: Math.abs(clientY - rect.top) },
        {
          placement: 'after' as const,
          lineY: rect.bottom,
          distance: Math.abs(clientY - rect.bottom),
        },
      ]
      for (const candidate of candidates) {
        if (!best || candidate.distance < best.distance) {
          best = { row, ...candidate }
        }
      }
    }

    if (!best || best.distance > 8) return null

    const cell = best.row.cells[0] as HTMLElement | undefined
    if (!cell) return null

    const mapIndex = this.getMapRowIndexForDomRow(table, best.row) ?? best.row.rowIndex

    return {
      kind: 'row',
      placement: best.placement,
      table,
      cell,
      lineX: tableRect.left,
      lineY: best.lineY,
      mapIndex,
    }
  }

  private resolveInsertAnchorCell(intent: TableInsertIntent): HTMLElement {
    if (intent.kind === 'row') {
      return (this.collectDomCellsInMapRow(intent.table, intent.mapIndex)[0] as HTMLElement | undefined) ?? intent.cell
    }
    return (this.collectDomCellsInMapColumn(intent.table, intent.mapIndex)[0] as HTMLElement | undefined) ?? intent.cell
  }

  private handleTableInsertClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const intent = this.tableInsertIntent
    if (!intent) return

    const command =
      intent.kind === 'column'
        ? intent.placement === 'before'
          ? 'addColumnBefore'
          : 'addColumnAfter'
        : intent.placement === 'before'
          ? 'addRowBefore'
          : 'addRowAfter'

    // 整表块选中时插入行列：不把选区打进单元格，避免图2「强制锁定单格」
    if (this.isTableBlockSelected()) {
      const chain = this.editor.chain().focus()
      if (typeof chain[command] === 'function') {
        chain[command]().run()
      }
      this.hideTableInsertAffordance()
      return
    }

    const anchorCell = this.resolveInsertAnchorCell(intent)
    const rect = anchorCell.getBoundingClientRect()
    const pos = this.editorView.posAtCoords({
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
    })
    if (pos) {
      const selection = TextSelection.near(this.editorView.state.doc.resolve(pos.pos))
      this.editorView.dispatch(this.editorView.state.tr.setSelection(selection))
    }

    const chain = this.editor.chain().focus()
    if (typeof chain[command] === 'function') {
      chain[command]().run()
    }
    this.hideTableInsertAffordance()
  }

  private handlePointerTrackMove = (event: MouseEvent) => {
    if (!this.pointerTracking) return
    const dx = event.clientX - this.pointerDownX
    const dy = event.clientY - this.pointerDownY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > this.pointerMaxDistance) {
      this.pointerMaxDistance = distance
    }
  }

  private handlePointerTrackEnd = () => {
    this.pointerTracking = false
    this.pointerMaxDistance = 0
  }

  private clearDropTarget() {
    if (this.dropTargetPos !== null) {
      const oldDom = this.getNodeDom(this.dropTargetPos)
      if (oldDom) {
        oldDom.classList.remove('be-block-drop-target', 'is-before', 'is-after')
        oldDom.removeAttribute('data-drop-placement')
      }
    }
    ;(this.editorView.dom as HTMLElement)
      .querySelectorAll<HTMLElement>('.be-block-drop-target, [data-drop-placement]')
      .forEach((node) => {
        node.classList.remove('be-block-drop-target', 'is-before', 'is-after')
        node.removeAttribute('data-drop-placement')
      })
    this.dropTargetPos = null
    this.dropIndicator.style.display = 'none'
  }

  private clearDragVisualState() {
    ;(this.editorView.dom as HTMLElement).removeAttribute('data-be-block-dragging')
    this.getEditorContainer()?.removeAttribute('data-be-block-dragging')
    ;(this.editorView.dom as HTMLElement)
      .querySelectorAll<HTMLElement>(
        '.be-block-drag-source, .be-block-drop-target, .ProseMirror-dropcursor',
      )
      .forEach((node) => {
        node.classList.remove(
          'be-block-drag-source',
          'be-block-drop-target',
          'is-before',
          'is-after',
        )
        node.removeAttribute('data-drop-placement')
        if (node.classList.contains('ProseMirror-dropcursor')) node.remove()
      })
    this.getEditorContainer()
      ?.querySelectorAll<HTMLElement>(
        '.be-block-drag-source, .be-block-drop-target, .ProseMirror-dropcursor',
      )
      .forEach((node) => {
        node.classList.remove(
          'be-block-drag-source',
          'be-block-drop-target',
          'is-before',
          'is-after',
        )
        node.removeAttribute('data-drop-placement')
        if (node.classList.contains('ProseMirror-dropcursor')) node.remove()
      })
    this.dropTargetPos = null
    this.dropIndicator.style.display = 'none'
  }

  private setDropTarget(pos: number, placement: 'before' | 'after') {
    const dom = this.getNodeDom(pos)
    if (!dom) return
    const rect = dom.getBoundingClientRect()
    const editorRect = (this.editorView.dom as HTMLElement).getBoundingClientRect()
    const lineTop = placement === 'before' ? rect.top - 2 : rect.bottom - 1

    Object.assign(this.dropIndicator.style, {
      display: 'block',
      left: `${Math.max(editorRect.left, rect.left)}px`,
      top: `${lineTop}px`,
      width: `${Math.max(24, Math.min(editorRect.right, rect.right) - Math.max(editorRect.left, rect.left))}px`,
    })

    if (this.dropTargetPos === pos && this.dropPlacement === placement) return

    this.clearDropTarget()
    this.dropTargetPos = pos
    this.dropPlacement = placement

    dom.classList.add('be-block-drop-target')
    dom.classList.add(placement === 'before' ? 'is-before' : 'is-after')
    dom.setAttribute('data-drop-placement', placement)
    this.dropIndicator.style.display = 'block'
  }

  private reorderBlockByDrop(sourcePos: number, targetPos: number, placement: 'before' | 'after') {
    const { state } = this.editorView
    const sourceNode = state.doc.nodeAt(sourcePos)
    const targetNode = state.doc.nodeAt(targetPos)
    if (!sourceNode || !targetNode) return
    if (sourcePos === targetPos) return

    const sourceSize = sourceNode.nodeSize
    const targetSize = targetNode.nodeSize
    let insertPos = targetPos + (placement === 'after' ? targetSize : 0)
    if (sourcePos < targetPos) {
      insertPos -= sourceSize
    }

    try {
      const tr = state.tr.delete(sourcePos, sourcePos + sourceSize)
      const boundedInsertPos = Math.max(0, Math.min(insertPos, tr.doc.content.size))
      tr.insert(boundedInsertPos, sourceNode)
      if (sourceNode.type.name === 'table') {
        tr.setSelection(NodeSelection.create(tr.doc, boundedInsertPos))
        tr.setMeta('blockHandleDragTableSelection', true)
      } else {
        const cursorPos = Math.max(1, Math.min(boundedInsertPos + 1, tr.doc.content.size))
        tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos), 1))
      }
      this.editorView.dispatch(tr)
      this.currentBlockPos = boundedInsertPos
      if (sourceNode.type.name === 'table') {
        this.editor.commands.setInteractionMode('block-selection')
      }
      this.editorView.focus()
    } catch (error) {
      // Ignore invalid cross-parent insertion attempts.
      console.warn('[BlockHandle] drag reorder failed', error)
    }
  }

  handleMouseMove = throttle((event: MouseEvent) => {
    if (document.documentElement.getAttribute('data-be-marquee-selecting') === '1') {
      this.hideHandleImmediately()
      return
    }

    if (!this.isEnabled()) {
      this.hideMenu()
      this.element.style.display = 'none'
      return
    }

    // throttled at 16ms (~60fps)
    this.update()

    if (this.menu.style.display !== 'none') return

    const parent = this.editorView.dom.parentNode as HTMLElement
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const { clientX, clientY } = event
    const target = event.target as HTMLElement | null

    // Check if mouse is near the editor (including gutter)
    const buffer = 50
    if (
      clientX < parentRect.left - buffer ||
      clientX > parentRect.right + buffer ||
      clientY < parentRect.top - buffer ||
      clientY > parentRect.bottom + buffer
    ) {
      this.scheduleHide()
      this.hoveredTableDom = null
      this.lastTablePointer = null
      this.hideTableBlockHandle()
      this.hideTableChromeLayers()
      this.hideTableInsertAffordance()
      return
    }

    const hoveredTable = this.resolveHoveredTable(clientX, clientY, target)
    const selectionTableChrome =
      this.editorView.hasFocus() &&
      (this.isTableBlockSelected() || isCellSelection(this.editorView.state.selection))
    if (hoveredTable || selectionTableChrome) {
      this.refreshTableChromeAtPointer(clientX, clientY, target, event)
    } else {
      this.hoveredTableDom = null
      this.lastTablePointer = null
      this.hideTableBlockHandle()
      this.hideTableChromeLayers()
      this.hideActiveTableInsertAffordance()
    }

    if (
      this.element.contains(event.target as Node) ||
      this.tableBlockHandleEl.contains(event.target as Node)
    ) {
      this.cancelHide()
      return
    }

    if (this.isTableBlockSelected()) {
      return
    }

    if (this.hoveredTableDom && this.isTableHoverChromeActive(this.hoveredTableDom)) {
      return
    }

    if (this.shouldHideForImageInteraction(target, clientX)) {
      this.hideHandleImmediately()
      return
    }

    const visual = this.resolveVisualBlockAtPointer(clientX, clientY, target)
    if (!visual?.node) return

    if (this.isDocPosInsideTableCell(visual.pos)) {
      this.hideHandleImmediately()
      return
    }

    this.currentBlockPos = visual.pos
    this.showHandle(visual.pos, visual.node, target)
    this.cancelHide()
  }, 16)

  private getTableCellGutterBounds(cell: HTMLTableCellElement) {
    const cellRect = cell.getBoundingClientRect()
    const row = cell.parentElement as HTMLTableRowElement | null
    const rowRect = row?.getBoundingClientRect() ?? cellRect
    const table = cell.closest('table')
    const colIndex = cell.cellIndex
    let gutterStart = table?.getBoundingClientRect().left ?? cellRect.left
    if (colIndex > 0 && row?.cells[colIndex - 1]) {
      gutterStart = row.cells[colIndex - 1]!.getBoundingClientRect().right
    } else if (table) {
      gutterStart = table.getBoundingClientRect().left
    }

    return {
      gutterStart,
      gutterEnd: cellRect.left,
      top: rowRect.top,
      bottom: rowRect.bottom,
    }
  }

  private getTableCellAtPoint(clientX: number, clientY: number): HTMLTableCellElement | null {
    const table = this.getTableFromPoint(clientX, clientY, null)
    if (!table) return null

    let best: { cell: HTMLTableCellElement; distance: number } | null = null
    const pad = this.tableHandleHitPad

    for (const row of Array.from(table.rows)) {
      const rowRect = row.getBoundingClientRect()
      if (clientY < rowRect.top - pad || clientY > rowRect.bottom + pad) continue

      for (const rawCell of Array.from(row.cells)) {
        const cell = rawCell as HTMLTableCellElement
        const rect = cell.getBoundingClientRect()
        const bounds = this.getTableCellGutterBounds(cell)
        const inRow = clientY >= bounds.top - pad && clientY <= bounds.bottom + pad
        const inColumnBand = clientX >= bounds.gutterStart - pad && clientX <= rect.right + pad
        const inCellBody =
          clientX >= rect.left - pad &&
          clientX <= rect.right + pad &&
          clientY >= rect.top - pad &&
          clientY <= rect.bottom + pad
        if (!inRow || (!inColumnBand && !inCellBody)) continue

        const distance = Math.abs(clientX - rect.left)
        if (!best || distance < best.distance) {
          best = { cell, distance }
        }
      }
    }

    return best?.cell ?? null
  }

  private isPointerInTableBlockHandleZone(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ) {
    const cell =
      target?.closest('td, th') ||
      this.getTableCellAtPoint(clientX, clientY) ||
      this.lastTableHandleCell
    if (!(cell instanceof HTMLTableCellElement)) return false

    const bounds = this.getTableCellGutterBounds(cell)
    const pad = this.tableHandleHitPad
    const measured = this.element.getBoundingClientRect()
    const handleWidth = Math.ceil(measured.width) || 48
    const zoneStart = Math.min(bounds.gutterStart, bounds.gutterEnd - handleWidth - 6) - pad
    const zoneEnd = bounds.gutterEnd + pad

    return (
      clientX >= zoneStart &&
      clientX <= zoneEnd &&
      clientY >= bounds.top - pad &&
      clientY <= bounds.bottom + pad
    )
  }

  private resolveVisualBlockAtPointer(
    clientX: number,
    clientY: number,
    target: HTMLElement | null,
  ) {
    const pointerCell =
      (target?.closest('td, th') as HTMLTableCellElement | null) ||
      this.getTableCellAtPoint(clientX, clientY)
    const selectionCell = this.getTableCellFromSelection()

    if (selectionCell && (!pointerCell || pointerCell === selectionCell)) {
      const selVisual = this.getSelectionVisualBlockInTable()
      if (selVisual?.node) return selVisual
    }

    const pos = this.editorView.posAtCoords({ left: clientX, top: clientY })
    if (pos) {
      const resolvedPos = this.editorView.state.doc.resolve(pos.pos)
      const visual =
        this.getVisualBlockFromResolvedPos(resolvedPos) || this.getVisualBlockFromDomTarget(target)
      if (visual?.node) {
        const visualCell = this.findTableCellElement(visual.pos, null, target)
        if (
          selectionCell &&
          visualCell === selectionCell &&
          visual.node.type.name === 'paragraph' &&
          visual.node.content.size === 0
        ) {
          const selVisual = this.getSelectionVisualBlockInTable()
          if (selVisual?.node) return selVisual
        }
        return visual
      }
    }

    if (this.isPointerInTableBlockHandleZone(clientX, clientY, target)) {
      const selVisual = this.getSelectionVisualBlockInTable()
      if (selVisual?.node) return selVisual
    }

    const hitEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    return this.getVisualBlockFromDomTarget(hitEl || target)
  }

  private findTableCellElement(
    pos: number,
    nodeDom: HTMLElement | null,
    target: HTMLElement | null,
  ): HTMLTableCellElement | null {
    if (target) {
      const fromTarget = target.closest('td, th') as HTMLTableCellElement | null
      if (fromTarget) return fromTarget
    }

    const resolved = this.editorView.state.doc.resolve(pos)
    for (let depth = resolved.depth; depth >= 1; depth -= 1) {
      const node = resolved.node(depth)
      const role = node?.type?.spec?.tableRole
      if (role !== 'cell' && role !== 'header_cell') continue

      const cellPos = resolved.before(depth)
      const cellDom = this.editorView.nodeDOM(cellPos)
      if (cellDom instanceof HTMLTableCellElement) return cellDom
      if (cellDom instanceof HTMLElement) {
        const nested = cellDom.closest('td, th') as HTMLTableCellElement | null
        if (nested) return nested
      }
      break
    }

    if (nodeDom) {
      const fromNode = nodeDom.closest('td, th') as HTMLTableCellElement | null
      if (fromNode) return fromNode
    }

    return null
  }

  private resolveCellBlockAlignElement(
    cell: HTMLTableCellElement,
    pos: number,
    nodeDom: HTMLElement | null,
  ): HTMLElement | null {
    if (nodeDom instanceof HTMLElement && cell.contains(nodeDom)) {
      const inline = nodeDom.closest(
        'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol',
      ) as HTMLElement | null
      if (inline instanceof HTMLElement && cell.contains(inline)) return inline
      return nodeDom
    }
    return cell.querySelector(
      'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol',
    ) as HTMLElement | null
  }

  private getCellBlockVerticalCenter(
    cell: HTMLTableCellElement,
    pos: number,
    handleHeight: number,
    cellRect: DOMRect,
    nodeDom: HTMLElement | null,
  ): number {
    const selectionCell = this.getTableCellFromSelection()
    if (selectionCell === cell && !this.editorView.state.selection.empty) {
      try {
        const coords = this.editorView.coordsAtPos(this.editorView.state.selection.head)
        const lineHeight = Math.max(18, coords.bottom - coords.top)
        const top = Math.round(coords.top + Math.max(0, (lineHeight - handleHeight) / 2))
        if (top >= cellRect.top - 8 && top + handleHeight <= cellRect.bottom + 8) {
          return top
        }
      } catch {
        // fall through
      }
    }

    const alignEl = this.resolveCellBlockAlignElement(cell, pos, nodeDom)
    if (alignEl) {
      const blockRect = alignEl.getBoundingClientRect()
      if (blockRect.height >= 2) {
        return Math.round(blockRect.top + Math.max(0, (blockRect.height - handleHeight) / 2))
      }
    }

    const alignPos = Math.min(pos + 1, this.editorView.state.doc.content.size - 1)
    try {
      const coords = this.editorView.coordsAtPos(alignPos)
      const lineHeight = Math.max(18, coords.bottom - coords.top)
      const top = Math.round(coords.top + Math.max(0, (lineHeight - handleHeight) / 2))
      if (top >= cellRect.top - 8 && top + handleHeight <= cellRect.bottom + 8) {
        return top
      }
    } catch {
      // fall through
    }

    return Math.round(cellRect.top + Math.max(2, (cellRect.height - handleHeight) / 2))
  }

  private resolveHandlePosition(
    pos: number,
    node: any,
    nodeDom: HTMLElement | null,
    target: HTMLElement | null,
    handleWidth: number,
    handleHeight: number,
  ): { top: number; left: number; inTableCell: boolean } {
    const container = this.getEditorContainer()
    const editorRect = (this.editorView.dom as HTMLElement).getBoundingClientRect()
    const containerRect = container?.getBoundingClientRect() ?? editorRect
    const spacing = 8
    const tableCell = this.findTableCellElement(pos, nodeDom, target)

    let left = editorRect.left - handleWidth - spacing
    const minLeft = Math.max(8, containerRect.left - handleWidth - spacing)

    if (tableCell) {
      const cellRect = tableCell.getBoundingClientRect()
      const isEmptyBlock = this.isEmptyParagraphNode(node)
      let top = isEmptyBlock
        ? cellRect.top + Math.max(2, (cellRect.height - handleHeight) / 2)
        : this.getCellBlockVerticalCenter(tableCell, pos, handleHeight, cellRect, nodeDom)

      top = Math.round(Math.max(cellRect.top + 2, Math.min(top, cellRect.bottom - handleHeight - 2)))

      left = this.resolveTableCellHandleLeft(tableCell, handleWidth)

      const table = tableCell.closest('table')
      const row = tableCell.parentElement as HTMLTableRowElement | null
      const isFirstRow = row?.rowIndex === 0
      if (
        isFirstRow &&
        table &&
        this.isTableBlockHandleVisibleFor(table) &&
        this.tableBlockHandlePos !== null
      ) {
        const blockAnchor = this.getTableBlockHandleAnchor(
          this.tableBlockHandlePos,
          table,
          handleWidth,
          handleHeight,
        )
        const handleBottom = top + handleHeight
        if (top < blockAnchor.bottom + 2 && handleBottom > blockAnchor.top) {
          top = Math.max(top, blockAnchor.bottom + this.tableCellHandleStackGap)
          top = Math.min(top, cellRect.bottom - handleHeight - 2)
        }
        if (left + handleWidth > blockAnchor.left - 2 && left < blockAnchor.right + 2) {
          const contentLeft = this.getTableCellContentLeft(tableCell)
          const maxRight = contentLeft - this.tableCellHandleInset - this.tableCellHandleLineGap
          left = Math.round(Math.min(left, maxRight - handleWidth))
        }
      }

      return { top, left, inTableCell: true }
    }

    let top = 0
    if (nodeDom && typeof nodeDom.getBoundingClientRect === 'function') {
      top = nodeDom.getBoundingClientRect().top + 1
    } else {
      const isEmpty = node.content.size === 0
      const alignPos = isEmpty ? pos : pos + 1
      const coords = this.editorView.coordsAtPos(alignPos)
      top = coords.top + 1
    }

    if (left < minLeft) left = minLeft
    return { top, left, inTableCell: false }
  }

  showHandle(pos: number, node: any, target: HTMLElement | null = null) {
    const container = this.getEditorContainer()
    if (!container) return

    if (this.isTableStructureNode(node)) {
      this.hideHandleImmediately()
      return
    }

    this.update()
    const nodeDom = this.getNodeDom(pos)
    this.updateHandleTypeVisual(node)
    this.element.style.display = 'flex'
    this.element.style.transform = 'none'

    const measured = this.element.getBoundingClientRect()
    const handleWidth = Math.ceil(measured.width) || this.element.offsetWidth || 48
    const handleHeight = Math.ceil(measured.height) || this.element.offsetHeight || 28
    const { top, left, inTableCell } = this.resolveHandlePosition(
      pos,
      node,
      nodeDom,
      target,
      handleWidth,
      handleHeight,
    )

    this.element.dataset.beHandleInTableCell = inTableCell ? 'true' : 'false'
    this.element.style.top = `${top}px`
    this.element.style.left = `${left}px`
    this.lastTableHandleCell = inTableCell ? this.findTableCellElement(pos, nodeDom, target) : null
  }

  private getCurrentBlockTypeKey(node: any) {
    const name = node?.type?.name
    if (name === 'paragraph') return 'paragraph'
    if (name === 'heading') return `h${node?.attrs?.level ?? 1}`
    if (name === 'blockquote') return 'blockquote'
    if (name === 'codeBlock') return 'code'
    if (name === 'taskList' || name === 'taskItem') return 'task'
    if (name === 'bulletList') return 'bullet'
    if (name === 'orderedList') return 'ordered'
    if (name === 'listItem' && this.currentBlockPos !== null) {
      const resolved = this.editorView.state.doc.resolve(this.currentBlockPos)
      for (let depth = resolved.depth; depth >= 0; depth -= 1) {
        const ancestorName = resolved.node(depth).type.name
        if (ancestorName === 'bulletList') return 'bullet'
        if (ancestorName === 'orderedList') return 'ordered'
        if (ancestorName === 'taskList') return 'task'
      }
    }
    if (name === 'table') return 'table'
    if (name === 'image') return 'image'
    return 'paragraph'
  }

  private updateHandleTypeVisual(node: any, root: HTMLElement = this.element) {
    const holder = root.querySelector('.be-block-handle-type') as HTMLElement | null
    if (!holder) return

    const type = this.getCurrentBlockTypeKey(node)
    const isEmptyParagraph = this.isEmptyParagraphNode(node)
    root.classList.toggle('be-block-handle--empty', isEmptyParagraph)
    if (isEmptyParagraph) {
      holder.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
      return
    }

    const paragraphGlyph = '<span class="be-block-handle-type-text">T</span>'
    const map: Record<string, string> = {
      paragraph: paragraphGlyph,
      h1: '<span class="be-block-handle-type-text">H1</span>',
      h2: '<span class="be-block-handle-type-text">H2</span>',
      h3: '<span class="be-block-handle-type-text">H3</span>',
      blockquote:
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5"/><path d="M15 21c3 0 7-1 7-8V5"/></svg>',
      code: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      bullet:
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>',
      ordered:
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/></svg>',
      task: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8"/></svg>',
      table:
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
      image:
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    }

    holder.innerHTML = map[type] ?? map.paragraph
  }

  toggleMenu() {
    if (!this.isEnabled()) return

    if (this.menu.style.display === 'none') {
      this.ensureMenuHost()
      this.renderMenu()
      if (this.menuHideTimer) {
        window.clearTimeout(this.menuHideTimer)
        this.menuHideTimer = null
      }
      this.menu.style.display = 'block'
      this.menu.style.opacity = '0'
      this.menu.style.transform = 'translateY(-6px) scale(0.98)'
      requestAnimationFrame(() => {
        this.menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
        this.menu.style.opacity = '1'
        this.menu.style.transform = 'translateY(0) scale(1)'
      })
      this.startMenuAutoUpdate()
      this.editor.commands.setBlockMenuOpen(true)
      const mode =
        this.element.dataset.beHandleInTableCell === 'true' ? 'table-editing' : 'block-selection'
      this.editor.commands.setInteractionMode(mode)
    } else {
      this.hideMenu()
    }
  }

  hideMenu() {
    if (this.menu.style.display === 'none') return
    this.menuAnchorEl = this.element

    if (this.menuHideTimer) {
      window.clearTimeout(this.menuHideTimer)
      this.menuHideTimer = null
    }
    this.menu.style.transition = 'opacity 0.12s ease, transform 0.12s ease'
    this.menu.style.opacity = '0'
    this.menu.style.transform = 'translateY(-4px) scale(0.98)'
    this.menuHideTimer = window.setTimeout(() => {
      this.menu.style.display = 'none'
      this.menu.style.transition = ''
      this.menu.style.opacity = ''
      this.menu.style.transform = ''
      this.menuHideTimer = null
    }, 120)
    if (this.cleanupMenuAutoUpdate) {
      this.cleanupMenuAutoUpdate()
      this.cleanupMenuAutoUpdate = null
    }
    this.editor.commands.setBlockMenuOpen(false)

    if (this.editor.isActive('table')) {
      this.editor.commands.setInteractionMode('table-editing')
      return
    }

    const mode = this.editor.state.selection.empty ? 'idle' : 'text-selection'
    this.editor.commands.setInteractionMode(mode)
  }

  private startMenuAutoUpdate() {
    if (this.cleanupMenuAutoUpdate) {
      this.cleanupMenuAutoUpdate()
      this.cleanupMenuAutoUpdate = null
    }
    const anchor = this.menuAnchorEl
    this.cleanupMenuAutoUpdate = autoUpdate(anchor, this.menu, () => {
      computePosition(anchor, this.menu, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 16 })],
      }).then(({ x, y }) => {
        Object.assign(this.menu.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: 'fixed',
          zIndex: '240080',
          pointerEvents: 'auto',
        })
      })
    })
  }

  private finishDrag() {
    this.element.classList.remove('is-dragging')
    this.tableBlockHandleEl.classList.remove('is-dragging')
    this.setSourceDraggingClass(false)
    this.clearDragVisualState()
    this.draggingBlockPos = null
    this.draggingBlockGroup = null
    this.handlePointerTrackEnd()
  }

  handleDragStart = (event: DragEvent) => {
    if (!this.isEnabled()) return

    const fromTableHandle = event.currentTarget === this.tableBlockHandleEl
    const dragPos =
      fromTableHandle && this.tableBlockHandlePos !== null
        ? this.tableBlockHandlePos
        : this.currentBlockPos
    if (dragPos === null) return

    this.currentBlockPos = dragPos
    const dragNode = this.editorView.state.doc.nodeAt(dragPos)
    if (fromTableHandle && dragNode?.type.name !== 'table') {
      event.preventDefault()
      this.finishDrag()
      return
    }

    if (event.isTrusted && !this.isDragActivationReady()) {
      event.preventDefault()
      this.finishDrag()
      return
    }
    this.ignoreMenuClickUntil = Date.now() + 260
    this.hideMenu()
    this.draggingBlockPos = dragPos
    this.draggingBlockGroup = null

    const selectedPositions = this.editor?.storage?.blockMultiSelect?.selectedPositions as
      | Set<number>
      | undefined
    if (selectedPositions && selectedPositions.size > 1 && selectedPositions.has(dragPos)) {
      this.draggingBlockGroup = Array.from(selectedPositions).sort((a, b) => a - b)
    }
    ;(event.currentTarget as HTMLElement).classList.add('is-dragging')
    ;(this.editorView.dom as HTMLElement).setAttribute('data-be-block-dragging', 'true')
    this.getEditorContainer()?.setAttribute('data-be-block-dragging', 'true')
    this.setSourceDraggingClass(true)

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', 'be-block-drag')
      const groupPayload =
        this.draggingBlockGroup && this.draggingBlockGroup.length > 0
          ? this.draggingBlockGroup.join(',')
          : String(this.currentBlockPos)
      event.dataTransfer.setData('application/x-be-block-drag', groupPayload)
      const ghost = document.createElement('div')
      ghost.style.width = '1px'
      ghost.style.height = '1px'
      ghost.style.opacity = '0'
      ghost.style.pointerEvents = 'none'
      document.body.appendChild(ghost)
      event.dataTransfer.setDragImage(ghost, 0, 0)
      window.setTimeout(() => ghost.remove(), 0)
    }
  }

  handleDragOver = (event: DragEvent) => {
    if (!this.isBlockDragEvent(event) && this.draggingBlockPos === null) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    if (this.draggingBlockPos === null) return

    const pos = this.editorView.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })
    if (!pos) return
    const resolvedPos = this.editorView.state.doc.resolve(pos.pos)
    const visual =
      this.getVisualBlockFromResolvedPos(resolvedPos) ||
      this.getVisualBlockFromDomTarget(event.target as HTMLElement | null)
    if (!visual?.node) return
    if (
      visual.pos === this.draggingBlockPos ||
      (this.draggingBlockGroup && this.draggingBlockGroup.includes(visual.pos))
    ) {
      this.clearDropTarget()
      return
    }

    const nodeDom = this.getNodeDom(visual.pos)
    const rect = nodeDom?.getBoundingClientRect()
    const placement = rect && event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    this.setDropTarget(visual.pos, placement)
  }

  handleDrop = (event: DragEvent) => {
    if (!this.isBlockDragEvent(event) && this.draggingBlockPos === null) return
    event.preventDefault()
    event.stopPropagation()
    if (this.draggingBlockPos === null) {
      this.finishDrag()
      return
    }
    const sourcePos = this.draggingBlockPos
    const sourceGroup = this.draggingBlockGroup
    const targetPos = this.dropTargetPos
    const placement = this.dropPlacement
    this.finishDrag()

    if (targetPos === null || sourcePos === targetPos) return
    if (sourceGroup && sourceGroup.length > 1) {
      this.editor.commands.moveSelectedBlocksToTarget(targetPos, placement)
      return
    }
    this.reorderBlockByDrop(sourcePos, targetPos, placement)
  }

  handleDragEnd = () => {
    this.finishDrag()
    window.requestAnimationFrame(() => this.clearDragVisualState())
  }

  destroy() {
    this.element.remove()
    this.tableBlockHandleEl.remove()
    this.menu.remove()
    this.dropIndicator.remove()
    this.tableInsertButton.remove()
    this.tableInsertIndicator.remove()
    this.tableInsertTooltip.remove()
    this.tableColumnTriggerLayer.remove()
    this.tableRowTriggerLayer.remove()
    this.clearAxisSelectionChrome()
    this.tableColumnAxisBar.remove()
    this.tableRowAxisBar.remove()
    this.tableInsertButton.removeEventListener('click', this.handleTableInsertClick)
    this.tableColumnTriggerLayer.removeEventListener('mousemove', this.handleTableTriggerMove)
    this.tableColumnTriggerLayer.removeEventListener(
      'mousedown',
      this.handleTableTriggerMouseDown,
      true,
    )
    this.tableColumnTriggerLayer.removeEventListener('click', this.handleTableTriggerClick, true)
    this.tableRowTriggerLayer.removeEventListener('mousemove', this.handleTableTriggerMove)
    this.tableRowTriggerLayer.removeEventListener(
      'mousedown',
      this.handleTableTriggerMouseDown,
      true,
    )
    this.tableRowTriggerLayer.removeEventListener('click', this.handleTableTriggerClick, true)
    this.element.removeEventListener('dragstart', this.handleDragStart)
    this.element.removeEventListener('dragend', this.handleDragEnd)
    this.tableBlockHandleEl.removeEventListener('dragstart', this.handleDragStart)
    this.tableBlockHandleEl.removeEventListener('dragend', this.handleDragEnd)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('dragend', this.handleDragEnd, true)
    document.removeEventListener('dragover', this.handleDragOver, true)
    document.removeEventListener('drop', this.handleDrop, true)
    document.removeEventListener('mousedown', this.handleGlobalPointerDown, true)
    document.removeEventListener('mousedown', this.handleSuppressEditorPointer, true)
    document.removeEventListener('click', this.handleSuppressEditorPointer, true)
    document.removeEventListener('mouseup', this.handleSuppressEditorPointer, true)
    document.removeEventListener('mousemove', this.handlePointerTrackMove, true)
    document.removeEventListener('mouseup', this.handlePointerTrackEnd, true)
    window.removeEventListener('blur', this.handlePointerTrackEnd)
    if (this.scrollTarget === document) {
      document.removeEventListener('scroll', this.handleScroll, true)
    } else {
      ;(this.scrollTarget as HTMLElement).removeEventListener('scroll', this.handleScroll)
    }
    if (this.hideTimer) clearTimeout(this.hideTimer)
    if (this.menuHideTimer) window.clearTimeout(this.menuHideTimer)
    if (this.cleanupMenuAutoUpdate) {
      this.cleanupMenuAutoUpdate()
      this.cleanupMenuAutoUpdate = null
    }
  }
}
