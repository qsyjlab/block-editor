import type { EditorCore } from '../../core/EditorCore'
import type { EditorI18n } from '../../i18n'
import type { FindMatchRange, FindReplaceStorage } from '../../extensions/FindReplace'
import { icons } from '../toolbar/icons'

function collectMatches(doc: any, query: string): FindMatchRange[] {
  if (!query) return []
  const q = query.toLocaleLowerCase()
  const matches: FindMatchRange[] = []
  doc.descendants((node: any, pos: number) => {
    if (!node?.isText || !node.text) return
    const text = String(node.text)
    const haystack = text.toLocaleLowerCase()
    let start = 0
    while (start <= haystack.length - q.length) {
      const idx = haystack.indexOf(q, start)
      if (idx < 0) break
      matches.push({
        from: pos + idx,
        to: pos + idx + query.length,
      })
      start = idx + Math.max(1, query.length)
    }
  })
  return matches.sort((a, b) => a.from - b.from)
}

export class FindReplacePanel {
  private readonly core: EditorCore
  private readonly i18n: EditorI18n['findReplace']
  private readonly panel: HTMLElement
  private readonly host: HTMLElement
  private readonly findInput: HTMLInputElement
  private readonly replaceInput: HTMLInputElement
  private readonly counter: HTMLElement
  private readonly replaceRow: HTMLElement
  private readonly toggleReplaceBtn: HTMLButtonElement
  private readonly scrollViewport: HTMLElement | null
  private readonly disposeShortcuts: Array<() => void> = []
  private rafId: number | null = null
  private layoutRafId: number | null = null
  private readonly handleWindowResize = () => this.scheduleLayout()
  private readonly handleWindowScroll = () => this.scheduleLayout()
  private readonly handleViewportScroll = () => this.scheduleLayout()

