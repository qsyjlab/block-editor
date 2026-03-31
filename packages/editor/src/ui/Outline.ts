import { EditorCore } from '../core/EditorCore'
import { resolveEditorI18n } from '../i18n'

interface OutlineHeading {
  level: number
  text: string
  pos: number
}

interface BacklinkItem {
  fromBlockId: string
  fromPos: number
  text: string
}

const OUTLINE_ACTIVE_TOP_PADDING = 72
const OUTLINE_ACTIVE_RATIO = 0.22
const OUTLINE_TOP_LOCK_SCROLL = 8
const OUTLINE_BOTTOM_LOCK_GAP = 12

export interface OutlineI18n {
  outlineTitle: string
  noHeadings: string
  untitled: string
  backlinksTitle: string
  noBlockId: string
  noBacklinks: string
  backlinkPlaceholder: string
  backlinkFrom: (blockId: string) => string
}

const DEFAULT_OUTLINE_I18N: OutlineI18n = resolveEditorI18n('en-US').outline

export interface OutlineOptions {
  scrollArea?: HTMLElement | null
  i18n?: Partial<OutlineI18n>
}

export class Outline {
  private container: HTMLElement
  private editorCore: EditorCore
  private headings: OutlineHeading[] = []
  private itemByPos: Map<number, HTMLElement> = new Map()
  private activePos: number | null = null
  private scrollArea: HTMLElement | null = null
  private clickNavigateUntil = 0
  private scrollTicking = false

  private activeBlockId: string | null = null
  private backlinkByTarget: Map<string, BacklinkItem[]> = new Map()
  private readonly i18n: OutlineI18n

  constructor(container: HTMLElement, editorCore: EditorCore, options: OutlineOptions = {}) {
    this.container = container
    this.editorCore = editorCore
    this.i18n = { ...DEFAULT_OUTLINE_I18N, ...options.i18n }

    this.editorCore.events.on('update', this.handleDocUpdate)
    this.editorCore.events.on('selectionUpdate', this.handleSelectionUpdate)

    this.scrollArea = options.scrollArea || null
    if (!this.scrollArea) {
      this.resolveScrollArea()
    }
    this.scrollArea?.addEventListener('scroll', this.handleScroll, {
      passive: true,
    })

    this.render()
  }

  private handleDocUpdate = () => {
    this.render()
  }

  private handleSelectionUpdate = () => {
    if (Date.now() < this.clickNavigateUntil) return
    this.syncActiveByContext()
    this.activeBlockId = this.getNearestBlockIdBySelection()
    this.renderBacklinksOnly()
  }

  private handleScroll = () => {
    if (Date.now() < this.clickNavigateUntil) return
    if (this.scrollTicking) return
    this.scrollTicking = true
    requestAnimationFrame(() => {
      this.scrollTicking = false
      this.syncActiveByViewport()
    })
  }

  private resolveScrollArea() {
    const editorElement = this.editorCore.editor.options.element as HTMLElement
    this.scrollArea =
      (editorElement.closest('.editor-scroll-area') as HTMLElement | null) ||
      (this.container
        .closest('.layout')
        ?.querySelector('.editor-scroll-area') as HTMLElement | null) ||
      null
  }

