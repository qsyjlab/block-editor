import { Editor } from '@tiptap/core'
import { marked } from 'marked'

type CalloutType = 'info' | 'success' | 'warning' | 'danger'

function normalizeCalloutType(typeRaw: string): CalloutType {
  const upper = typeRaw.toUpperCase()
  if (upper === 'SUCCESS' || upper === 'TIP') return 'success'
  if (upper === 'WARNING' || upper === 'CAUTION') return 'warning'
  if (upper === 'DANGER') return 'danger'
  return 'info'
}

function convertCalloutMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const first = lines[i]
    const match = first.match(/^>\s*\[!(\w+)\]\s*(.*)$/)

    if (!match) {
      output.push(first)
      i += 1
      continue
    }

    const calloutType = normalizeCalloutType(match[1])
    const contentLines: string[] = []

    if (match[2]?.trim()) {
      contentLines.push(match[2])
    }

    i += 1
    while (i < lines.length && /^> ?/.test(lines[i])) {
      contentLines.push(lines[i].replace(/^> ?/, ''))
      i += 1
    }

    const body = contentLines.join('\n').trim()
    const paragraphs = body
      ? body
          .split(/\n{2,}/)
          .map((block) => `<p>${block.trim()}</p>`)
          .join('')
      : '<p></p>'

    output.push(`<div data-callout-type="${calloutType}">${paragraphs}</div>`)
  }

  return output.join('\n')
}

function normalizeMarkdownHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // [indent:N] 前缀 -> data-indent 属性
  doc.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6').forEach((el) => {
    const text = (el.textContent || '').trimStart()
    const match = text.match(/^\[indent:(\d+)\]\s*/i)
    if (!match) return

    const level = Math.max(0, Number(match[1]) || 0)
    if (level > 0) {
      el.setAttribute('data-indent', String(level))
    }

    if (el.firstChild?.nodeType === Node.TEXT_NODE) {
      el.firstChild.textContent = (el.firstChild.textContent || '').replace(
        /^\[indent:\d+\]\s*/i,
        '',
      )
    } else {
      el.textContent = (el.textContent || '').replace(/^\[indent:\d+\]\s*/i, '')
    }
  })

  // 标准 markdown checkbox 列表 -> Tiptap taskList 结构
  doc.querySelectorAll('ul').forEach((ul) => {
    const lis = Array.from(ul.children).filter((el) => el.tagName === 'LI') as HTMLLIElement[]
    if (lis.length === 0) return

    const allTask = lis.every((li) => {
      const first = li.firstElementChild
      return first?.tagName === 'INPUT' && (first as HTMLInputElement).type === 'checkbox'
    })
    if (!allTask) return

    const taskList = doc.createElement('ul')
    taskList.setAttribute('data-type', 'taskList')

    lis.forEach((li) => {
      const checkbox = li.firstElementChild as HTMLInputElement
      const taskItem = doc.createElement('li')
      taskItem.setAttribute('data-type', 'taskItem')
      taskItem.setAttribute('data-checked', checkbox.checked ? 'true' : 'false')

      const paragraph = doc.createElement('p')
      const contentNodes = Array.from(li.childNodes).filter((node, idx) => {
        if (idx === 0 && node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          return !(el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox')
        }
        return true
      })

      contentNodes.forEach((node) => paragraph.appendChild(node.cloneNode(true)))
      taskItem.appendChild(paragraph)
      taskList.appendChild(taskItem)
    })

    ul.replaceWith(taskList)
  })

  // Markdown 表格允许空单元格，但 Tiptap tableCell 需要至少包含一个 block。
  doc.querySelectorAll<HTMLTableCellElement>('td,th').forEach((cell) => {
    if (cell.childNodes.length > 0 && (cell.textContent || '').trim()) return
    if (cell.querySelector('p,ul,ol,blockquote,pre,div')) return

    cell.innerHTML = ''
    cell.appendChild(doc.createElement('p'))
  })

  // Keep the caret out of the last table after Markdown paste/import.
  // Without a trailing block, ProseMirror can leave an active cell selection,
  // which makes the inline toolbar appear immediately after paste.
  doc.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    if (table.nextElementSibling) return
    table.after(doc.createElement('p'))
  })

  return doc.body.innerHTML
}

export function markdownToEditorHtml(markdown: string): string {
  const withCalloutHtml = convertCalloutMarkdownToHtml(markdown)
  const html = marked.parse(withCalloutHtml, { gfm: true, breaks: true }) as string
  return normalizeMarkdownHtml(html)
}

export class MarkdownImporter {
  private fileInput: HTMLInputElement

  constructor(private editor: Editor) {
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = '.md,.markdown,text/markdown'
    this.fileInput.style.display = 'none'
    this.fileInput.setAttribute('aria-hidden', 'true')
    document.body.appendChild(this.fileInput)

    this.fileInput.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        await this.import(files[0])
      }
      this.fileInput.value = ''
    })
  }

  public triggerImport() {
    this.fileInput.click()
  }

  public async import(file: File) {
    const markdown = await file.text()
    this.importText(markdown)
  }

  public importText(markdown: string) {
    try {
      this.editor.commands.setContent(markdownToEditorHtml(markdown), true)
    } catch (error) {
      console.error('Markdown import failed:', error)
      alert('导入 Markdown 失败，请检查内容格式。')
    }
  }

  public destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput)
    }
  }
}
