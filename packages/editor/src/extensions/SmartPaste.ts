/**
 * SmartPaste Extension
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. 纯 URL 行粘贴 → 插入可点击链接（而不是裸文字）
 * 2. 富文本粘贴 → 清洗危险样式（font-size 保留，color 保留，其余 inline-style 删除）
 * 3. Word / 网页复制 → 移除 <script> / <style> / <meta> 等噪声标签
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { markdownToEditorHtml } from '../import/MarkdownImporter'

const URL_REGEX = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i
const IMAGE_URL_REGEX =
  /^(https?:\/\/)[^\s?#]+?\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)([?#][^\s]*)?$/i

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
      empty?: boolean
      $from: {
        parent: {
          textContent?: string
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
    insertContent: (content: unknown) => void
    setLink?: (attrs: { href: string; target?: string }) => boolean
    setImage?: (attrs: { src: string; alt?: string; title?: string }) => boolean
  }
  view?: {
    state: {
      doc: {
        content: {
          size: number
        }
        resolve: (pos: number) => Parameters<typeof TextSelection.near>[0]
      }
      selection: {
        to: number
      }
      tr: {
        setSelection: (selection: TextSelection) => {
          scrollIntoView: () => unknown
        }
      }
    }
    dispatch: (transaction: unknown) => void
    focus: () => void
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
    editor.isActive('codeBlock') || editor.isActive('code') || Boolean($from.parent.type.spec?.code)
  )
}

function isImageUrl(url: string): boolean {
  return IMAGE_URL_REGEX.test(url)
}

function selectionHasText(editor: SmartPasteEditorLike): boolean {
  return editor.state.selection.empty === false
}

function looksLikeMarkdownDocument(text: string): boolean {
  if (!text || text.length < 8) return false
  const lines = text.split(/\r?\n/)
  let score = 0

  for (const line of lines) {
    if (/^#{1,6}\s+\S/.test(line)) score += 2
    else if (/^>\s+\[!\w+\]/.test(line)) score += 2
    else if (/^\s*[-*+]\s+\[[ xX]\]\s+\S/.test(line)) score += 2
    else if (/^\s*[-*+]\s+\S/.test(line)) score += 1
    else if (/^\s*\d+\.\s+\S/.test(line)) score += 1
    else if (/^```|^~~~/.test(line)) score += 2
    else if (/^\|.+\|$/.test(line)) score += 1
    else if (/^---+$/.test(line.trim())) score += 1
  }

  if (/\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)]+\)/.test(text)) {
    score += 1
  }

  return score >= 3
}

function collapseSelectionAfterInsert(editor: SmartPasteEditorLike): void {
  if (!editor.view) return

  queueMicrotask(() => {
    const view = editor.view
    if (!view) return

    try {
      const { state } = view
      const pos = Math.max(1, Math.min(state.selection.to, state.doc.content.size))
      const selection = TextSelection.near(state.doc.resolve(pos), 1)
      view.dispatch(state.tr.setSelection(selection).scrollIntoView())
      view.focus()
    } catch {
      // Best-effort cleanup only. If the document changed again before the
      // microtask runs, keep the paste result rather than risking another error.
    }
  })
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

  // ── Case 0: Plain Markdown document paste ─────────────────────
  // Clipboard sources such as local .md files often provide only text/plain.
  // Parse those immediately so copied docs become selectable blocks instead of
  // raw Markdown source text.
  if (!htmlText && looksLikeMarkdownDocument(plainText)) {
    event.preventDefault()
    editor.commands.insertContent(markdownToEditorHtml(plainText))
    collapseSelectionAfterInsert(editor)
    return true
  }

  // ── Case 1: Plain URL paste ────────────────────────────────────
  if (!htmlText && URL_REGEX.test(plainText)) {
    event.preventDefault()

    // Keep "paste URL as link" when the user has selected text.
    if (selectionHasText(editor) && typeof editor.commands.setLink === 'function') {
      const linked = editor.commands.setLink({ href: plainText, target: '_blank' })
      if (linked) return true
    }

    // Auto-convert direct image links to image blocks for quicker media insertion.
    if (isImageUrl(plainText)) {
      if (typeof editor.commands.setImage === 'function') {
        const inserted = editor.commands.setImage({ src: plainText })
        if (inserted) return true
      }
      editor.commands.insertContent({
        type: 'image',
        attrs: { src: plainText },
      })
      return true
    }

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
      collapseSelectionAfterInsert(editor)
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
