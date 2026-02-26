import { icons } from '../ui/toolbar/icons'

// Common programming languages
const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'html', 'css', 'json', 'java', 'python', 
  'go', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin', 'sql', 
  'shell', 'yaml', 'xml', 'markdown'
]

export class CodeBlockView {
  dom: HTMLElement
  contentDOM: HTMLElement
  node: any
  updateAttributes: (attrs: any) => void
  extension: any
  getPos: () => number
  editor: any

  private langSelect: HTMLElement
  private langDropdown: HTMLElement
  private wrapBtn: HTMLElement
  private contentWrapper: HTMLElement

  constructor(node: any, _view: any, getPos: () => number, _validations: any, editor: any) {
    this.node = node
    this.getPos = getPos
    this.editor = editor
    this.updateAttributes = (attrs) => {
      const pos = getPos()
      if (pos === undefined) return
      
      const tr = editor.view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, ...attrs })
      editor.view.dispatch(tr)
    }

    this.dom = document.createElement('div')
    this.dom.className = 'code-block-wrapper'

    // Header
    const header = document.createElement('div')
    header.className = 'code-block-header'
    header.contentEditable = 'false'

    // Header Left
    const left = document.createElement('div')
    left.className = 'code-block-header-left'
    
    // Collapse Icon
    const arrow = document.createElement('span')
    arrow.className = 'code-block-collapse-icon'
    arrow.innerHTML = icons.chevronDown
    arrow.style.width = '14px'
    arrow.style.height = '14px'
    arrow.style.display = 'flex'
    arrow.style.cursor = 'pointer'
    arrow.style.transition = 'transform 0.2s'
    
    // Toggle Collapse
    arrow.onclick = (e) => {
        e.stopPropagation() // Prevent selection
        this.toggleCollapse()
    }
    
    const label = document.createElement('span')
    label.textContent = 'Code Block'

    left.appendChild(arrow)
    left.appendChild(label)

    // Header Right
    const right = document.createElement('div')
    right.className = 'code-block-header-right'

    // Language Selector
    const langContainer = document.createElement('div')
    langContainer.style.position = 'relative'

    this.langSelect = document.createElement('div')
    this.langSelect.className = 'code-block-lang-select'
    
    // Create static structure for langSelect to avoid innerHTML replacements causing event target issues
    const langSpan = document.createElement('span')
    langSpan.className = 'lang-name'
    const iconSpan = document.createElement('span')
    iconSpan.className = 'lang-icon'
    iconSpan.innerHTML = icons.chevronDown
    iconSpan.style.display = 'flex'
    
    this.langSelect.appendChild(langSpan)
    this.langSelect.appendChild(iconSpan)

    this.updateLangLabel()
    
    this.langSelect.onclick = (e) => {
        e.stopPropagation()
        this.toggleLangDropdown()
    }

    this.langDropdown = document.createElement('div')
    this.langDropdown.className = 'lang-dropdown-menu'
    
    // Search Input
    const searchInput = document.createElement('input')
    searchInput.className = 'lang-search-input'
    searchInput.placeholder = 'Search language...'
    searchInput.onclick = (e) => e.stopPropagation()
    searchInput.oninput = (e) => this.filterLanguages((e.target as HTMLInputElement).value)

    const langList = document.createElement('div')
    langList.className = 'lang-list'
    this.renderLangList(langList)

    this.langDropdown.appendChild(searchInput)
    this.langDropdown.appendChild(langList)
    langContainer.appendChild(this.langSelect)
    langContainer.appendChild(this.langDropdown)

    // Wrap Toggle
    this.wrapBtn = document.createElement('button')
    this.wrapBtn.className = 'code-block-action-btn'
    this.wrapBtn.title = 'Toggle Wrap'
    this.wrapBtn.innerHTML = `<span>Wrap</span>${icons.wrap}`
    this.wrapBtn.onclick = () => this.toggleWrap()

    // Copy Button
    const copyBtn = document.createElement('button')
    copyBtn.className = 'code-block-action-btn'
    copyBtn.title = 'Copy'
    copyBtn.innerHTML = `<span>Copy</span>${icons.copy}`
    copyBtn.onclick = () => this.copyCode()

    right.appendChild(langContainer)
    right.appendChild(this.wrapBtn)
    right.appendChild(copyBtn)

    header.appendChild(left)
    header.appendChild(right)

    // Content
    this.contentWrapper = document.createElement('div')
    this.contentWrapper.className = 'code-block-content'
    
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    this.contentDOM = code
    pre.appendChild(code)
    this.contentWrapper.appendChild(pre)

    this.dom.appendChild(header)
    this.dom.appendChild(this.contentWrapper)

    // Close dropdown on click outside
    const clickHandler = (e: MouseEvent) => {
        const target = e.target as Node
        // Check if click is inside container OR if target is no longer in document (handle DOM updates)
        if (langContainer.contains(target) || !document.body.contains(target)) {
            return
        }
        this.langDropdown.classList.remove('show')
    }
    document.addEventListener('click', clickHandler)
    this.clickHandler = clickHandler
  }

  private clickHandler: ((e: MouseEvent) => void) | null = null

  update(node: any) {
    if (node.type !== this.node.type) {
      return false
    }
    this.node = node
    this.updateLangLabel()
    // Re-render language list to update active state
    const list = this.langDropdown.querySelector('.lang-list') as HTMLElement
    if (list) {
        // Keep current filter if input has value
        const input = this.langDropdown.querySelector('input')
        const filter = input ? input.value : ''
        this.renderLangList(list, filter)
    }
    return true
  }

  ignoreMutation(mutation: MutationRecord | { type: 'selection'; target: Element }) {
    // Ignore mutations that happen outside the contentDOM (i.e., in the header/UI)
    // This prevents ProseMirror from re-rendering the component when we update UI classes
    if (!this.contentDOM.contains(mutation.target) && this.dom.contains(mutation.target)) {
      return true
    }
    return false
  }

  stopEvent(event: Event) {
    // Prevent ProseMirror from handling events in the dropdown (like typing in the search input)
    if (this.langDropdown.contains(event.target as Node)) {
      return true
    }
    return false
  }

  private updateLangLabel() {
    const lang = this.node.attrs.language || 'auto'
    const span = this.langSelect.querySelector('.lang-name')
    if (span) {
        span.textContent = lang
    }
  }

  private toggleLangDropdown() {
    this.langDropdown.classList.toggle('show')
    if (this.langDropdown.classList.contains('show')) {
        const input = this.langDropdown.querySelector('input')
        if (input) input.focus()
    }
  }

  private renderLangList(container: HTMLElement, filter = '') {
    container.innerHTML = ''
    LANGUAGES.filter(l => l.toLowerCase().includes(filter.toLowerCase())).forEach(lang => {
        const item = document.createElement('div')
        item.className = 'lang-item'
        item.textContent = lang
        if (lang === (this.node.attrs.language || 'plaintext')) {
            item.classList.add('active')
            item.innerHTML += icons.check
        }
        item.onclick = (e) => {
            e.stopPropagation()
            this.updateAttributes({ language: lang })
            this.langDropdown.classList.remove('show')
        }
        container.appendChild(item)
    })
  }

  private filterLanguages(text: string) {
      const list = this.langDropdown.querySelector('.lang-list') as HTMLElement
      if (list) this.renderLangList(list, text)
  }

  private toggleCollapse() {
      const isCollapsed = this.contentWrapper.style.display === 'none'
      this.contentWrapper.style.display = isCollapsed ? 'block' : 'none'
      
      // Rotate arrow
      const arrow = this.dom.querySelector('.code-block-collapse-icon') as HTMLElement
      if (arrow) {
          arrow.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)'
      }
  }

  private toggleWrap() {
      const isWrapped = this.contentWrapper.classList.contains('wrap-text')
      if (isWrapped) {
          this.contentWrapper.classList.remove('wrap-text')
          this.wrapBtn.classList.remove('active')
      } else {
          this.contentWrapper.classList.add('wrap-text')
          this.wrapBtn.classList.add('active')
      }
  }

  private copyCode() {
      const text = this.node.textContent
      navigator.clipboard.writeText(text).then(() => {
          // Show feedback?
          // For now, assume success
      })
  }

  destroy() {
      if (this.clickHandler) {
          document.removeEventListener('click', this.clickHandler)
      }
  }
}
