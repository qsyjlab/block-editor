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
      const withCalloutHtml = convertCalloutMarkdownToHtml(markdown)
      const html = marked.parse(withCalloutHtml, { gfm: true, breaks: true }) as string
      this.editor.commands.setContent(html, true)
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
