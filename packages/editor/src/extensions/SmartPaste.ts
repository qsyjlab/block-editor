/**
 * SmartPaste Extension
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. 纯 URL 行粘贴 → 插入可点击链接（而不是裸文字）
 * 2. 富文本粘贴 → 清洗危险样式（font-size 保留，color 保留，其余 inline-style 删除）
 * 3. Word / 网页复制 → 移除 <script> / <style> / <meta> 等噪声标签
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

const URL_REGEX = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i

// Tags to strip entirely (including their content)
const STRIP_TAGS = ['script', 'style', 'meta', 'link', 'iframe', 'object', 'embed']

// Inline style properties to keep when pasting rich text
const KEEP_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'font-size',
])

type SmartPasteEditorLike = {
  state: {
    selection: {
      $from: {
        parent: {
          type: {
            spec?: {
              code?: boolean
            }
          }
        }
      }
    }
  }
  isActive: (name: string) => boolean
  chain: () => {
    focus: () => {
      insertContent: (content: unknown) => {
        run: () => void
      }
    }
  }
  commands: {
    insertContent: (content: string) => void
  }
}

type SmartPasteEventLike = {
  clipboardData?: {
    getData: (type: string) => string
  } | null
  preventDefault: () => void
}

function cleanHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 1. Strip dangerous tags
  STRIP_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  })

  // 2. Clean inline styles – keep only safe properties
  doc.querySelectorAll('[style]').forEach((el) => {
    const htmlEl = el as HTMLElement
    const raw = htmlEl.getAttribute('style') || ''
    const cleaned = raw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        if (!s) return false
        const prop = s.split(':')[0].trim().toLowerCase()
        return KEEP_STYLE_PROPS.has(prop)
      })
      .join('; ')

    if (cleaned) {
      htmlEl.setAttribute('style', cleaned)
    } else {
      htmlEl.removeAttribute('style')
    }
  })

  // 3. Remove class attributes (avoid external CSS bleeding in)
  doc.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'))

  return doc.body.innerHTML
}

export function isInCodePasteContext(editor: SmartPasteEditorLike): boolean {
  const { $from } = editor.state.selection
  return (
    editor.isActive('codeBlock') ||
    editor.isActive('code') ||
    Boolean($from.parent.type.spec?.code)
  )
}

export function handleSmartPaste(
  editor: SmartPasteEditorLike,
  event: SmartPasteEventLike,
  slice?: unknown,
): boolean {
  const clipboardData = event.clipboardData
  if (!clipboardData) return false

  // In code blocks, keep native ProseMirror paste behavior.
  // Smart transformations (auto-link / HTML cleanup) can break the
  // expected "paste as plain code text" flow and may insert content
  // outside the current code block.
  if (isInCodePasteContext(editor)) {
    return false
  }

  const plainText = clipboardData.getData('text/plain').trim()
  const htmlText = clipboardData.getData('text/html')

  // ── Case 1: Plain URL paste ────────────────────────────────────
  if (!htmlText && URL_REGEX.test(plainText)) {
    event.preventDefault()
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: plainText,
        marks: [{ type: 'link', attrs: { href: plainText, target: '_blank' } }],
      })
      .run()
    return true
  }

  // ── Case 2: Rich text with HTML – clean it first ───────────────
  if (htmlText) {
    const cleaned = cleanHtml(htmlText)
    if (cleaned !== htmlText) {
      event.preventDefault()
      editor.commands.insertContent(cleaned)
      return true
    }
  }

  // Fall through to default ProseMirror paste handling
  void slice
  return false
}

export const SmartPaste = Extension.create({
  name: 'smartPaste',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('smartPaste'),

        props: {
          handlePaste(_view, event, slice) {
            return handleSmartPaste(
              editor as unknown as SmartPasteEditorLike,
              event as unknown as SmartPasteEventLike,
              slice,
            )
          },
        },
      }),
    ]
  },
})
