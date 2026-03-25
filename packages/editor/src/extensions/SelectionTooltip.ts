import { Extension, Editor } from '@tiptap/core'
import { BubbleMenuPlugin, BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import { PluginKey } from 'prosemirror-state'
import { ToolbarItem } from '../ui/toolbar/ToolbarItem'
import { ToolbarItemType, ToolbarRegistry } from '../ui/toolbar/ToolbarRegistry'
import { ToolbarDropdown } from '../ui/toolbar/ToolbarDropdown'
import { ColorPicker } from '../ui/toolbar/color-picker/color-picker'
import { buildDefaultToolbarItems } from '../ui/toolbar/defaultToolbarItems'
import { InsertLinkDialog } from '../ui/toolbar/dialogs/insert-link-dialog'
import type { EditorCore } from '../core/EditorCore'
import { resolveEditorI18n } from '../i18n'
import type { EditorI18n } from '../i18n'

type ToolbarMode = 'top' | 'inline'

function createTooltipItems(i18n: EditorI18n): ToolbarItemType[] {
  const t = i18n.toolbar

  return [
    { type: 'button', label: t.bold, icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
    { type: 'button', label: t.italic, icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
    { type: 'button', label: t.underline, icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
    { type: 'button', label: t.strike, icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
    { type: 'button', label: t.code, icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
    { type: 'button', label: t.highlight, icon: 'highlighter', command: 'toggleHighlight', activeName: 'highlight', shortcut: '⇧⌘H' },
    { type: 'button', label: t.indent, icon: 'indent', command: 'indent', shortcut: '⌘]' },
    { type: 'button', label: t.outdent, icon: 'outdent', command: 'outdent', shortcut: '⌘[' },
    {
      type: 'button',
      label: t.clearFormatting,
      icon: 'clearFormatting',
      onExecute: (core: EditorCore) => {
        core.editor.chain().focus().unsetAllMarks().clearNodes().run()
      },
    },
    {
      type: 'button',
      label: t.insertLink,
      icon: 'link',
      command: 'setLink',
      activeName: 'link',
      onExecute: (core: EditorCore) => {
        const { from, to } = core.editor.state.selection
        const selectedText = core.editor.state.doc.textBetween(from, to, ' ')
        const previousUrl = core.editor.getAttributes('link').href || ''

        new InsertLinkDialog(
          (url, linkText) => {
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
          },
          selectedText,
          previousUrl,
          i18n.dialogs.insertLink,
        ).show()
      },
    },
  ]
}

function getToolbarMode(editor: Editor): ToolbarMode {
  const element = editor.options.element as HTMLElement | null
  const mode = element?.dataset.beToolbarMode
  return mode === 'inline' ? 'inline' : 'top'
}

function getMockCore(editor: Editor): EditorCore {
  return {
    editor,
    events: {
      on: (event: string, fn: any) => editor.on(event as any, fn),
      off: (event: string, fn: any) => editor.off(event as any, fn),
      emit: () => {},
    },
  } as unknown as EditorCore
}

function getEditorCore(editor: Editor): EditorCore {
  const core = (editor as Editor & { __core?: EditorCore }).__core
  return core || getMockCore(editor)
}

function createSelectionToolbarElement(editor: Editor) {
  const container = document.createElement('div')
  container.className = 'be-selection-tooltip'
  container.setAttribute('role', 'toolbar')
  container.setAttribute('aria-orientation', 'horizontal')

  const core = getEditorCore(editor)
  const i18n = resolveEditorI18n(core.i18n)
  container.setAttribute('aria-label', i18n.toolbar.heading)

  createTooltipItems(i18n).forEach(item => {
    if (item.type === 'button') {
      const toolbarItem = new ToolbarItem(item, core)
      container.appendChild(toolbarItem.getElement())
    }
  })

  return container
}

function createInlineToolbarElement(editor: Editor) {
  const core = getEditorCore(editor)
  const i18n = resolveEditorI18n(core.i18n)

  if (ToolbarRegistry.getItems().length === 0) {
    buildDefaultToolbarItems(i18n).forEach((group) => ToolbarRegistry.registerGroup(group))
  }

  const container = document.createElement('div')
  container.className = 'be-selection-tooltip be-inline-toolbar'
  container.setAttribute('role', 'toolbar')
  container.setAttribute('aria-label', i18n.toolbar.heading)
  container.setAttribute('aria-orientation', 'horizontal')

  const groups = ToolbarRegistry.getItems()
  const allItems: ToolbarItemType[] = []

  groups.forEach((group, index) => {
    allItems.push(...group)
    if (index < groups.length - 1) {
      allItems.push({ type: 'divider' })
    }
  })

  allItems.forEach((item) => {
    let element: HTMLElement | null = null

    if (item.type === 'button') {
      element = new ToolbarItem(item, core).getElement()
    } else if (item.type === 'dropdown') {
      element = new ToolbarDropdown(item, core).getElement()
    } else if (item.type === 'color') {
      element = new ColorPicker(item.label, core).getElement()
    } else if (item.type === 'divider') {
      element = document.createElement('div')
      element.className = 'divider'
    }

    if (element) {
      container.appendChild(element)
    }
  })

  return container
}

export const SelectionTooltip = Extension.create({
  name: 'selectionTooltip',

  addProseMirrorPlugins() {
    const mode = getToolbarMode(this.editor)
    const element =
      mode === 'inline'
        ? createInlineToolbarElement(this.editor)
        : createSelectionToolbarElement(this.editor)

    return [
      BubbleMenuPlugin({
        pluginKey: new PluginKey('selectionTooltip'),
        editor: this.editor,
        element,
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
