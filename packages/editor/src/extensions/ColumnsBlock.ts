import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from 'prosemirror-state'

/**
 * 分栏排版（对齐飞书文档「分栏」）：
 * - columns 容器 + 若干 column 子栏，每栏可放任意块；
 * - 2-4 栏，栏宽可通过拖动分隔条调节（持久化为 column 的 width 属性，%）；
 * - 栏顶悬浮 ＋/－ 控件增减栏数；Backspace 在栏首跳到上一栏末尾（跨栏边界）；
 * - Markdown/DOCX 导出按栏顺序线性化（结构降级为顺序内容）。
 */
export interface ColumnsOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** 在当前光标插入一个 N 栏分栏块 */
      insertColumns: (options?: { columnCount?: number }) => ReturnType
    }
  }
}

const MIN_COLUMNS = 2
const MAX_COLUMNS = 4

const makeColumnContent = (count: number) =>
  Array.from({ length: count }, () => ({
    type: 'column',
    content: [{ type: 'paragraph' }],
  }))

export const Columns = Node.create<ColumnsOptions>({
  name: 'columns',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  group: 'block',
  content: 'column+',
  defining: true,

  addAttributes() {
    return {
      columnCount: {
        default: 2,
        parseHTML: (element) => Number(element.getAttribute('data-columns')) || 2,
        renderHTML: (attributes) => ({ 'data-columns': attributes.columnCount }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'columns',
        'data-columns': node.attrs.columnCount,
      }),
      0,
    ]
  },

  addNodeView() {
    return (props) => new ColumnsNodeView(props.node, props.editor, props.getPos) as any
  },

  addCommands() {
    return {
      insertColumns:
        (options?: { columnCount?: number }) =>
        ({ chain }: { chain: () => any }) => {
          const count = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, options?.columnCount ?? 2))
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { columnCount: count },
              content: makeColumnContent(count),
            })
            .run()
        },
    }
  },

  addKeyboardShortcuts() {
    /** Backspace 在栏首且上一栏存在：光标跳到上一栏最后一段末尾（跨栏边界导航） */
    const jumpToPrevColumnEnd = () => {
      const view = this.editor.view
      const { state } = view
      const sel = state.selection
      if (!sel.empty) return false
      const $from = sel.$from
      if (!$from.parentOffset) return false
      // 找到所属 column
      let columnDepth = -1
      for (let d = $from.depth; d >= 0; d -= 1) {
        if ($from.node(d).type.name === 'column') {
          columnDepth = d
          break
        }
      }
      if (columnDepth < 0) return false
      const indexInParent = $from.index(columnDepth)
      if (indexInParent !== 0) return false // 不在栏内首块
      if ($from.parentOffset !== 0) return false // 不在块首
      // 上一栏
      const columnsDepth = columnDepth - 1
      const columnsNode = $from.node(columnsDepth)
      const prevColumn = columnsNode.child(indexInParent - 1)
      if (!prevColumn) return false
      const prevColumnEnd = $from.before(indexInParent - 1 + 1) - 1 // 上一栏结束位置（相对 doc）
      // 上一栏最后一个文本块末尾
      let target: number | null = null
      prevColumn.descendants((node, offset) => {
        if (node.isTextblock) target = prevColumnEnd - prevColumn.nodeSize + offset + node.content.size
        return true
      })
      if (target === null) return false
      view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(target), -1)))
      return true
    }

    return {
      Backspace: jumpToPrevColumnEnd,
    }
  },
})

export const Column = Node.create<ColumnsOptions>({
  name: 'column',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      /** 栏宽百分比（拖动分隔条持久化）；null = 均分 */
      width: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-width')
          const num = raw ? Number(raw) : NaN
          return Number.isFinite(num) && num > 0 ? num : null
        },
        renderHTML: (attributes) => {
          const width = Number(attributes.width)
          if (!Number.isFinite(width) || width <= 0) return {}
          return {
            'data-width': String(width),
            style: `flex: 0 0 ${width}%; max-width: ${width}%;`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'column' }),
      0,
    ]
  },
})

/** 导出辅助：分栏 → 顺序内容（导出降级用） */
export function flattenColumnsToBlocks(json: any): any[] {
  const out: any[] = []
  const walk = (node: any) => {
    if (!node) return
    if (node.type === 'columns') {
      for (const child of node.content ?? []) walk(child)
      return
    }
    if (node.type === 'column') {
      for (const child of node.content ?? []) out.push(child)
      return
    }
    out.push(node)
  }
  walk(json)
  return out
}

