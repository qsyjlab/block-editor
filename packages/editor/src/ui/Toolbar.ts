import { computePosition, flip, shift, offset, autoUpdate, hide } from '@floating-ui/dom'
import { EditorCore } from '../core/EditorCore'
import { TooltipManager } from './toolbar/TooltipManager'
import { ToolbarItemType } from './toolbar/ToolbarRegistry'
import { resolveToolbarGroups, type ToolbarConfig } from './config/operation-bars'
import { icons } from './toolbar/icons'
import { createToolbarItemElement, flattenToolbarGroups } from './toolbar/item-factory'
import { resolveEditorI18n } from '../i18n'
import type { EditorI18n } from '../i18n'

export class Toolbar {
  private static instanceCount = 0

  private container: HTMLElement
  private editorCore: EditorCore
  // @ts-ignore
  private tooltipManager: TooltipManager

  private items: HTMLElement[] = []
  private moreBtn!: HTMLElement
  private moreMenu!: HTMLElement
  private resizeObserver!: ResizeObserver

  private isMoreMenuOpen = false
  private cleanupFloating: (() => void) | null = null
  private moreMenuTimer: any = null
  private readonly moreMenuOwnerId: string
  private readonly i18n: EditorI18n
  private readonly groups: ToolbarItemType[][]
  private readonly overlayHost: HTMLElement
  private readonly handleDocumentPointerDown = (event: Event) => {
    const target = event.target as Node | null
    if (!target || !this.isMoreMenuOpen) return
    if (this.moreBtn.contains(target) || this.moreMenu.contains(target)) return
    this.closeMoreMenu()
  }
  private readonly handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isMoreMenuOpen) {
      this.closeMoreMenu()
    }
  }

  constructor(
    container: HTMLElement,
    editorCore: EditorCore,
    i18nInput?: string | Partial<EditorI18n> | null,
    config?: ToolbarConfig,
  ) {
    this.container = container
    this.editorCore = editorCore
    this.i18n = resolveEditorI18n(i18nInput || this.editorCore.i18n)
    this.tooltipManager = new TooltipManager() // Initialize TooltipManager
    this.moreMenuOwnerId = `be-more-${++Toolbar.instanceCount}`
    this.overlayHost = this.resolveOverlayHost()

    this.groups = resolveToolbarGroups(this.i18n, config)

    this.render()
  }

  private resolveOverlayHost(): HTMLElement {
    const host =
      (this.container.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (this.container.closest('[data-be-ui-root="true"]') as HTMLElement | null)
    return host || document.body
  }

  private render() {
    this.container.innerHTML = ''
    this.container.className = 'toolbar'
    // Ensure container handles overflow manually
    this.container.style.overflow = 'hidden'
    this.container.style.flexWrap = 'nowrap'

    const allItems: ToolbarItemType[] = flattenToolbarGroups(this.groups)

    // Create all item elements
    allItems.forEach((item) => {
      const element = createToolbarItemElement(item, this.editorCore)

      if (element) {
        this.items.push(element)
        this.container.appendChild(element)
      }
    })

    // Create More Button
    this.createMoreButton()

    // Create More Menu
    this.createMoreMenu()

    // Initialize ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      // Debounce or requestAnimationFrame could be used, but for now direct call
      requestAnimationFrame(() => this.checkOverflow())
    })
    this.resizeObserver.observe(this.container)

    // Initial check
    requestAnimationFrame(() => this.checkOverflow())
  }

  private createMoreButton() {
    this.moreBtn = document.createElement('button')
    this.moreBtn.className = 'icon-btn more-btn'
    this.moreBtn.innerHTML = icons.more || '...'
    // this.moreBtn.style.marginLeft = "auto"; // Push to end if possible, though we handle position manually
    this.moreBtn.style.display = 'none' // Hidden by default
    this.moreBtn.dataset.tooltip = this.i18n.toolbar.more

    this.moreBtn.addEventListener('mousedown', (event) => event.stopPropagation())
    this.moreBtn.addEventListener('click', (event) => {
      event.stopPropagation()
      if (this.isMoreMenuOpen) {
        this.closeMoreMenu()
      } else {
        this.openMoreMenu()
      }
    })

    this.container.appendChild(this.moreBtn)
  }

  private createMoreMenu() {
    this.moreMenu = document.createElement('div')
    this.moreMenu.className = 'toolbar-dropdown-menu toolbar-more-menu' // Reuse dropdown styles
    this.moreMenu.dataset.beMoreId = this.moreMenuOwnerId
    this.moreMenu.style.display = 'none'
    this.moreMenu.style.flexDirection = 'row' // Horizontal layout
    this.moreMenu.style.flexWrap = 'wrap' // Allow wrapping if needed, but horizontal is key
    this.moreMenu.style.alignItems = 'center'
    this.moreMenu.style.padding = '8px'
    this.moreMenu.style.gap = '4px'
    // this.moreMenu.style.maxWidth = '300px' // Removed static limit
    this.moreMenu.style.maxHeight = '400px'
    this.moreMenu.style.overflowY = 'auto'

    // Keep open when hovering menu
    this.moreMenu.addEventListener('mouseenter', () => this.cancelCloseMoreMenu())
    this.moreMenu.addEventListener('mouseleave', () => {
      this.scheduleCloseMoreMenu()
    })
  }

  private openMoreMenu() {
    this.cancelCloseMoreMenu()
    if (this.isMoreMenuOpen) return

    this.isMoreMenuOpen = true
    this.moreBtn.classList.add('active')
    this.moreBtn.removeAttribute('data-tooltip')
    document.addEventListener('mousedown', this.handleDocumentPointerDown)
    document.addEventListener('touchstart', this.handleDocumentPointerDown, {
      passive: true,
    })
    document.addEventListener('keydown', this.handleDocumentKeydown)
    this.overlayHost.appendChild(this.moreMenu)
    this.moreMenu.style.display = 'flex'

    // Update maxWidth dynamically based on container width
    const toolbarWidth = this.container.getBoundingClientRect().width
    this.moreMenu.style.maxWidth = `${Math.min(toolbarWidth, window.innerWidth - 20)}px` // Safe margin

    this.cleanupFloating = autoUpdate(this.moreBtn, this.moreMenu, () => {
      // Check visibility
      if (!this.moreBtn.isConnected || this.moreBtn.offsetParent === null) {
        this.closeMoreMenu()
        return
      }

      computePosition(this.moreBtn, this.moreMenu, {
        placement: 'bottom-end',
        strategy: 'fixed',
        middleware: [
          offset(8), // Increased offset
          flip(),
          shift({ padding: 5 }),
          hide(),
        ],
      }).then(({ x, y, middlewareData }) => {
        if (middlewareData.hide?.referenceHidden) {
          this.closeMoreMenu()
          return
        }

        Object.assign(this.moreMenu.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: 'fixed',
          zIndex: '10000',
          display: 'flex', // Ensure display flex is kept
        })
      })
    })
  }

  private scheduleCloseMoreMenu() {
    this.moreMenuTimer = setTimeout(() => {
      const relatedSubmenus = Array.from(
        document.querySelectorAll<HTMLElement>(
          `.toolbar-dropdown-menu[data-owner-in-more="true"][data-owner-more-id="${this.moreMenuOwnerId}"]`,
        ),
      )

      const isAnyRelatedSubmenuActive = relatedSubmenus.some(
        (submenu) =>
          submenu.matches(':hover') || submenu.contains(document.activeElement as Node | null),
      )

      if (
        this.moreBtn.matches(':hover') ||
        this.moreMenu.matches(':hover') ||
        isAnyRelatedSubmenuActive
      ) {
        return
      }

      this.closeMoreMenu()
    }, 200)
  }

  private cancelCloseMoreMenu() {
    if (this.moreMenuTimer) {
      clearTimeout(this.moreMenuTimer)
      this.moreMenuTimer = null
    }
  }

  private closeMoreMenu() {
    this.isMoreMenuOpen = false
    this.moreBtn.classList.remove('active')
    this.moreBtn.dataset.tooltip = this.i18n.toolbar.more
    document.removeEventListener('mousedown', this.handleDocumentPointerDown)
    document.removeEventListener('touchstart', this.handleDocumentPointerDown)
    document.removeEventListener('keydown', this.handleDocumentKeydown)

    if (this.cleanupFloating) {
      this.cleanupFloating()
      this.cleanupFloating = null
    }

    if (this.moreMenu.parentElement === this.overlayHost) {
      this.overlayHost.removeChild(this.moreMenu)
    }
    this.moreMenu.style.display = 'none'
  }

  private checkOverflow() {
    // Reset: Move everything back to container to measure
    this.items.forEach((item) => {
      this.container.insertBefore(item, this.moreBtn)
    })
    this.moreBtn.style.display = 'none'

    // Get container computed style for accurate measurements
    const containerStyle = window.getComputedStyle(this.container)
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0
    const gap = parseFloat(containerStyle.gap) || 0

    // Available width for items is clientWidth minus padding
    const availableContainerWidth = this.container.clientWidth - paddingLeft - paddingRight

    // If containerWidth is 0 (hidden), do nothing
    if (this.container.clientWidth === 0) return

    let currentWidth = 0
    let overflowIndex = -1
    const moreBtnWidth = 32 // Approximate width of more button + margin

    // Measure loop
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]
      // Get element width including margin
      const style = window.getComputedStyle(item)
      const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight)
      // Item takes up its width + margin
      let itemSpace = item.offsetWidth + margin

      // Add gap if it's not the first item
      if (i > 0) {
        itemSpace += gap
      }

      // Check if adding this item would overflow
      // If it's the last item, we compare against availableContainerWidth
      // If not last, we need to reserve space for moreBtn (plus a gap before it)
      const isLast = i === this.items.length - 1
      const spaceNeededForMoreBtn = moreBtnWidth + gap
      const maxAllowedWidth = isLast
        ? availableContainerWidth
        : availableContainerWidth - spaceNeededForMoreBtn

      if (currentWidth + itemSpace > maxAllowedWidth) {
        overflowIndex = i
        break
      }
      currentWidth += itemSpace
    }

    if (overflowIndex !== -1) {
      let startIndex = overflowIndex
      while (
        startIndex < this.items.length &&
        this.items[startIndex].classList.contains('divider')
      ) {
        startIndex += 1
      }

      if (startIndex >= this.items.length) {
        if (this.isMoreMenuOpen) this.closeMoreMenu()
        this.moreBtn.style.display = 'none'
        return
      }

      this.moreBtn.style.display = 'flex'
      // Move overflowing items to moreMenu
      for (let i = startIndex; i < this.items.length; i++) {
        this.moreMenu.appendChild(this.items[i])
      }
    } else {
      if (this.isMoreMenuOpen) this.closeMoreMenu()
      this.moreBtn.style.display = 'none'
    }
  }
}
