import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey, TextSelection } from 'prosemirror-state'
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
    return [
      new Plugin({
        key: new PluginKey('blockHandle'),
        view: (editorView) =>
          new BlockHandleView(editorView, this.options.width, this.editor, this.options.i18n),
      }),
    ]
  },
})

class BlockHandleView {
  private editorView: EditorView
  private element: HTMLElement
  private menu: HTMLElement
  private dropIndicator: HTMLElement
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
    this.element.style.zIndex = '50'
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
      this.selectCurrentTableNode()
      this.toggleMenu()
    })
    this.element.addEventListener('dragstart', this.handleDragStart)
    this.element.addEventListener('dragend', this.handleDragEnd)

    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('dragend', this.handleDragEnd, true)
    document.addEventListener('dragover', this.handleDragOver, true)
    document.addEventListener('drop', this.handleDrop, true)
    document.addEventListener('mousedown', this.handleGlobalPointerDown, true)
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
    const host = resolveUILayerHost('dropdown', this.editorView.dom as HTMLElement)
    if (this.menu.parentElement !== host) {
      host.appendChild(this.menu)
    }
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

  renderMenu() {
    if (this.isEmptyParagraphNode(this.getCurrentBlockNode())) {
      this.renderInsertMenu()
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

  private selectCurrentTableNode() {
    if (this.currentBlockPos === null) return
    const { state } = this.editorView
    const node = state.doc.nodeAt(this.currentBlockPos)
    if (!node || node.type.name !== 'table') return
    const selection = NodeSelection.create(state.doc, this.currentBlockPos)
    this.editorView.dispatch(state.tr.setSelection(selection))
    this.editor.commands.setInteractionMode('block-selection')
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

    if (container && this.element.parentNode !== container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative'
      }
      container.appendChild(this.element)
    }
  }

  handleGlobalPointerDown = (e: MouseEvent) => {
    if (!this.menu.contains(e.target as Node) && !this.element.contains(e.target as Node)) {
      this.hideMenu()
    }
  }

  handleScroll = () => {
    if (this.menu.style.display !== 'none') {
      this.hideMenu()
    }
    // Optional: re-check handle position or hide it
    // this.scheduleHide()
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

  private getVisualBlockFromResolvedPos(resolvedPos: any) {
    if (resolvedPos.depth < 1) {
      const node = this.editorView.state.doc.nodeAt(resolvedPos.pos)
      if (!node) return null
      return {
        pos: resolvedPos.pos,
        node,
      }
    }

    for (let depth = resolvedPos.depth; depth >= 2; depth -= 1) {
      const node = resolvedPos.node(depth)
      if (node?.type?.name === 'listItem' || node?.type?.name === 'taskItem') {
        return {
          pos: resolvedPos.before(depth),
          node,
        }
      }
    }

    return {
      pos: resolvedPos.before(1),
      node: resolvedPos.node(1),
    }
  }

  private getVisualBlockFromDomTarget(target: HTMLElement | null) {
    if (!target) return null
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
    const dom = this.editorView.nodeDOM(pos)
    return dom instanceof HTMLElement ? dom : null
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

    // Check if mouse is near the editor (including gutter)
    const buffer = 50
    if (
      clientX < parentRect.left - buffer ||
      clientX > parentRect.right + buffer ||
      clientY < parentRect.top - buffer ||
      clientY > parentRect.bottom + buffer
    ) {
      this.scheduleHide()
      return
    }

    // Don't update if hovering the handle itself
    if (this.element.contains(event.target as Node)) {
      this.cancelHide()
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest('.be-table-handle')) {
      this.hideHandleImmediately()
      return
    }
    if (this.shouldHideForImageInteraction(target, clientX)) {
      this.hideHandleImmediately()
      return
    }

    const pos = this.editorView.posAtCoords({ left: clientX, top: clientY })
    if (!pos) return

    const resolvedPos = this.editorView.state.doc.resolve(pos.pos)
    const visual =
      this.getVisualBlockFromResolvedPos(resolvedPos) || this.getVisualBlockFromDomTarget(target)
    if (!visual?.node) return

    this.currentBlockPos = visual.pos
    this.showHandle(visual.pos, visual.node)
    this.cancelHide()
  }, 16)

  showHandle(pos: number, node: any) {
    const container = this.getEditorContainer()
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const editorRect = (this.editorView.dom as HTMLElement).getBoundingClientRect()
    const nodeDom = this.editorView.nodeDOM(pos) as HTMLElement | null

    let top = 0
    const handleWidth = this.element.offsetWidth || 48
    const spacing = 8

    if (nodeDom) {
      const blockRect = nodeDom.getBoundingClientRect()
      top = blockRect.top + 1
    } else {
      const isEmpty = node.content.size === 0
      const alignPos = isEmpty ? pos : pos + 1
      const coords = this.editorView.coordsAtPos(alignPos)
      top = coords.top + 1
    }

    let left = editorRect.left - handleWidth - spacing
    const minLeft = Math.max(8, containerRect.left - handleWidth - spacing)
    if (left < minLeft) left = minLeft

    this.element.style.top = `${top}px`
    this.element.style.left = `${left}px`
    this.updateHandleTypeVisual(node)
    this.element.style.display = 'flex'
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

  private updateHandleTypeVisual(node: any) {
    const holder = this.element.querySelector('.be-block-handle-type') as HTMLElement | null
    if (!holder) return

    const type = this.getCurrentBlockTypeKey(node)
    const isEmptyParagraph = this.isEmptyParagraphNode(node)
    this.element.classList.toggle('be-block-handle--empty', isEmptyParagraph)
    if (isEmptyParagraph) {
      holder.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
      return
    }

    const listGlyph =
      '<svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="3" cy="4" r="1.1" fill="currentColor"/><circle cx="3" cy="8.5" r="1.1" fill="currentColor"/><circle cx="3" cy="13" r="1.1" fill="currentColor"/><path d="M7 4H16M7 8.5H16M7 13H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    const map: Record<string, string> = {
      paragraph: listGlyph,
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
      this.editor.commands.setInteractionMode('block-selection')
    } else {
      this.hideMenu()
    }
  }

  hideMenu() {
    if (this.menu.style.display === 'none') return

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
    this.cleanupMenuAutoUpdate = autoUpdate(this.element, this.menu, () => {
      computePosition(this.element, this.menu, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(this.menu.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: 'fixed',
          zIndex: '240040',
          pointerEvents: 'auto',
        })
      })
    })
  }

  private finishDrag() {
    this.element.classList.remove('is-dragging')
    this.setSourceDraggingClass(false)
    this.clearDragVisualState()
    this.draggingBlockPos = null
    this.draggingBlockGroup = null
    this.handlePointerTrackEnd()
  }

  handleDragStart = (event: DragEvent) => {
    if (!this.isEnabled()) return
    if (this.currentBlockPos === null) return
    if (event.isTrusted && !this.isDragActivationReady()) {
      event.preventDefault()
      this.finishDrag()
      return
    }
    this.ignoreMenuClickUntil = Date.now() + 260
    this.hideMenu()
    this.draggingBlockPos = this.currentBlockPos
    this.draggingBlockGroup = null

    const selectedPositions = this.editor?.storage?.blockMultiSelect?.selectedPositions as
      | Set<number>
      | undefined
    if (
      selectedPositions &&
      selectedPositions.size > 1 &&
      selectedPositions.has(this.currentBlockPos)
    ) {
      this.draggingBlockGroup = Array.from(selectedPositions).sort((a, b) => a - b)
    }
    this.element.classList.add('is-dragging')
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
    this.menu.remove()
    this.dropIndicator.remove()
    this.element.removeEventListener('dragstart', this.handleDragStart)
    this.element.removeEventListener('dragend', this.handleDragEnd)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('dragend', this.handleDragEnd, true)
    document.removeEventListener('dragover', this.handleDragOver, true)
    document.removeEventListener('drop', this.handleDrop, true)
    document.removeEventListener('mousedown', this.handleGlobalPointerDown, true)
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
