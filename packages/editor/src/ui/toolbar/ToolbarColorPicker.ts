import { EditorCore } from '../../core/EditorCore'

export class ToolbarColorPicker {
  private element: HTMLElement
  private editorCore: EditorCore
  private label: string

  constructor(label: string, editorCore: EditorCore) {
    this.label = label
    this.editorCore = editorCore
    this.element = this.render()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private render(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'color-picker-wrapper toolbar-tooltip'
    wrapper.dataset.tooltip = this.label

    const input = document.createElement('input')
    input.type = 'color'
    input.className = 'color-input'
    
    const label = document.createElement('span')
    label.textContent = 'A'
    label.style.fontWeight = 'bold'
    label.style.fontSize = '14px'
    label.style.pointerEvents = 'none' 
    
    // Bottom bar to show current color?
    const colorBar = document.createElement('div')
    colorBar.style.position = 'absolute'
    colorBar.style.bottom = '4px'
    colorBar.style.left = '6px'
    colorBar.style.right = '6px'
    colorBar.style.height = '3px'
    colorBar.style.backgroundColor = 'var(--text-color)'
    
    input.oninput = (e) => {
      const color = (e.target as HTMLInputElement).value
      this.editorCore.editor.chain().focus().setColor(color).run()
      colorBar.style.backgroundColor = color
    }

    wrapper.appendChild(input)
    wrapper.appendChild(label)
    wrapper.appendChild(colorBar)
    return wrapper
  }
}
