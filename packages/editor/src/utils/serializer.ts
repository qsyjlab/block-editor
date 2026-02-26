import { Editor } from '@tiptap/core'

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

/**
 * Get Markdown (Mock implementation as Tiptap requires prosemirror-markdown)
 */
export const toMarkdown = (_editor: Editor) => {
  // Real implementation would use defaultMarkdownSerializer from prosemirror-markdown
  return 'Markdown export requires additional dependencies.'
}
