import { Editor } from '@tiptap/core'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

/**
 * Serialize editor content to JSON
 */
export const toJSON = (editor: Editor) => {
  return editor.getJSON()
}

/**
 * Serialize editor content to HTML
 */
export const toHTML = (editor: Editor) => {
  return editor.getHTML()
}

function normalizeCalloutLabel(type: string): 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' {
  if (type === 'success') return 'SUCCESS'
  if (type === 'warning') return 'WARNING'
  if (type === 'danger') return 'DANGER'
  return 'INFO'
}

function transformCalloutToMarkdownFriendlyHtml(sourceHtml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(sourceHtml, 'text/html')

  doc.querySelectorAll<HTMLElement>('p[data-indent],h1[data-indent],h2[data-indent],h3[data-indent],h4[data-indent],h5[data-indent],h6[data-indent]').forEach((el) => {
    const level = Number(el.getAttribute('data-indent') || 0)
    if (level <= 0) return
    const prefix = `[indent:${level}] `
    if (el.firstChild?.nodeType === Node.TEXT_NODE) {
      el.firstChild.textContent = `${prefix}${el.firstChild.textContent || ''}`
    } else {
      el.insertBefore(doc.createTextNode(prefix), el.firstChild)
    }
  })

  doc.querySelectorAll('div[data-callout-type]').forEach((callout) => {
    const calloutType = normalizeCalloutLabel(callout.getAttribute('data-callout-type') || 'info')
    const blockquote = doc.createElement('blockquote')

    const marker = doc.createElement('p')
    marker.textContent = `[!${calloutType}]`
    blockquote.appendChild(marker)

    const contentEl = callout.querySelector('.be-callout-content') as HTMLElement | null
    const source = contentEl || callout

    Array.from(source.children).forEach((child) => {
      blockquote.appendChild(child.cloneNode(true))
    })

    callout.replaceWith(blockquote)
  })

  return doc.body.innerHTML
}

/**
 * Serialize editor content to Markdown
 */
export const toMarkdown = (editor: Editor) => {
  const html = transformCalloutToMarkdownFriendlyHtml(editor.getHTML())
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  })
  service.use(gfm)
  return service.turndown(html)
}
