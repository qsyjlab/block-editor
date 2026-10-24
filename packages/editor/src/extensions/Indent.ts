import { Extension } from '@tiptap/core'
import type { Node as PMNode } from 'prosemirror-model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

const MAX_INDENT = 6

/** 当前光标所在的段落/标题节点与位置；不在这些块里时返回 null */
function currentTextBlock(state: any): { node: PMNode; pos: number } | null {
  const { $from } = state.selection
  const node = $from.parent
  if (!node.type.name || (node.type.name !== 'paragraph' && node.type.name !== 'heading')) {
    return null
  }
  return { node, pos: $from.before() }
}

/**
 * Tab 缩进扩展。
 *
 * 注意 Tab 的语义分层（对齐飞书/常见编辑器）：
 * - 表格内：放行给 prosemirror-tables 的 goToNextCell（跳格），不缩进；
 * - 代码块内：放行给代码块自身（软缩进）；
 * - 列表项内：sink/lift 列表层级；
 * - 段落/标题：data-indent 缩进（最多 6 级）。
 *
 * indent/outdent 用注入的 state.tr.setNodeMarkup（原生事务），
 * 避免链式命令在 keydown 场景下派发过期 state 触发
 * "Applying a mismatched transaction"（表格单元格内按 Tab 曾稳定复现）。
 */
export const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = Number(element.getAttribute('data-indent') || 0)
              return Number.isNaN(indent) ? 0 : indent
            },
            renderHTML: (attributes) => {
              const indent = Number(attributes.indent || 0)
              if (!indent) return {}
              return {
                'data-indent': String(indent),
                style: `padding-left: ${indent * 2}em;`,
              }
            },
          },
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    const releaseForOtherBlocks = () => {
      const editor = this.editor
      if (editor.isActive('table') || editor.isActive('codeBlock')) return false
      return null // 不干预判断，继续走缩进
    }

    return {
      Enter: () => {
        const editor = this.editor
        if (editor.isActive('listItem')) return false
        if (editor.isActive('table')) return false

        const attrs = editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph')
        const currentIndent = Number(attrs.indent || 0)
        if (currentIndent <= 0) return false

        return editor.chain().splitBlock().updateAttributes('paragraph', { indent: 0 }).run()
      },
      Tab: () => {
        if (releaseForOtherBlocks() === false) return false
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (releaseForOtherBlocks() === false) return false
        return this.editor.commands.outdent()
      },
      'Mod-]': () => this.editor.commands.indent(),
      'Mod-[': () => this.editor.commands.outdent(),
    }
  },

  addCommands() {
    const applyIndentWithTr = (
      state: any,
      dispatch: ((args?: any) => void) | undefined,
      delta: 1 | -1,
    ): boolean => {
      const block = currentTextBlock(state)
      if (!block) return false
      const currentIndent = Number(block.node.attrs.indent || 0)
      const nextIndent = Math.max(0, Math.min(MAX_INDENT, currentIndent + delta))
      if (nextIndent === currentIndent) return true
      if (dispatch) {
        dispatch(
          state.tr.setNodeMarkup(block.pos, undefined, {
            ...block.node.attrs,
            indent: nextIndent,
          }),
        )
      }
      return true
    }

    return {
      indent:
        () =>
        ({ editor, state, dispatch }: any) => {
          if (editor.isActive('listItem')) {
            return editor.chain().focus().sinkListItem('listItem').run()
          }
          if (editor.isActive('table') || editor.isActive('codeBlock')) return false
          return applyIndentWithTr(state, dispatch, 1)
        },
      outdent:
        () =>
        ({ editor, state, dispatch }: any) => {
          if (editor.isActive('listItem')) {
            return editor.chain().focus().liftListItem('listItem').run()
          }
          if (editor.isActive('table') || editor.isActive('codeBlock')) return false
          return applyIndentWithTr(state, dispatch, -1)
        },
    }
  },
})
