import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import type { Slice } from 'prosemirror-model'
import { DOMSerializer } from 'prosemirror-model'
import { editorHtmlFragmentToMarkdown } from '../utils/serializer'

export const clipboardMarkdownPluginKey = new PluginKey('clipboardMarkdown')

/**
 * 复制链路一致性（EXP-003 / Phase D2）：
 * - text/html：保留 ProseMirror 默认输出（外部粘贴时保留基础视觉）；
 * - text/plain：选区片段走与 Markdown 导出相同的规范化管线
 *   （表格 GFM、任务列表勾选框、Callout 标记），复制到飞书/终端/
 *   Markdown 编辑器时结构与「导出 Markdown」一致。
 */
export const ClipboardMarkdown = Extension.create({
  name: 'clipboardMarkdown',

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: clipboardMarkdownPluginKey,
        props: {
          clipboardTextSerializer(slice: Slice) {
            try {
              if (slice.size === 0) return ''
              const schema = editor.state.schema
              const dom = document.createElement('div')
              const fragment = DOMSerializer.fromSchema(schema).serializeFragment(slice.content)
              dom.appendChild(fragment)
              return editorHtmlFragmentToMarkdown(dom.innerHTML)
            } catch {
              // 序列化失败时返回空串让 ProseMirror 走默认 textContent 回退
              return ''
            }
          },
        },
      }),
    ]
  },
})
