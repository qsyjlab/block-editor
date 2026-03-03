import type { EditorCore } from '../../core/EditorCore'
import { icons } from './icons'
import { ToolbarItemConfig } from './ToolbarRegistry'

export type ToolbarItemProps = ToolbarItemConfig

export class ToolbarItem {
  private element: HTMLElement
  private editorCore: EditorCore
  private props: ToolbarItemProps

  constructor(props: ToolbarItemProps, editorCore: EditorCore) {
    this.props = props
    this.editorCore = editorCore
    this.element = this.render()
    
    this.editorCore.events.on('selectionUpdate', () => this.updateState())
    this.editorCore.events.on('transaction', () => this.updateState())
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private render(): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'icon-btn toolbar-tooltip'
    if (this.props.command) {
        btn.dataset.command = this.props.command
    }
    btn.dataset.tooltip = this.props.label
    if (this.props.shortcut) {
      btn.dataset.shortcut = this.props.shortcut
    }
    
    // Icon
    if (this.props.icon && icons[this.props.icon]) {
      btn.innerHTML = icons[this.props.icon]
    } else {
      btn.textContent = this.props.label.substring(0, 1)
    }

    btn.onclick = () => this.execute()
    return btn
  }

  private execute() {
    // Check if disabled
    if (this.element.hasAttribute('disabled')) {
        return
    }

    // Priority 1: Custom execution handler
    if (this.props.onExecute) {
      this.props.onExecute(this.editorCore)
      return
    }

    // Priority 2: Standard Tiptap command
    if (this.props.command) {
      const chain = this.editorCore.editor.chain().focus()
      const { command, args } = this.props
      
      if (typeof (chain as any)[command] === 'function') {
        if (args) {
          (chain as any)[command](args).run()
        } else {
          (chain as any)[command]().run()
        }
      }
    }
  }

  private updateState() {
    let isActive = false
    let isDisabled = false
    const { command, activeName, args } = this.props

    // Check disabled state
    if (this.props.isDisabled) {
        isDisabled = this.props.isDisabled(this.editorCore.editor)
    } else if (command) {
        // Default check: can execute command?
        // Note: active checks are different from can() checks.
        // Tiptap's can() returns false if command cannot be applied.
        const chain = this.editorCore.editor.can().chain()
        if (typeof (chain as any)[command] === 'function') {
            // isDisabled = !(chain as any)[command](args).run()
            // Using can() properly is tricky because it depends on focus and selection.
            // For now, we rely on explicit isDisabled or assume enabled.
        }
    }

    // Update Disabled UI
    if (isDisabled) {
        this.element.setAttribute('disabled', 'true')
        this.element.classList.add('disabled')
    } else {
        this.element.removeAttribute('disabled')
        this.element.classList.remove('disabled')
    }

    // Priority 1: Custom isActive handler
    if (this.props.isActive) {
      isActive = this.props.isActive(this.editorCore.editor)
    } 
    // Priority 2: activeName config
    else if (activeName) {
      try {
        // Handle object activeName like { textAlign: 'left' }
        if (typeof activeName === 'object') {
           const [key, value] = Object.entries(activeName)[0]
           isActive = this.editorCore.editor.isActive(key, value as any)
        } else {
           isActive = this.editorCore.editor.isActive(activeName as string, args)
        }
      } catch (e) {
         isActive = this.editorCore.editor.isActive(activeName as string, args)
      }
    } 
    // Priority 3: Fallback guess based on command name
    else if (command) {
      const name = command.replace('toggle', '').replace('set', '').toLowerCase()
      const map: Record<string, string> = { 'bold': 'bold', 'italic': 'italic', 'underline': 'underline', 'strike': 'strike', 'code': 'code', 'highlight': 'highlight' }
      const checkName = map[name] || name
      isActive = this.editorCore.editor.isActive(checkName, args)
    }

    if (isActive) {
      this.element.classList.add('active')
    } else {
      this.element.classList.remove('active')
    }
  }
}
