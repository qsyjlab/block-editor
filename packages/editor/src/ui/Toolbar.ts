import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
import { EditorCore } from '../core/EditorCore'
import { ToolbarItem } from './toolbar/ToolbarItem'
import { ToolbarDropdown } from './toolbar/ToolbarDropdown'
import { ColorPicker } from './toolbar/color-picker/color-picker'
import { TooltipManager } from './toolbar/TooltipManager'
import { ToolbarRegistry, ToolbarItemType } from './toolbar/ToolbarRegistry'
import { defaultToolbarItems } from './toolbar/defaultToolbarItems'
import { icons } from './toolbar/icons'

export class Toolbar {
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

  constructor(container: HTMLElement, editorCore: EditorCore) {
    this.container = container
    this.editorCore = editorCore
    this.tooltipManager = new TooltipManager() // Initialize TooltipManager
    
    // Initialize default items if registry is empty
    if (ToolbarRegistry.getItems().length === 0) {
      defaultToolbarItems.forEach(group => ToolbarRegistry.registerGroup(group))
    }

    this.render()
  }

  private render() {
    this.container.innerHTML = ''
    this.container.className = 'toolbar'
    // Ensure container handles overflow manually
    this.container.style.overflow = 'hidden' 
    this.container.style.flexWrap = 'nowrap'

    const groups = ToolbarRegistry.getItems()
    const allItems: ToolbarItemType[] = []
    
    groups.forEach((group, index) => {
      allItems.push(...group)
      if (index < groups.length - 1) {
        allItems.push({ type: 'divider' })
      }
    })

    // Create all item elements
    allItems.forEach(item => {
      let element: HTMLElement | null = null
      
      if (item.type === 'button') {
        const component = new ToolbarItem(item, this.editorCore)
        element = component.getElement()
      } else if (item.type === 'dropdown') {
        const component = new ToolbarDropdown(item, this.editorCore)
        element = component.getElement()
      } else if (item.type === 'color') {
        const component = new ColorPicker(item.label, this.editorCore)
        element = component.getElement()
      } else if (item.type === 'divider') {
        element = document.createElement('div')
        element.className = 'divider'
      }

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
    this.moreBtn.className = 'icon-btn'
    this.moreBtn.innerHTML = icons.more || '...'
    this.moreBtn.style.marginLeft = 'auto' // Push to end if possible, though we handle position manually
    this.moreBtn.style.display = 'none' // Hidden by default
    this.moreBtn.dataset.tooltip = 'More'
    
    // Hover logic
    this.moreBtn.addEventListener('mouseenter', () => this.openMoreMenu())
    this.moreBtn.addEventListener('mouseleave', () => this.scheduleCloseMoreMenu())
    
    this.container.appendChild(this.moreBtn)
  }

  private createMoreMenu() {
    this.moreMenu = document.createElement('div')
    this.moreMenu.className = 'toolbar-dropdown-menu' // Reuse dropdown styles
    this.moreMenu.style.display = 'none'
    this.moreMenu.style.flexDirection = 'column'
    this.moreMenu.style.padding = '8px'
    this.moreMenu.style.gap = '4px'
    this.moreMenu.style.maxHeight = '400px'
    this.moreMenu.style.overflowY = 'auto'
    
    // Keep open when hovering menu
    this.moreMenu.addEventListener('mouseenter', () => this.cancelCloseMoreMenu())
    this.moreMenu.addEventListener('mouseleave', () => this.scheduleCloseMoreMenu())
  }

  private openMoreMenu() {
    this.cancelCloseMoreMenu()
    if (this.isMoreMenuOpen) return

    this.isMoreMenuOpen = true
    this.moreBtn.classList.add('active')
    document.body.appendChild(this.moreMenu)
    this.moreMenu.style.display = 'flex'
    
    this.cleanupFloating = autoUpdate(this.moreBtn, this.moreMenu, () => {
        computePosition(this.moreBtn, this.moreMenu, {
            placement: 'bottom-end',
            strategy: 'fixed',
            middleware: [
                offset(4),
                flip(),
                shift({ padding: 5 })
            ]
        }).then(({ x, y }) => {
            Object.assign(this.moreMenu.style, {
                left: `${x}px`,
                top: `${y}px`,
                position: 'fixed',
                zIndex: '10000'
            });
        });
    });
  }

  private scheduleCloseMoreMenu() {
      this.moreMenuTimer = setTimeout(() => this.closeMoreMenu(), 200)
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
    
    if (this.cleanupFloating) {
        this.cleanupFloating()
        this.cleanupFloating = null
    }
    
    if (this.moreMenu.parentElement === document.body) {
        document.body.removeChild(this.moreMenu)
    }
    this.moreMenu.style.display = 'none'
  }

  private checkOverflow() {
    // Reset: Move everything back to container to measure
    this.items.forEach(item => {
        this.container.insertBefore(item, this.moreBtn)
    })
    this.moreBtn.style.display = 'none'
    
    const containerWidth = this.container.clientWidth
    // If containerWidth is 0 (hidden), do nothing
    if (containerWidth === 0) return

    let currentWidth = 0
    let overflowIndex = -1
    const moreBtnWidth = 32 // Approximate width of more button + margin
    const gap = 8 // Gap between items

    // Measure loop
    for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i]
        // Get element width including margin
        const style = window.getComputedStyle(item)
        const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight)
        const itemWidth = item.offsetWidth + margin + gap
        
        // Check if adding this item would overflow
        // If it's the last item, we compare against containerWidth
        // If not last, we need to reserve space for moreBtn in case subsequent items overflow
        const isLast = i === this.items.length - 1
        const availableWidth = isLast ? containerWidth : containerWidth - moreBtnWidth

        if (currentWidth + itemWidth > availableWidth) {
            overflowIndex = i
            break
        }
        currentWidth += itemWidth
    }

    if (overflowIndex !== -1) {
        this.moreBtn.style.display = 'flex'
        // Move overflowing items to moreMenu
        for (let i = overflowIndex; i < this.items.length; i++) {
            this.moreMenu.appendChild(this.items[i])
        }
    } else {
        this.moreBtn.style.display = 'none'
    }
  }
}
