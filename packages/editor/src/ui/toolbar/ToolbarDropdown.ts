import { computePosition, flip, shift, offset, autoUpdate, hide } from '@floating-ui/dom';
import { EditorCore } from '../../core/EditorCore'
import { icons } from './icons'
import { ToolbarDropdownConfig, DropdownOptionConfig } from './ToolbarRegistry'
import {
  createDropdownItem,
  createDropdownMenu,
  focusDropdownItem,
  getFocusableDropdownItems,
} from "../components/DropdownMenu";

export type ToolbarDropdownProps = ToolbarDropdownConfig

// ── Global Dropdown Manager ────────────────────────────────────────────────────
// Ensures only one dropdown is open at a time across all instances.

class DropdownManager {
  private static instance: DropdownManager
  private openDropdown: ToolbarDropdown | null = null

  static getInstance(): DropdownManager {
    if (!DropdownManager.instance) {
      DropdownManager.instance = new DropdownManager()

      // Close on outside click / touch
      const handleOutside = (e: Event) => {
        const target = e.target as Node
        const current = DropdownManager.instance.openDropdown
        if (!current) return
        if (!current.containsNode(target)) {
          current.close()
        }
      }
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('touchstart', handleOutside, { passive: true })

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DropdownManager.instance.openDropdown) {
          DropdownManager.instance.openDropdown.close()
        }
      })
    }
    return DropdownManager.instance
  }

  openNew(dropdown: ToolbarDropdown) {
    if (this.openDropdown && this.openDropdown !== dropdown) {
      this.openDropdown.close()
    }
    this.openDropdown = dropdown
  }

  unregister(dropdown: ToolbarDropdown) {
    if (this.openDropdown === dropdown) {
      this.openDropdown = null
    }
  }
}

const manager = DropdownManager.getInstance()

// ── ToolbarDropdown ────────────────────────────────────────────────────────────

export class ToolbarDropdown {
  private element: HTMLElement
  private trigger!: HTMLElement
  private menu!: HTMLElement
  private editorCore: EditorCore
  private props: ToolbarDropdownProps
  private _isOpen: boolean = false
  private cleanupFloating: (() => void) | null = null
  private focusedIndex: number = -1
  private overlayHost: HTMLElement

  constructor(props: ToolbarDropdownProps, editorCore: EditorCore) {
    this.props = props
    this.editorCore = editorCore
    this.overlayHost = this.resolveOverlayHost()
    this.element = this.render()

    this.editorCore.events.on('selectionUpdate', () => this.updateLabel())
    this.editorCore.events.on('transaction', () => this.updateLabel())
  }

  private resolveOverlayHost(): HTMLElement {
    const editorRoot = this.editorCore.editor.options.element as HTMLElement
    const host =
      (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null)
    return host || document.body
  }

  public getElement(): HTMLElement {
    return this.element
  }

  /** Used by DropdownManager to check whether a click is inside this dropdown */
  public containsNode(node: Node): boolean {
    return this.element.contains(node) || this.menu.contains(node)
  }

