import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
import { EditorCore } from '../../core/EditorCore'
import { icons } from './icons'
import { ToolbarDropdownConfig, DropdownOptionConfig } from './ToolbarRegistry'

export type ToolbarDropdownProps = ToolbarDropdownConfig

export class ToolbarDropdown {
  private element: HTMLElement
  private trigger!: HTMLElement
  private menu!: HTMLElement
  private editorCore: EditorCore
  private props: ToolbarDropdownProps
  private isOpen: boolean = false
  private cleanupFloating: (() => void) | null = null

  constructor(props: ToolbarDropdownProps, editorCore: EditorCore) {
    this.props = props
    this.editorCore = editorCore
    this.element = this.render()
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      // If menu is in body, we need to check if click is inside menu or trigger
      if (this.isOpen) {
         const isClickInsideMenu = this.menu.contains(e.target as Node);
         const isClickInsideTrigger = this.element.contains(e.target as Node);
         
         if (!isClickInsideMenu && !isClickInsideTrigger) {
             this.close();
         }
      }
    })
    
    // Listen for updates to update trigger label if needed
    this.editorCore.events.on('selectionUpdate', () => this.updateLabel())
    this.editorCore.events.on('transaction', () => this.updateLabel())
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private render(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'toolbar-dropdown-wrapper'
    
    // Trigger
    this.trigger = document.createElement('button')
    this.trigger.className = 'toolbar-dropdown-trigger'
    if (this.props.label) {
        this.trigger.dataset.tooltip = this.props.label // Add tooltip
    }
    if (this.props.width) this.trigger.style.width = this.props.width
    
    const labelSpan = document.createElement('span')
    labelSpan.className = 'dropdown-label'
    
    // Initial content
    if (this.props.icon && icons[this.props.icon]) {
        labelSpan.innerHTML = icons[this.props.icon]
    } else {
        labelSpan.textContent = this.props.label
    }

    labelSpan.style.whiteSpace = 'nowrap'
    labelSpan.style.overflow = 'hidden'
    labelSpan.style.textOverflow = 'ellipsis'
    labelSpan.style.marginRight = '4px'
    labelSpan.style.flex = '1'
    labelSpan.style.textAlign = 'left'
    labelSpan.style.display = 'flex'
    labelSpan.style.alignItems = 'center'
    this.trigger.appendChild(labelSpan)
    
    const iconSpan = document.createElement('span')
    iconSpan.style.display = 'flex'
    iconSpan.style.flexShrink = '0' // Prevent icon from shrinking
    iconSpan.innerHTML = icons.chevronDown
    this.trigger.appendChild(iconSpan)

    this.trigger.onclick = (e) => {
      e.stopPropagation()
      this.toggle()
    }

    // Menu (Created but not attached yet, or hidden)
    this.menu = document.createElement('div')
    this.menu.className = 'toolbar-dropdown-menu'
    this.menu.style.display = 'none' // Ensure hidden initially
    
    if (this.props.layout === 'row') {
      this.menu.style.display = 'none' // Override previous setting, ensure consistent hidden state
      this.menu.style.flexDirection = 'row'
      this.menu.style.padding = '4px'
      this.menu.style.gap = '4px'
    }

    this.props.options.forEach(opt => {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      
      // If icon is present, show icon
      if (opt.icon && icons[opt.icon]) {
        item.innerHTML = icons[opt.icon]
        item.classList.add('icon-item')
        item.title = opt.label // Add tooltip
        item.dataset.tooltip = opt.label // Use TooltipManager
        item.style.display = 'flex'
        item.style.alignItems = 'center'
        item.style.justifyContent = 'center'
        item.style.padding = '4px'
        item.style.minWidth = '28px'
        item.style.minHeight = '28px'
      } else {
        item.textContent = opt.label
      }

      // Check option disabled state
      if (opt.isDisabled) {
          const isDisabled = opt.isDisabled(this.editorCore.editor)
          if (isDisabled) {
            item.setAttribute('disabled', 'true')
            item.classList.add('disabled')
            item.style.opacity = '0.5'
            item.style.pointerEvents = 'none'
          }
      }

      item.onclick = (e) => {
        e.stopPropagation()
        // Trigger tooltip hide immediately before element removal
        const tooltipEvent = new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: document.body // Simulate moving to body
        });
        item.dispatchEvent(tooltipEvent);
        
        this.execute(opt)
        this.close()
      }
      this.menu.appendChild(item)
    })

    wrapper.appendChild(this.trigger)
    // Do NOT append menu to wrapper initially. It will be portaled to body on open.
    // wrapper.appendChild(this.menu) 
    return wrapper
  }

  private toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private open() {
    this.isOpen = true
    this.element.classList.add('open')
    
    // Portal logic: Move menu to body to avoid overflow issues
    document.body.appendChild(this.menu)
    
    // Re-render menu items to update disabled state
    this.menu.innerHTML = ''
    if (this.props.layout === 'row') {
      this.menu.style.display = 'flex'
      this.menu.style.flexDirection = 'row'
      this.menu.style.padding = '4px'
      this.menu.style.gap = '4px'
    } else {
      this.menu.style.display = 'block'
    }

    this.props.options.forEach(opt => {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      
      // If icon is present, show icon
      if (opt.icon && icons[opt.icon]) {
        item.innerHTML = icons[opt.icon]
        item.classList.add('icon-item')
        item.title = opt.label // Add tooltip
        item.dataset.tooltip = opt.label // Use TooltipManager
        item.style.display = 'flex'
        item.style.alignItems = 'center'
        item.style.justifyContent = 'center'
        item.style.padding = '4px'
        item.style.minWidth = '28px'
        item.style.minHeight = '28px'
      } else {
        item.textContent = opt.label
      }

      // Check option disabled state
      if (opt.isDisabled) {
          const isDisabled = opt.isDisabled(this.editorCore.editor)
          if (isDisabled) {
            item.setAttribute('disabled', 'true')
            item.classList.add('disabled')
            item.style.opacity = '0.5'
            item.style.pointerEvents = 'none'
          }
      }

      item.onclick = (e) => {
        e.stopPropagation()
        // Trigger tooltip hide immediately before element removal
        const tooltipEvent = new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            relatedTarget: document.body // Simulate moving to body
        });
        item.dispatchEvent(tooltipEvent);

        this.execute(opt)
        this.close()
      }
      this.menu.appendChild(item)
    })
    
    // Floating UI setup
    this.cleanupFloating = autoUpdate(this.trigger, this.menu, () => {
        computePosition(this.trigger, this.menu, {
            placement: 'bottom-start',
            strategy: 'fixed',
            middleware: [
                offset(4),
                flip(),
                shift({ padding: 5 })
            ]
        }).then(({ x, y }) => {
            Object.assign(this.menu.style, {
                left: `${x}px`,
                top: `${y}px`,
                position: 'fixed', // Floating UI works best with fixed for portals
                zIndex: '10000'
            });
        });
    });
  }

  private close() {
    this.isOpen = false
    this.element.classList.remove('open')
    
    if (this.cleanupFloating) {
        this.cleanupFloating();
        this.cleanupFloating = null;
    }

    // Remove from body
    if (this.menu.parentElement === document.body) {
        document.body.removeChild(this.menu)
    }
    this.menu.style.display = 'none'
  }

  private execute(opt: DropdownOptionConfig) {
    const chain = this.editorCore.editor.chain().focus()
    if (typeof (chain as any)[opt.command] === 'function') {
      if (opt.args) {
        (chain as any)[opt.command](opt.args).run()
      } else {
        (chain as any)[opt.command]().run()
      }
    }
  }

  private updateLabel() {
    // Check Disabled State for the main trigger
    if (this.props.isDisabled) {
        const disabled = this.props.isDisabled(this.editorCore.editor)
        if (disabled) {
            this.trigger.setAttribute('disabled', 'true')
            this.trigger.classList.add('disabled')
        } else {
            this.trigger.removeAttribute('disabled')
            this.trigger.classList.remove('disabled')
        }
    }

    // Logic to update label based on current selection
    let activeOption = this.props.options.find(opt => {
      // Priority 1: Custom isActive handler
      if (opt.isActive) {
        return opt.isActive(this.editorCore.editor)
      }

      // Priority 2: Fallback guess based on command
      const command = opt.command
      const name = command.replace('toggle', '').replace('set', '').toLowerCase()
      
      return this.editorCore.editor.isActive(name, opt.args)
    })
    
    // ... rest of the function

    const labelEl = this.trigger.querySelector('.dropdown-label') as HTMLElement
    if (labelEl) {
      if (activeOption) {
        if (activeOption.icon && icons[activeOption.icon]) {
            labelEl.innerHTML = icons[activeOption.icon]
        } else {
            labelEl.textContent = activeOption.label
        }
      } else {
        // If no option is active, show the default label from props
        // If group has an icon, show that instead of text label
        if (this.props.icon && icons[this.props.icon]) {
            labelEl.innerHTML = icons[this.props.icon]
        } else {
            labelEl.textContent = this.props.label
        }
      }
    }
  }
}
