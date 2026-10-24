import { Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'

export interface TocItem {
  level: number
  text: string
  pos: number
}

export interface TocOptions {
  HTMLAttributes: Record<string, any>
  maxLevel: number
}

/**
 * 目录块（TOC，对齐飞书文档「目录」）：
 * - 收集文档中的 H1–H3 标题，渲染可点击条目，点击滚动定位；
 * - 文档更新时自动重建（节流 300ms，长文档不抖）；
 * - 无标题时展示占位文案；自身 atomic，不参与文本编辑。
 */
export const TocBlock = Node.create<TocOptions>({
  name: 'tocBlock',

  addOptions() {
    return {
      HTMLAttributes: {},
      maxLevel: 3,
    }
  },

  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      maxLevel: {
        default: this.options.maxLevel,
        parseHTML: (element) => Number(element.getAttribute('data-max-level')) || this.options.maxLevel,
        renderHTML: (attributes) => ({ 'data-max-level': attributes.maxLevel }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toc-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'toc-block' }),
    ]
  },

  addNodeView() {
    return (props) => new TocNodeView(props.node, props.editor, props.getPos) as any
  },
})

class TocNodeView {
  dom: HTMLElement
  node: any
  editor: Editor
  getPos: () => number | undefined

  private listEl: HTMLElement
  private refreshTimer: number | null = null
  private destroyed = false

  constructor(node: any, editor: Editor, getPos: () => number | undefined) {
    this.node = node
    this.editor = editor
    this.getPos = getPos

    this.dom = document.createElement('div')
    this.dom.className = 'be-toc-block'
    this.dom.setAttribute('data-type', 'toc-block')

    const title = document.createElement('div')
    title.className = 'be-toc-title'
    title.textContent = '目录'
    this.dom.appendChild(title)

    this.listEl = document.createElement('div')
    this.listEl.className = 'be-toc-list'
    this.dom.appendChild(this.listEl)

    this.render()
    this.dom.addEventListener('click', this.handleClick)
    this.editor.on('update', this.scheduleRefresh)
    this.editor.on('destroy', this.destroy)
  }

  update(node: any) {
    if (node.type.name !== this.node.type.name) return false
    this.node = node
    this.render()
    return true
  }

  stopEvent() {
    // 纯展示 + 点击跳转，事件全部交给 DOM 行为
    return true
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.dom.removeEventListener('click', this.handleClick)
    this.editor.off('update', this.scheduleRefresh)
    this.editor.off('destroy', this.destroy)
    if (this.refreshTimer) window.clearTimeout(this.refreshTimer)
  }

  private scheduleRefresh = () => {
    if (this.refreshTimer) window.clearTimeout(this.refreshTimer)
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null
      if (!this.destroyed) this.render()
    }, 300)
  }

  private handleClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.be-toc-item[data-pos]',
    )
    if (!target) return
    const pos = Number(target.dataset.pos)
    if (!Number.isFinite(pos)) return

    // 1) 同步 ProseMirror 选区（后续输入落在标题处）
    try {
      this.editor.chain().focus().setTextSelection(pos + 1).run()
    } catch {
      // 文档已变化导致 pos 失效：等下一次 refresh 重建条目
    }

    // 2) DOM 定位：NodeView 渲染的标题 DOM 可能与编辑器 DOM 不同步，
    //    用 view.nodeDOM 拿真实标题元素，滚最近的 overflow 容器。
    requestAnimationFrame(() => {
      try {
        const headingDom = this.editor.view.nodeDOM(pos) as HTMLElement | null
        const el = (headingDom?.nodeType === 1 ? headingDom : null) || headingDom
        if (!el || !el.getBoundingClientRect) return
        const rect = el.getBoundingClientRect()
        let parent = el.parentElement
        while (parent && parent !== document.body) {
          const cs = getComputedStyle(parent)
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || parent.dataset.beScrollContainer === 'true') {
            const pRect = parent.getBoundingClientRect()
            parent.scrollTop += rect.top - pRect.top - 24
            break
          }
          parent = parent.parentElement
        }
      } catch {
        // 定位失败忽略：pos 失效场景
      }
    })
  }

  private collectHeadings(): TocItem[] {
    const maxLevel = Number(this.node.attrs?.maxLevel) || 3
    const items: TocItem[] = []
    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'heading') return
      const level = Number(node.attrs?.level) || 1
      if (level > maxLevel) return
      const text = node.textContent.trim()
      if (!text) return
      items.push({ level, text, pos })
    })
    return items
  }

  private render() {
    const items = this.collectHeadings()
    this.listEl.innerHTML = ''

    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'be-toc-empty'
      empty.textContent = '添加标题后自动生成目录'
      this.listEl.appendChild(empty)
      return
    }

    items.forEach((item) => {
      const row = document.createElement('div')
      row.className = `be-toc-item be-toc-item--h${item.level}`
      row.dataset.pos = String(item.pos)
      row.setAttribute('role', 'button')
      row.title = item.text

      const label = document.createElement('span')
      label.className = 'be-toc-item-text'
      label.textContent = item.text
      row.appendChild(label)

      this.listEl.appendChild(row)
    })
  }
}