  constructor(editorCore: EditorCore, mountContainer?: HTMLElement) {
    this.core = editorCore
    this.i18n = editorCore.i18n.findReplace
    this.host = this.resolveHost(mountContainer)
    this.scrollViewport = this.resolveScrollViewport()

    this.panel = document.createElement('div')
    this.panel.className = 'be-find-replace-panel be-panel-card'
    this.panel.style.display = 'none'

    const findRow = document.createElement('div')
    findRow.className = 'be-find-replace-row'

    this.findInput = document.createElement('input')
    this.findInput.className = 'be-find-replace-input'
    this.findInput.placeholder = this.i18n.findPlaceholder
    this.findInput.setAttribute('aria-label', this.i18n.findPlaceholder)

    this.counter = document.createElement('span')
    this.counter.className = 'be-find-replace-counter'

    const prevBtn = this.createIconButton(icons.arrowUp || '↑', this.i18n.previous)
    prevBtn.addEventListener('click', () => this.move(-1))

    const nextBtn = this.createIconButton(icons.arrowDown || '↓', this.i18n.next)
    nextBtn.addEventListener('click', () => this.move(1))

    this.toggleReplaceBtn = this.createIconButton(icons.more, this.i18n.toggleReplace)
    this.toggleReplaceBtn.addEventListener('click', () => {
      const storage = this.getStorage()
      this.core.editor.commands.setFindReplaceState({
        replaceMode: !storage.replaceMode,
      })
      this.updateFromStorage()
    })

    const closeBtn = this.createIconButton(icons.close, this.i18n.close)
    closeBtn.addEventListener('click', () => {
      this.core.editor.commands.closeFindReplace()
      this.updateFromStorage()
      this.core.editor.commands.focus()
    })

    findRow.append(this.findInput, this.counter, prevBtn, nextBtn, this.toggleReplaceBtn, closeBtn)

    this.replaceRow = document.createElement('div')
    this.replaceRow.className = 'be-find-replace-row'

    this.replaceInput = document.createElement('input')
    this.replaceInput.className = 'be-find-replace-input'
    this.replaceInput.placeholder = this.i18n.replacePlaceholder
    this.replaceInput.setAttribute('aria-label', this.i18n.replacePlaceholder)

    const replaceBtn = document.createElement('button')
    replaceBtn.className = 'be-dialog-btn be-dialog-btn--secondary be-find-replace-btn'
    replaceBtn.textContent = this.i18n.replace
    replaceBtn.addEventListener('click', () => this.replaceCurrent())

    const replaceAllBtn = document.createElement('button')
    replaceAllBtn.className = 'be-dialog-btn be-dialog-btn--primary be-find-replace-btn'
    replaceAllBtn.textContent = this.i18n.replaceAll
    replaceAllBtn.addEventListener('click', () => this.replaceAll())

    this.replaceRow.append(this.replaceInput, replaceBtn, replaceAllBtn)
    this.panel.append(findRow, this.replaceRow)
    this.panel.addEventListener('mousedown', (event) => event.stopPropagation())
    this.panel.addEventListener('click', (event) => event.stopPropagation())
    this.panel.addEventListener('keydown', (event) => event.stopPropagation())

    this.findInput.addEventListener('input', () => this.handleFindInput())
    this.findInput.addEventListener('keydown', (event) => this.handleFindInputKeydown(event))
    this.replaceInput.addEventListener('input', () => {
      this.core.editor.commands.setFindReplaceState({
        replaceText: this.replaceInput.value,
      })
    })
    this.replaceInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.replaceCurrent()
      }
    })

    this.host.appendChild(this.panel)

    this.core.events.on('openFindReplace', (replaceMode?: boolean) => {
      this.open(Boolean(replaceMode))
    })
    this.core.events.on('transaction', () => this.scheduleSync())
    this.registerShortcuts()
    window.addEventListener('resize', this.handleWindowResize, { passive: true })
    window.addEventListener('scroll', this.handleWindowScroll, true)
    this.scrollViewport?.addEventListener('scroll', this.handleViewportScroll, {
      passive: true,
    })
  }

  private resolveHost(mountContainer?: HTMLElement) {
    const editorRoot = this.core.editor.options.element as HTMLElement
    const container =
      (editorRoot.closest('[data-be-editor-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('.editor-container') as HTMLElement | null)
    return container || mountContainer || document.body
  }

  private resolveScrollViewport() {
    const editorRoot = this.core.editor.options.element as HTMLElement
    return (
      (editorRoot.closest('[data-be-scroll-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('.editor-scroll-area') as HTMLElement | null)
    )
  }

  private createIconButton(iconHtml: string, title: string) {
    const btn = document.createElement('button')
    btn.className = 'icon-btn be-find-replace-icon-btn'
    btn.innerHTML = iconHtml
    btn.setAttribute('type', 'button')
    btn.setAttribute('aria-label', title)
    btn.title = title
    btn.addEventListener('mousedown', (event) => event.preventDefault())
    return btn
  }

  private getStorage() {
    return this.core.editor.storage.findReplace as FindReplaceStorage
  }

  private registerShortcuts() {
    this.disposeShortcuts.push(
      this.core.shortcuts.registerShortcut({
        id: 'find.open',
        source: 'FindReplacePanel',
        scope: 'editor',
        command: 'openFindReplace',
        combo: { mac: 'Mod+f', windows: 'Mod+f' },
        allowInInput: true,
        priority: 90,
        run: () => this.open(false),
      }),
    )
    this.disposeShortcuts.push(
      this.core.shortcuts.registerShortcut({
        id: 'find.openReplace',
        source: 'FindReplacePanel',
        scope: 'editor',
        command: 'openFindReplace',
        combo: { mac: 'Mod+h', windows: 'Mod+h' },
        allowInInput: true,
        priority: 90,
        run: () => this.open(true),
      }),
    )
    this.disposeShortcuts.push(
      this.core.shortcuts.registerShortcut({
        id: 'find.close',
        source: 'FindReplacePanel',
        scope: 'editor',
        command: 'closeFindReplace',
        combo: { mac: 'Escape', windows: 'Escape' },
        allowInInput: true,
        priority: 110,
        when: () => this.getStorage().panelOpen,
        run: () => {
          this.core.editor.commands.closeFindReplace()
          this.updateFromStorage()
          this.core.editor.commands.focus()
        },
      }),
    )
  }

  private handleFindInput() {
    const query = this.findInput.value
    this.core.editor.commands.setFindReplaceState({ query })
    this.refreshMatches(false)
  }

  private handleFindInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.move(event.shiftKey ? -1 : 1)
    }
  }

  private open(replaceMode: boolean) {
    this.core.editor.commands.openFindReplace(replaceMode)
    this.updateFromStorage()
    this.findInput.focus()
    this.findInput.select()
    this.refreshMatches(false)
    this.scheduleLayout()
  }

  private updateFromStorage() {
    const storage = this.getStorage()
    this.panel.style.display = storage.panelOpen ? 'flex' : 'none'
    this.replaceRow.style.display = storage.replaceMode ? 'flex' : 'none'
    this.toggleReplaceBtn.classList.toggle('active', storage.replaceMode)
    if (!storage.panelOpen) return
    if (this.findInput.value !== storage.query) this.findInput.value = storage.query
    if (this.replaceInput.value !== storage.replaceText) {
      this.replaceInput.value = storage.replaceText || ''
    }
    this.updateCounter()
    this.scheduleLayout()
  }

  private scheduleSync() {
    if (this.rafId !== null) return
    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = null
      const storage = this.getStorage()
      if (!storage.panelOpen || !storage.query) {
        this.updateFromStorage()
        return
      }
      this.refreshMatches(false)
    })
  }

  private scheduleLayout() {
    if (this.layoutRafId !== null) return
    this.layoutRafId = window.requestAnimationFrame(() => {
      this.layoutRafId = null
      this.updatePanelPosition()
    })
  }

  private updatePanelPosition() {
    if (this.panel.style.display === 'none') return
    const viewportRect =
      this.scrollViewport?.getBoundingClientRect() || this.host.getBoundingClientRect()
    const hostRect = this.host.getBoundingClientRect()
    const panelRect = this.panel.getBoundingClientRect()
    const margin = 12
    const minWidth = 320
    const maxWidth = Math.max(minWidth, viewportRect.width - margin * 2)
    const targetTop = Math.max(margin, Math.round(viewportRect.top - hostRect.top + margin))
    const targetRight = Math.max(margin, Math.round(hostRect.right - viewportRect.right + margin))
    this.panel.style.top = `${targetTop}px`
    this.panel.style.right = `${targetRight}px`
    this.panel.style.maxWidth = `${Math.round(maxWidth)}px`
    if (panelRect.width > maxWidth) {
      this.panel.style.width = `${Math.round(maxWidth)}px`
    } else {
      this.panel.style.width = ''
    }
  }

  private refreshMatches(focusCurrent: boolean) {
    const storage = this.getStorage()
    const query = storage.query || this.findInput.value || ''
    if (!query) {
      this.core.editor.commands.setFindReplaceState({
        query: '',
        matches: [],
        activeIndex: -1,
      })
      this.updateCounter()
      return
    }
    const matches = collectMatches(this.core.editor.state.doc, query)
    const activeIndex = this.computeActiveIndex(matches, storage.activeIndex)
    this.core.editor.commands.setFindReplaceState({
      query,
      matches,
      activeIndex,
    })
    this.updateCounter()
    if (focusCurrent) this.focusActiveMatch()
  }

  private computeActiveIndex(matches: FindMatchRange[], prevIndex: number) {
    if (matches.length === 0) return -1
    if (prevIndex >= 0 && prevIndex < matches.length) return prevIndex
    const from = this.core.editor.state.selection.from
    const idx = matches.findIndex((m) => m.from >= from)
    return idx >= 0 ? idx : 0
  }

  private updateCounter() {
    const storage = this.getStorage()
    if (!storage.query) {
      this.counter.textContent = this.i18n.empty
      return
    }
    if (storage.matches.length === 0 || storage.activeIndex < 0) {
      this.counter.textContent = this.i18n.noResult
      return
    }
    this.counter.textContent = this.i18n.counter(storage.activeIndex + 1, storage.matches.length)
  }

  private move(step: 1 | -1) {
    const storage = this.getStorage()
    if (storage.matches.length === 0) return
    const total = storage.matches.length
    const current = storage.activeIndex >= 0 ? storage.activeIndex : 0
    const next = (current + step + total) % total
    this.core.editor.commands.setFindReplaceState({ activeIndex: next })
    this.updateCounter()
    this.focusActiveMatch()
  }

  private focusActiveMatch() {
    const storage = this.getStorage()
    if (storage.activeIndex < 0 || storage.activeIndex >= storage.matches.length) {
      return
    }
    const match = storage.matches[storage.activeIndex]
    this.core.editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .scrollIntoView()
      .run()
  }

  private replaceCurrent() {
    const storage = this.getStorage()
    if (storage.activeIndex < 0 || storage.activeIndex >= storage.matches.length) return
    const match = storage.matches[storage.activeIndex]
    const replacement = this.replaceInput.value
    const tr = this.core.editor.state.tr.insertText(replacement, match.from, match.to)
    this.core.editor.view.dispatch(tr)
    this.core.editor.commands.setFindReplaceState({ replaceText: replacement })
    this.refreshMatches(false)
    this.focusActiveMatch()
  }

  private replaceAll() {
    const storage = this.getStorage()
    if (storage.matches.length === 0) return
    const replacement = this.replaceInput.value
    let tr = this.core.editor.state.tr
    for (let i = storage.matches.length - 1; i >= 0; i -= 1) {
      const m = storage.matches[i]
      tr = tr.insertText(replacement, m.from, m.to)
    }
    this.core.editor.view.dispatch(tr)
    this.core.editor.commands.setFindReplaceState({ replaceText: replacement })
    this.refreshMatches(false)
    this.focusActiveMatch()
  }

  destroy() {
    this.panel.remove()
    this.disposeShortcuts.forEach((dispose) => dispose())
    this.disposeShortcuts.length = 0
    window.removeEventListener('resize', this.handleWindowResize)
    window.removeEventListener('scroll', this.handleWindowScroll, true)
    this.scrollViewport?.removeEventListener('scroll', this.handleViewportScroll)
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.layoutRafId !== null) {
      cancelAnimationFrame(this.layoutRafId)
      this.layoutRafId = null
    }
  }
}