  private render() {
    this.container.innerHTML = ''
    this.itemByPos.clear()

    const title = document.createElement('h3')
    title.textContent = this.i18n.outlineTitle
    title.style.cssText =
      'margin:0 0 10px;font-size:16px;line-height:1.25;font-weight:700;color:var(--text-color);letter-spacing:0;'
    this.container.appendChild(title)

    this.headings = []
    this.editorCore.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        this.headings.push({
          level: node.attrs.level,
          text: node.textContent,
          pos,
        })
      }
      return true
    })

    const list = document.createElement('ul')
    list.style.listStyle = 'none'
    list.style.padding = '0'
    list.style.margin = '0'
    list.style.maxHeight = 'calc(100vh - 280px)'
    list.style.overflowY = 'auto'
    list.style.display = 'flex'
    list.style.flexDirection = 'column'
    list.style.gap = '6px'

    if (this.headings.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = this.i18n.noHeadings
      empty.style.color = 'var(--text-muted)'
      empty.style.fontSize = '12px'
      empty.style.padding = '6px 2px'
      this.container.appendChild(empty)
      this.activePos = null
    } else {
      this.headings.forEach((h) => {
        const li = document.createElement('li')
        li.textContent = h.text || this.i18n.untitled
        li.title = h.text || this.i18n.untitled
        li.dataset.outlineLevel = String(h.level)
        li.style.marginLeft = `${(h.level - 1) * 12}px`
        li.style.fontSize = h.level === 1 ? '15px' : h.level === 2 ? '13px' : '12px'
        li.style.lineHeight = '1.45'
        li.style.cursor = 'pointer'
        li.style.borderRadius = '8px'
        li.style.padding = h.level === 1 ? '7px 10px' : '6px 9px'
        li.style.whiteSpace = 'nowrap'
        li.style.overflow = 'hidden'
        li.style.textOverflow = 'ellipsis'
        li.style.transition = 'all 0.14s ease'
        li.style.fontWeight = h.level === 1 ? '600' : '500'
        li.style.color = 'var(--text-secondary)'

        li.addEventListener('mouseenter', () => {
          if (this.activePos !== h.pos) {
            li.style.background = 'var(--surface-soft)'
            li.style.color = 'var(--text-color)'
          }
        })
        li.addEventListener('mouseleave', () => {
          if (this.activePos !== h.pos) {
            li.style.background = 'transparent'
            li.style.color = 'var(--text-secondary)'
          }
        })

        li.onclick = () => this.navigateToHeading(h.pos)

        this.itemByPos.set(h.pos, li)
        list.appendChild(li)
      })

      this.container.appendChild(list)
      this.syncActiveByContext()
    }

    this.buildBacklinkIndex()
    this.activeBlockId = this.getNearestBlockIdBySelection()
    this.renderBacklinksOnly()
  }

  private buildBacklinkIndex() {
    this.backlinkByTarget.clear()

    this.editorCore.editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return true

      for (const mark of node.marks) {
        if (mark.type.name !== 'link') continue
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
        if (!href.startsWith('#')) continue

        const targetId = decodeURIComponent(href.slice(1)).trim()
        if (!targetId) continue

        const context = this.getNearestBlockContext(pos)
        if (!context?.blockId) continue

        const entry: BacklinkItem = {
          fromBlockId: context.blockId,
          fromPos: context.pos,
          text: node.text || this.i18n.backlinkPlaceholder,
        }

        const list = this.backlinkByTarget.get(targetId) || []
        list.push(entry)
        this.backlinkByTarget.set(targetId, list)
      }

      return true
    })
  }

  private getNearestBlockContext(pos: number): { blockId: string | null; pos: number } | null {
    const resolved = this.editorCore.editor.state.doc.resolve(
      Math.min(pos, this.editorCore.editor.state.doc.content.size),
    )

    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
      const node = resolved.node(depth)
      const blockId = typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : ''
      if (!blockId) continue
      const blockPos = depth === 0 ? 0 : resolved.before(depth)
      return { blockId, pos: blockPos }
    }

    return null
  }

  private getNearestBlockIdBySelection(): string | null {
    const { from } = this.editorCore.editor.state.selection
    const context = this.getNearestBlockContext(from)
    return context?.blockId || null
  }

  private renderBacklinksOnly() {
    const prev = this.container.querySelector('.be-outline-backlinks')
    prev?.remove()

    const wrapper = document.createElement('div')
    wrapper.className = 'be-outline-backlinks'
    wrapper.style.marginTop = '14px'
    wrapper.style.paddingTop = '12px'
    wrapper.style.borderTop = '1px solid var(--border-color)'

    const title = document.createElement('div')
    title.textContent = this.i18n.backlinksTitle
    title.style.fontSize = '13px'
    title.style.fontWeight = '600'
    title.style.color = 'var(--text-secondary)'
    title.style.marginBottom = '8px'
    wrapper.appendChild(title)

    const activeId = this.activeBlockId
    const backlinks = activeId ? this.backlinkByTarget.get(activeId) || [] : []

    if (!activeId) {
      const empty = document.createElement('div')
      empty.textContent = this.i18n.noBlockId
      empty.style.fontSize = '12px'
      empty.style.color = 'var(--text-muted)'
      wrapper.appendChild(empty)
    } else if (backlinks.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = this.i18n.noBacklinks
      empty.style.fontSize = '12px'
      empty.style.color = 'var(--text-muted)'
      wrapper.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.display = 'flex'
      list.style.flexDirection = 'column'
      list.style.gap = '8px'

      backlinks.slice(0, 12).forEach((item) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = item.text || this.i18n.backlinkPlaceholder
        btn.title = this.i18n.backlinkFrom(item.fromBlockId)
        btn.style.cssText =
          'text-align:left;border:1px solid var(--border-color);background:var(--paper-bg);border-radius:8px;padding:7px 9px;font-size:12px;color:var(--text-secondary);cursor:pointer;font-family:inherit;'
        btn.onmouseenter = () => {
          btn.style.background = 'var(--surface-soft)'
          btn.style.borderColor = 'var(--primary-color)'
        }
        btn.onmouseleave = () => {
          btn.style.background = 'var(--paper-bg)'
          btn.style.borderColor = 'var(--border-color)'
        }
        btn.onclick = () => {
          this.navigateToPos(item.fromPos)
        }
        list.appendChild(btn)
      })

      wrapper.appendChild(list)
    }

    this.container.appendChild(wrapper)
  }

  private navigateToHeading(pos: number) {
    this.clickNavigateUntil = Date.now() + 420
    this.navigateToPos(pos)
    this.setActive(pos)

    setTimeout(() => {
      this.syncActiveByContext()
    }, 440)
  }

  private navigateToPos(pos: number) {
    const safePos = Math.max(1, Math.min(pos + 1, this.editorCore.editor.state.doc.content.size))

    this.editorCore.editor.chain().focus().setTextSelection(safePos).run()

    try {
      const coords = this.editorCore.editor.view.coordsAtPos(safePos)
      if (this.scrollArea) {
        const rect = this.scrollArea.getBoundingClientRect()
        const delta = coords.top - rect.top
        const targetTop = this.scrollArea.scrollTop + delta - 88
        this.scrollArea.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        })
      } else {
        this.editorCore.editor.commands.scrollIntoView()
      }
    } catch {
      this.editorCore.editor.commands.scrollIntoView()
    }
  }

  private syncActiveByContext() {
    const activeFromSelection = this.getActiveHeadingBySelection()
    if (activeFromSelection !== null) {
      this.setActive(activeFromSelection)
      return
    }
    this.syncActiveByViewport()
  }

  private syncActiveByViewport() {
    const active = this.getActiveHeadingByViewport()
    if (active !== null) {
      this.setActive(active)
    }
  }

  private getActiveHeadingBySelection(): number | null {
    const { from } = this.editorCore.editor.state.selection
    let result: number | null = null

    for (const h of this.headings) {
      if (h.pos <= from) {
        result = h.pos
      } else {
        break
      }
    }

    return result
  }

  private getActiveHeadingByViewport(): number | null {
    if (this.headings.length === 0) return null

    const editorElement = this.editorCore.editor.options.element as HTMLElement
    const editorRect = editorElement.getBoundingClientRect()
    const scrollRect = this.scrollArea?.getBoundingClientRect()
    const viewportTop = scrollRect?.top ?? editorRect.top
    const viewportBottom = scrollRect?.bottom ?? editorRect.bottom
    const viewportHeight = viewportBottom - viewportTop
    const anchorY =
      viewportTop +
      Math.max(OUTLINE_ACTIVE_TOP_PADDING, Math.floor(viewportHeight * OUTLINE_ACTIVE_RATIO))

    const scrollTop = this.scrollArea?.scrollTop ?? 0
    const scrollHeight = this.scrollArea?.scrollHeight ?? 0
    const clientHeight = this.scrollArea?.clientHeight ?? 0

    if (scrollTop <= OUTLINE_TOP_LOCK_SCROLL) {
      return this.headings[0].pos
    }

    if (scrollHeight > 0 && scrollTop + clientHeight >= scrollHeight - OUTLINE_BOTTOM_LOCK_GAP) {
      return this.headings[this.headings.length - 1].pos
    }

    let candidate: number | null = this.headings[0].pos
    let anyVisible = false

    for (const h of this.headings) {
      try {
        const coords = this.editorCore.editor.view.coordsAtPos(h.pos + 1)
        if (coords.bottom >= viewportTop && coords.top <= viewportBottom) {
          anyVisible = true
        }

        if (coords.top <= anchorY) {
          candidate = h.pos
        } else {
          break
        }
      } catch {
        // ignore invalid coords
      }
    }

    if (!anyVisible) {
      return this.headings[this.headings.length - 1].pos
    }

    return candidate
  }

  private setActive(pos: number) {
    if (this.activePos === pos) return
    this.activePos = pos

    this.itemByPos.forEach((item, headingPos) => {
      if (headingPos === pos) {
        item.style.color = 'var(--text-color)'
        item.style.fontWeight = '650'
        item.style.background = 'color-mix(in srgb, var(--primary-color) 12%, var(--paper-bg))'
        item.style.boxShadow = 'inset 0 0 0 1px var(--primary-color)'
      } else {
        item.style.color = 'var(--text-secondary)'
        item.style.fontWeight = item.dataset.outlineLevel === '1' ? '600' : '500'
        item.style.background = 'transparent'
        item.style.boxShadow = 'none'
      }
    })

    const activeItem = this.itemByPos.get(pos)
    activeItem?.scrollIntoView({ block: 'nearest' })
  }
}
