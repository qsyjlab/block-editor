import { Extension, Editor } from '@tiptap/core'
import { BubbleMenuPlugin, BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import { PluginKey } from 'prosemirror-state'
import { ToolbarItem } from '../ui/toolbar/ToolbarItem'
import { ToolbarItemType } from '../ui/toolbar/ToolbarRegistry'
import { InsertLinkDialog } from '../ui/toolbar/dialogs/insert-link-dialog'
import type { EditorCore } from '../core/EditorCore'

const tooltipItems: ToolbarItemType[] = [
  { type: 'button', label: 'Bold', icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
  { type: 'button', label: 'Italic', icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
  { type: 'button', label: 'Underline', icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
  { type: 'button', label: 'Strike', icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
  { type: 'button', label: 'Code', icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
  { type: 'button', label: 'Highlight', icon: 'highlighter', command: 'toggleHighlight', activeName: 'highlight', shortcut: '⇧⌘H' },
  { type: 'button', label: '缩进', icon: 'indent', command: 'indent', shortcut: '⌘]' },
  { type: 'button', label: '减少缩进', icon: 'outdent', command: 'outdent', shortcut: '⌘[' },
  {
    type: 'button',
    label: '清除格式',
    icon: 'clearFormatting',
    onExecute: (core: EditorCore) => {
      core.editor.chain().focus().unsetAllMarks().clearNodes().run()
    },
  },
  {
    type: 'button',
    label: 'Link',
    icon: 'link',
    command: 'setLink',
    activeName: 'link',
    onExecute: (core: EditorCore) => {
      const { from, to } = core.editor.state.selection
      const selectedText = core.editor.state.doc.textBetween(from, to, ' ')
      const previousUrl = core.editor.getAttributes('link').href || ''

      new InsertLinkDialog((url, linkText) => {
        const finalText = (linkText || selectedText || url).trim()

        if (!finalText) {
          core.editor.chain().focus().extendMarkRange('link').unsetLink().run()
          return
        }

        if (finalText !== selectedText) {
          core.editor
            .chain()
            .focus()
            .insertContentAt(
              { from, to },
              {
                type: 'text',
                text: finalText,
                marks: [{ type: 'link', attrs: { href: url } }],
              },
            )
            .run()
          return
        }

        core.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }, selectedText, previousUrl).show()
    },
  },
]

function createTooltipElement(editor: Editor) {
  const container = document.createElement('div')
  container.className = 'be-selection-tooltip'
  container.setAttribute('role', 'toolbar')
  container.setAttribute('aria-label', '文本格式工具栏')
  container.setAttribute('aria-orientation', 'horizontal')

  const mockCore = {
    editor,
    events: {
      on: (event: string, fn: any) => editor.on(event as any, fn),
      off: (event: string, fn: any) => editor.off(event as any, fn),
      emit: () => {},
    },
  } as unknown as EditorCore

  tooltipItems.forEach(item => {
    if (item.type === 'button') {
      const toolbarItem = new ToolbarItem(item, mockCore)
      container.appendChild(toolbarItem.getElement())
    }
  })

  return container
}

export const SelectionTooltip = Extension.create({
  name: 'selectionTooltip',

  addProseMirrorPlugins() {
    return [
      BubbleMenuPlugin({
        pluginKey: new PluginKey('selectionTooltip'),
        editor: this.editor,
        element: createTooltipElement(this.editor),
        shouldShow: ({ editor, from, to }) => {
          const state = editor.storage.interactionState as
            | {
                mode?: 'idle' | 'text-selection' | 'block-selection' | 'table-editing'
                blockMenuOpen?: boolean
              }
            | undefined

          if (from === to || !editor.isEditable || editor.state.selection.empty) return false
          if (editor.isActive('table')) return false
          if (state?.blockMenuOpen) return false
          if (state?.mode === 'block-selection' || state?.mode === 'table-editing') return false

          if (state?.mode !== 'text-selection') {
            editor.commands.setInteractionMode('text-selection')
          }

          return true
        },
        tippyOptions: {
          duration: 100,
          offset: [0, 10],
          zIndex: 9999,
          arrow: false,
          theme: 'be-selection-toolbar',
          maxWidth: 'none',
        },
      } as BubbleMenuPluginProps),
    ]
  },
})
