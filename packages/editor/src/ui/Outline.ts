import { EditorCore } from '../core/EditorCore'

export class Outline {
  private container: HTMLElement
  private editorCore: EditorCore

  constructor(container: HTMLElement, editorCore: EditorCore) {
    this.container = container
    this.editorCore = editorCore
    
    this.editorCore.events.on('update', () => this.render())
    this.render()
  }

  private render() {
    this.container.innerHTML = '<h3>Outline</h3>'
    const headings: { level: number, text: string, pos: number }[] = []
    
    this.editorCore.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          level: node.attrs.level,
          text: node.textContent,
          pos
        })
      }
    })

    if (headings.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'No headings'
      empty.style.color = '#999'
      empty.style.fontSize = '12px'
      this.container.appendChild(empty)
      return
    }

    const list = document.createElement('ul')
    list.style.listStyle = 'none'
    list.style.padding = '0'
    
    headings.forEach(h => {
      const li = document.createElement('li')
      li.textContent = h.text
      li.style.paddingLeft = `${(h.level - 1) * 12}px`
      li.style.fontSize = '14px'
      li.style.cursor = 'pointer'
      li.style.marginBottom = '4px'
      li.style.color = '#666'
      
      li.onclick = () => {
        // Scroll logic would go here, simple version: set selection
        this.editorCore.editor.chain().setTextSelection(h.pos + 1).scrollIntoView().run()
      }

      list.appendChild(li)
    })

    this.container.appendChild(list)
  }
}
