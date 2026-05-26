import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

const MAX_INDENT = 6

function applyIndent(editor: any, nextIndent: number) {
  if (editor.isActive('heading')) {
    const attrs = editor.getAttributes('heading')
    return editor
      .chain()
      .focus()
      .updateAttributes('heading', { ...attrs, indent: nextIndent })
      .run()
  }

  return editor.chain().focus().updateAttributes('paragraph', { indent: nextIndent }).run()
}

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
    return {
      Enter: () => {
        if (this.editor.isActive('listItem')) return false

        const activeType = this.editor.isActive('heading') ? 'heading' : 'paragraph'
        const attrs = this.editor.getAttributes(activeType)
        const currentIndent = Number(attrs.indent || 0)
        if (currentIndent <= 0) return false

        return this.editor.chain().splitBlock().updateAttributes('paragraph', { indent: 0 }).run()
      },
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
      'Mod-]': () => this.editor.commands.indent(),
      'Mod-[': () => this.editor.commands.outdent(),
    }
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ editor }) => {
          if (editor.isActive('listItem')) {
            return editor.chain().focus().sinkListItem('listItem').run()
          }

          const activeType = editor.isActive('heading') ? 'heading' : 'paragraph'
          const attrs = editor.getAttributes(activeType)
          const currentIndent = Number(attrs.indent || 0)
          return applyIndent(editor, Math.min(MAX_INDENT, currentIndent + 1))
        },
      outdent:
        () =>
        ({ editor }) => {
          if (editor.isActive('listItem')) {
            return editor.chain().focus().liftListItem('listItem').run()
          }

          const activeType = editor.isActive('heading') ? 'heading' : 'paragraph'
          const attrs = editor.getAttributes(activeType)
          const currentIndent = Number(attrs.indent || 0)
          return applyIndent(editor, Math.max(0, currentIndent - 1))
        },
    }
  },
})