  private render(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'toolbar-dropdown-wrapper'

    // ── Trigger button ─────────────────────────────────────────────────────────
    this.trigger = document.createElement('button')
    this.trigger.className = 'toolbar-dropdown-trigger'
    this.trigger.setAttribute('aria-haspopup', 'listbox')
    this.trigger.setAttribute('aria-expanded', 'false')
    if (this.props.tooltip || this.props.label) {
      this.trigger.dataset.tooltip = this.props.tooltip || this.props.label
    }
    if (this.props.width) this.trigger.style.width = this.props.width

    const labelSpan = document.createElement('span')
    labelSpan.className = 'dropdown-label'
    labelSpan.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:4px;flex:1;text-align:left;display:flex;align-items:center;'
    if (this.props.icon && icons[this.props.icon]) {
      labelSpan.innerHTML = icons[this.props.icon]
    } else {
      labelSpan.textContent = this.props.label
    }
    this.trigger.appendChild(labelSpan)

    const chevron = document.createElement('span')
    chevron.className = 'dropdown-chevron'
    chevron.style.cssText = 'display:flex;flex-shrink:0;transition:transform 0.2s ease;'
    chevron.innerHTML = icons.chevronDown
    this.trigger.appendChild(chevron)

    this.trigger.addEventListener('mousedown', (e) => {
      e.stopPropagation()
    })

    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      this.toggle()
    })

    // Keyboard on trigger: open on ArrowDown / Enter / Space
    this.trigger.addEventListener('keydown', (e) => {
      const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']
      if (!this._isOpen && openKeys.includes(e.key)) {
        e.preventDefault()
        this.open()
        if (e.key === 'ArrowUp') {
          const items = this.getFocusableItems()
          this.focusItem(Math.max(0, items.length - 1))
        } else {
          this.focusItem(0)
        }
        this.menu.focus()
        return
      }

      const navKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab']
      if (this._isOpen && navKeys.includes(e.key)) {
        this.menu.focus()
        this.handleMenuKeydown(e)
      }
    })

    // ── Menu container ─────────────────────────────────────────────────────────
    this.menu = createDropdownMenu({
      role: "listbox",
      layout: this.props.layout === "row" ? "row" : "list",
    })

    wrapper.appendChild(this.trigger)
    return wrapper
  }

  private toggle() {
    if (this._isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  public open() {
    manager.openNew(this)
    this._isOpen = true
    this.focusedIndex = -1
    this.element.classList.add('open')
    this.trigger.setAttribute('aria-expanded', 'true')

    // Rotate chevron
    const chevron = this.trigger.querySelector('.dropdown-chevron') as HTMLElement | null
    if (chevron) chevron.style.transform = 'rotate(180deg)'

    // Portal to body
    const ownerMoreMenu = this.element.closest('.toolbar-dropdown-menu[data-be-more-id]') as HTMLElement | null
    const openedFromMoreMenu = Boolean(ownerMoreMenu)
    this.menu.dataset.ownerInMore = openedFromMoreMenu ? 'true' : 'false'
    this.menu.dataset.ownerMoreId = ownerMoreMenu?.dataset.beMoreId ?? ''
    this.overlayHost.appendChild(this.menu)
    this.renderMenuItems()

    // Animate in
    this.menu.style.display = this.props.layout === 'row' ? 'flex' : 'block'
    this.menu.style.opacity = '0'
    this.menu.style.transform = 'translateY(-6px) scale(0.97)'
    requestAnimationFrame(() => {
      this.menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
      this.menu.style.opacity = '1'
      this.menu.style.transform = 'translateY(0) scale(1)'
    })

    // Keyboard nav inside menu
    this.menu.addEventListener('keydown', this.handleMenuKeydown)

    // Floating UI positioning
    this.cleanupFloating = autoUpdate(this.trigger, this.menu, () => {
      if (!this.trigger.isConnected || this.trigger.offsetParent === null) {
        this.close()
        return
      }
      computePosition(this.trigger, this.menu, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(4), flip(), shift({ padding: 5 }), hide()],
      }).then(({ x, y, middlewareData }) => {
        if (middlewareData.hide?.referenceHidden) {
          this.close()
          return
        }
        Object.assign(this.menu.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: 'fixed',
          zIndex: '10000',
        })
      })
    })
  }

  public close() {
    if (!this._isOpen) return
    manager.unregister(this)
    this._isOpen = false
    this.focusedIndex = -1
    this.element.classList.remove('open')
    this.trigger.setAttribute('aria-expanded', 'false')

    // Restore chevron
    const chevron = this.trigger.querySelector('.dropdown-chevron') as HTMLElement | null
    if (chevron) chevron.style.transform = 'rotate(0deg)'

    this.menu.removeEventListener('keydown', this.handleMenuKeydown)

    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }

    // Animate out, then remove
    this.menu.style.transition = 'opacity 0.12s ease, transform 0.12s ease'
    this.menu.style.opacity = '0'
    this.menu.style.transform = 'translateY(-4px) scale(0.97)'

    setTimeout(() => {
      if (this.menu.parentElement === this.overlayHost) {
        this.overlayHost.removeChild(this.menu)
      }
      this.menu.style.display = 'none'
      this.menu.style.transition = ''
      this.menu.style.opacity = ''
      this.menu.style.transform = ''
    }, 120)
  }

  // ── Keyboard navigation inside menu ─────────────────────────────────────────

  private handleMenuKeydown = (e: KeyboardEvent) => {
    const items = this.getFocusableItems()
    if (!items.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.focusItem((this.focusedIndex + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.focusItem((this.focusedIndex - 1 + items.length) % items.length)
        break
      case 'Home':
        e.preventDefault()
        this.focusItem(0)
        break
      case 'End':
        e.preventDefault()
        this.focusItem(items.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (this.focusedIndex >= 0) {
          items[this.focusedIndex].click()
        }
        break
      case 'Escape':
        this.close()
        this.trigger.focus()
        break
      case 'Tab':
        this.close()
        break
    }
  }

  private getFocusableItems(): HTMLElement[] {
    return getFocusableDropdownItems(this.menu)
  }

  private focusItem(index: number) {
    this.focusedIndex = focusDropdownItem(this.menu, index)
  }

  // ── Menu item rendering ──────────────────────────────────────────────────────

  private renderMenuItems() {
    this.menu.innerHTML = ''

    this.props.options.forEach((opt) => {
      // Active state
      let isActive = false
      if (opt.isActive) {
        isActive = opt.isActive(this.editorCore.editor)
      } else if (opt.command) {
        const name = opt.command.replace('toggle', '').replace('set', '').toLowerCase()
        isActive = this.editorCore.editor.isActive(name, opt.args)
      }

      const isDisabled = Boolean(opt.isDisabled?.(this.editorCore.editor))
      const item = createDropdownItem({
        label: opt.label,
        iconHtml: opt.icon && icons[opt.icon] ? icons[opt.icon] : undefined,
        active: isActive,
        disabled: isDisabled,
        tooltip: this.props.layout === "row" ? (opt.tooltip || opt.label) : undefined,
        title: this.props.layout === "row" ? (opt.tooltip || opt.label) : undefined,
      })

      if (this.props.layout === 'row') {
        item.style.justifyContent = 'center'
        item.style.padding = '4px'
        item.style.minWidth = '28px'
        item.style.minHeight = '28px'
        const text = item.querySelector('span:last-child') as HTMLElement | null
        if (text) text.style.display = 'none'
        if (isActive) {
          item.style.backgroundColor = 'var(--btn-active-bg)'
          item.style.color = 'var(--btn-active-color)'
        }
      } else {
        item.style.display = 'flex'
        item.style.alignItems = 'center'
        item.style.justifyContent = 'space-between'
        if (isActive) {
          item.style.backgroundColor = 'var(--btn-active-bg)'
          item.style.color = 'var(--btn-active-color)'
          item.style.fontWeight = '500'
          item.setAttribute('aria-selected', 'true')
        }
      }

      if (isDisabled) {
        item.style.opacity = '0.5'
        item.style.pointerEvents = 'none'
      }

      // Click / touch handler
      const handleSelect = (e: Event) => {
        e.stopPropagation()
        this.execute(opt)
        this.close()
      }
      item.addEventListener('click', handleSelect)
      item.addEventListener('touchend', (e) => {
        e.preventDefault() // prevent ghost click
        handleSelect(e)
      })

      // Hover focus tracking (for mouse users)
      item.addEventListener('mouseenter', () => {
        const items = this.getFocusableItems()
        this.focusedIndex = items.indexOf(item)
        items.forEach((it, i) => it.classList.toggle('keyboard-focus', i === this.focusedIndex))
      })

      this.menu.appendChild(item)
    })
  }

  // ── Execute command ──────────────────────────────────────────────────────────

  private execute(opt: DropdownOptionConfig) {
    if (opt.onExecute) {
      void opt.onExecute(this.editorCore)
      return
    }

    if (!opt.command) return

    const chain = this.editorCore.editor.chain().focus()
    if (typeof (chain as any)[opt.command] === 'function') {
      if (opt.args) {
        ;(chain as any)[opt.command](opt.args).run()
      } else {
        ;(chain as any)[opt.command]().run()
      }
    }
  }

  // ── Update trigger label ─────────────────────────────────────────────────────

  private updateLabel() {
    if (this.props.isDisabled) {
      const disabled = this.props.isDisabled(this.editorCore.editor)
      this.trigger.toggleAttribute('disabled', disabled)
      this.trigger.classList.toggle('disabled', disabled)
    }

    const activeOption = this.props.options.find((opt) => {
      if (opt.isActive) return opt.isActive(this.editorCore.editor)
      if (!opt.command) return false
      const name = opt.command.replace('toggle', '').replace('set', '').toLowerCase()
      return this.editorCore.editor.isActive(name, opt.args)
    })

    const labelEl = this.trigger.querySelector('.dropdown-label') as HTMLElement | null
    if (!labelEl) return

    if (activeOption) {
      if (activeOption.icon && icons[activeOption.icon]) {
        labelEl.innerHTML = icons[activeOption.icon]
      } else {
        labelEl.textContent = activeOption.label
      }
    } else {
      if (this.props.icon && icons[this.props.icon]) {
        labelEl.innerHTML = icons[this.props.icon]
      } else {
        labelEl.textContent = this.props.label
      }
    }
  }
}
