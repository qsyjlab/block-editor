import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
import { EditorCore } from '../../../core/EditorCore'
import { icons } from '../icons'
import { STANDARD_COLORS } from './color-palette'
import { ColorSpectrum } from './color-spectrum'

export class ColorPicker {
  private element: HTMLElement
  private trigger: HTMLElement
  private dropdown: HTMLElement
  private editorCore: EditorCore
  private label: string
  private isOpen = false
  private cleanupFloating: (() => void) | null = null
  private spectrum: ColorSpectrum | null = null

  constructor(label: string, editorCore: EditorCore) {
    this.label = label
    this.editorCore = editorCore
    this.element = this.render()
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen) {
        if (!this.dropdown.contains(e.target as Node) && !this.element.contains(e.target as Node)) {
          this.close()
        }
      }
    })
  }

  getElement() {
    return this.element
  }

  private render() {
    const wrapper = document.createElement('div')
    wrapper.style.position = 'relative'

    // Trigger
    this.trigger = document.createElement('div')
    this.trigger.className = 'color-picker-trigger'
    this.trigger.dataset.tooltip = this.label
    
    const iconSpan = document.createElement('span')
    iconSpan.className = 'color-picker-icon'
    iconSpan.textContent = 'A'
    
    const colorBar = document.createElement('div')
    colorBar.className = 'color-picker-bar'
    
    const arrow = document.createElement('div')
    arrow.innerHTML = icons.chevronDown
    arrow.style.width = '10px'
    arrow.style.marginLeft = '2px'
    arrow.style.display = 'flex'

    this.trigger.appendChild(iconSpan)
    this.trigger.appendChild(colorBar)
    this.trigger.appendChild(arrow)

    this.trigger.onclick = (e) => {
        e.stopPropagation()
        this.toggle()
    }

    // Dropdown
    this.dropdown = document.createElement('div')
    this.dropdown.className = 'color-picker-dropdown'
    
    // 1. No Color Section
    const noColorSection = document.createElement('div')
    noColorSection.className = 'color-picker-section'
    const noColorBtn = document.createElement('div')
    noColorBtn.className = 'color-action-item'
    noColorBtn.innerHTML = '<div class="no-color-icon"></div><span>No Color</span>'
    noColorBtn.onclick = () => {
        this.editorCore.editor.chain().focus().unsetColor().run()
        colorBar.style.backgroundColor = '#000' // Reset to black
        this.close()
    }
    noColorSection.appendChild(noColorBtn)
    
    // 2. Standard Colors
    const paletteSection = document.createElement('div')
    paletteSection.className = 'color-picker-section'
    const title = document.createElement('span')
    title.className = 'color-picker-title'
    title.textContent = 'Standard Colors'
    paletteSection.appendChild(title)
    
    const grid = document.createElement('div')
    grid.className = 'color-grid'
    STANDARD_COLORS.forEach(color => {
        const item = document.createElement('div')
        item.className = 'color-item'
        item.style.backgroundColor = color
        item.onclick = (e) => {
            e.stopPropagation()
            this.setColor(color)
        }
        grid.appendChild(item)
    })
    paletteSection.appendChild(grid)

    // 3. More Colors Trigger
    const moreSection = document.createElement('div')
    moreSection.className = 'color-picker-section'
    const moreBtn = document.createElement('div')
    moreBtn.className = 'color-action-item more-colors-trigger'
    moreBtn.innerHTML = '<span>More Colors...</span>' + icons.chevronDown
    moreBtn.onclick = (e) => {
        e.stopPropagation()
        this.showSpectrum(moreSection)
    }
    moreSection.appendChild(moreBtn)

    this.dropdown.appendChild(noColorSection)
    this.dropdown.appendChild(paletteSection)
    this.dropdown.appendChild(moreSection)

    wrapper.appendChild(this.trigger)
    // Dropdown appended to body on open
    
    return wrapper
  }

  private toggle() {
      if (this.isOpen) this.close()
      else this.open()
  }

  private open() {
      this.isOpen = true
      this.trigger.classList.add('active')
      document.body.appendChild(this.dropdown)
      this.dropdown.classList.add('open')
      
      this.cleanupFloating = autoUpdate(this.trigger, this.dropdown, () => {
          computePosition(this.trigger, this.dropdown, {
              placement: 'bottom-start',
              strategy: 'fixed',
              middleware: [offset(4), flip(), shift({ padding: 5 })]
          }).then(({ x, y }) => {
              Object.assign(this.dropdown.style, {
                  left: `${x}px`,
                  top: `${y}px`,
                  position: 'fixed'
              })
          })
      })
  }

  private close() {
      this.isOpen = false
      this.trigger.classList.remove('active')
      this.dropdown.classList.remove('open')
      if (this.cleanupFloating) {
          this.cleanupFloating()
          this.cleanupFloating = null
      }
      if (this.dropdown.parentElement === document.body) {
          document.body.removeChild(this.dropdown)
      }
      // Reset spectrum
      if (this.spectrum) {
          const container = this.dropdown.lastChild as HTMLElement
          if (container.contains(this.spectrum.getElement())) {
              container.removeChild(this.spectrum.getElement())
              this.spectrum = null
          }
      }
  }

  private setColor(color: string) {
      this.editorCore.editor.chain().focus().setColor(color).run()
      const bar = this.trigger.querySelector('.color-picker-bar') as HTMLElement
      if (bar) bar.style.backgroundColor = color
      this.close()
  }

  private showSpectrum(container: HTMLElement) {
      if (this.spectrum) return // Already shown
      
      this.spectrum = new ColorSpectrum((color) => {
          this.editorCore.editor.chain().focus().setColor(color).run()
          const bar = this.trigger.querySelector('.color-picker-bar') as HTMLElement
          if (bar) bar.style.backgroundColor = color
      })
      container.appendChild(this.spectrum.getElement())
  }
}