/** 导出辅助：编辑器 JSON 中若含分栏，先展平为顺序块（供 Markdown/DOCX 复用） */
export function flattenColumnsInDocJson(docJson: any): any {
  if (!docJson || docJson.type !== 'doc' || !Array.isArray(docJson.content)) return docJson
  return { ...docJson, content: flattenColumnsToBlocks(docJson.content) }
}

// ── NodeView：控件层（＋/－ 增减栏、分隔条拖宽） ─────────────────────────────

class ColumnsNodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private node: any
  private editor: any
  private getPos: () => number | undefined
  private controls: HTMLElement
  private dividers: HTMLElement[] = []
  private resizeObserver: ResizeObserver | null = null
  private destroyed = false
  private isDraggingWidth = false
  private widthIndicator: HTMLElement | null = null

  constructor(node: any, editor: any, getPos: () => number | undefined) {
    this.node = node
    this.editor = editor
    this.getPos = getPos

    this.dom = document.createElement('div')
    this.dom.className = 'be-columns-outer'

    this.controls = document.createElement('div')
    this.controls.className = 'be-columns-controls'
    this.controls.contentEditable = 'false'
    this.controls.appendChild(this.makeControlBtn('＋', '添加一栏', () => this.addColumn()))
    this.controls.appendChild(this.makeControlBtn('－', '删除最后一栏', () => this.removeColumn()))
    this.controls.addEventListener('mousedown', (e) => e.preventDefault())

    this.contentDOM = document.createElement('div')
    this.contentDOM.className = 'be-columns'
    this.contentDOM.setAttribute('data-type', 'columns')
    this.contentDOM.setAttribute('data-columns', String(node.attrs.columnCount ?? 2))

    this.dom.appendChild(this.controls)
    this.dom.appendChild(this.contentDOM)

    this.applyColumnWidths()
    this.scheduleDividers()

    this.resizeObserver = new ResizeObserver(() => this.scheduleDividers())
    this.resizeObserver.observe(this.contentDOM)
  }

  update(node: any) {
    if (node.type.name !== this.node.type.name) return false
    this.node = node
    this.contentDOM.setAttribute('data-columns', String(node.attrs.columnCount ?? 2))
    this.applyColumnWidths()
    this.scheduleDividers()
    return true
  }

  stopEvent(event: Event) {
    // 控件与分隔条自身处理事件；内容区事件交给 PM
    const target = event.target as HTMLElement | null
    return Boolean(target?.closest('.be-columns-controls, .be-columns-divider-handle'))
  }

  ignoreMutation(mutation: MutationRecord) {
    // 外层 wrapper 的结构变化（控件/分隔条增删）与属性变化都是自身渲染，
    // 不能让 PM 当作文档内容处理；contentDOM 子树交给 PM。
    if (mutation.type === 'attributes') return true
    const target = mutation.target as HTMLElement | null
    if (target === this.dom) return true
    return Boolean(target?.closest('.be-columns-controls, .be-columns-divider-handle'))
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.resizeObserver?.disconnect()
    this.dividers.forEach((d) => d.remove())
    this.dividers = []
  }

  private makeControlBtn(label: string, title: string, onClick: () => void) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'be-columns-control-btn'
    btn.textContent = label
    btn.title = title
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    })
    return btn
  }

  private get columnDoms(): HTMLElement[] {
    return Array.from(this.contentDOM.children).filter(
      (el): el is HTMLElement => (el as HTMLElement).dataset?.type === 'column',
    )
  }

  private applyColumnWidths() {
    if (this.isDraggingWidth) return
    const widths = this.getColumnWidths()
    this.columnDoms.forEach((colDom, i) => {
      const w = widths[i]
      if (w) {
        colDom.style.flex = `0 0 ${w}%`
        colDom.style.maxWidth = `${w}%`
      } else {
        colDom.style.flex = ''
        colDom.style.maxWidth = ''
      }
    })
  }

  private getColumnWidths(): (number | null)[] {
    return this.node.content.content.map((c: any) => {
      const w = Number(c.attrs?.width)
      return Number.isFinite(w) && w > 0 ? w : null
    })
  }

  private addColumn() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { state } = this.editor.view
    const columnsNode = state.doc.nodeAt(pos)
    if (!columnsNode || columnsNode.childCount >= MAX_COLUMNS) return
    const last = columnsNode.child(columnsNode.childCount - 1)
    const insertAt = pos + columnsNode.nodeSize - 1 // 容器闭合标签前
    const tr = state.tr.insert(
      insertAt,
      state.schema.nodes.column.create({ width: last.attrs?.width ?? null }, [
        state.schema.nodes.paragraph.create(),
      ]),
    )
    tr.setNodeMarkup(pos, undefined, {
      ...columnsNode.attrs,
      columnCount: columnsNode.childCount + 1,
    })
    this.editor.view.dispatch(tr)
  }

  private removeColumn() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { state } = this.editor.view
    const columnsNode = state.doc.nodeAt(pos)
    if (!columnsNode || columnsNode.childCount <= MIN_COLUMNS) return
    const last = columnsNode.child(columnsNode.childCount - 1)
    const from = pos + columnsNode.nodeSize - 1 - last.nodeSize
    const tr = state.tr.delete(from, pos + columnsNode.nodeSize - 1)
    tr.setNodeMarkup(pos, undefined, {
      ...columnsNode.attrs,
      columnCount: columnsNode.childCount - 1,
    })
    this.editor.view.dispatch(tr)
  }

  private scheduleDividers() {
    if (this.destroyed) return
    requestAnimationFrame(() => {
      if (this.destroyed) return
      this.positionDividers()
    })
  }

  private positionDividers() {
    // eslint-disable-next-line no-console
    this.dividers.forEach((d) => d.remove())
    this.dividers = []
    const cols = this.columnDoms
    for (let i = 1; i < cols.length; i += 1) {
      const leftCol = cols[i - 1]
      const handle = document.createElement('div')
      handle.className = 'be-columns-divider-handle'
      handle.contentEditable = 'false'
      // 挂在外层 wrapper（挂 contentDOM 内会被 PM 当内容清除），
      // x = contentDOM 在 wrapper 内的偏移 + 列左缘 + 列宽
      const x = this.contentDOM.offsetLeft + leftCol.offsetLeft + leftCol.offsetWidth
      handle.style.left = `${x}px`
      handle.addEventListener('mousedown', (e) => this.startWidthDrag(e, i - 1, i))
      this.dom.appendChild(handle)
      this.dividers.push(handle)
    }
  }

  private startWidthDrag(event: MouseEvent, leftIndex: number, rightIndex: number) {
    event.preventDefault()
    this.isDraggingWidth = true
    event.stopPropagation()
    const cols = this.columnDoms
    const leftCol = cols[leftIndex]
    const rightCol = cols[rightIndex]
    if (!leftCol || !rightCol) return
    const startX = event.clientX
    const startLeftW = leftCol.getBoundingClientRect().width
    const startRightW = rightCol.getBoundingClientRect().width
    const total = startLeftW + startRightW

    // 指示线：fixed 定位的竖线，跟随鼠标
    this.widthIndicator = document.createElement('div')
    this.widthIndicator.className = 'be-columns-width-indicator'
    const contentRect = this.contentDOM.getBoundingClientRect()
    this.widthIndicator.style.left = `${contentRect.left + startLeftW}px`
    document.body.appendChild(this.widthIndicator)

    const onMove = (e2: MouseEvent) => {
      // 拖拽期间只移动指示线，不改列布局（PM 会在事务后重建列 DOM，
      // 逐帧写样式会丢失）；mouseup 时一次性提交百分比 attrs。
      const delta = e2.clientX - startX
      let leftPct = ((startLeftW + delta) / total) * 100
      leftPct = Math.max(15, Math.min(85, leftPct))
      const absLeft = (leftPct / 100) * total
      if (this.widthIndicator) {
        const x = this.contentDOM.getBoundingClientRect().left + absLeft
        this.widthIndicator.style.left = `${x}px`
      }
    }
    const onUp = (e2: MouseEvent) => {
      try {
        commitWidth(e2)
      } catch (e) {
        console.error('[col-up] error', String(e).slice(0, 200))
      }
    }
    const commitWidth = (e2: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      this.widthIndicator?.remove()
      this.widthIndicator = null
      this.isDraggingWidth = false
      const delta = e2.clientX - startX
      const leftPct = Math.round(Math.max(15, Math.min(85, ((startLeftW + delta) / total) * 100)) * 10) / 10
      const rightPct = Math.round((100 - leftPct) * 10) / 10
      const pos = this.getPos()
      if (pos === undefined) return
      const { state } = this.editor.view
      const columnsNode = state.doc.nodeAt(pos)
      if (!columnsNode) return
      const tr = state.tr
      let childPos = pos + 1
      columnsNode.forEach((child: any, _offset: number, index: number) => {
        if (index === leftIndex) {
          tr.setNodeMarkup(childPos, undefined, { ...child.attrs, width: leftPct })
        } else if (index === rightIndex) {
          tr.setNodeMarkup(childPos, undefined, { ...child.attrs, width: rightPct })
        }
        childPos += child.nodeSize
      })
      this.editor.view.dispatch(tr)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}
