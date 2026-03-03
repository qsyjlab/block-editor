import { Extension } from '@tiptap/core'
import { BubbleMenuPlugin, BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import { PluginKey } from 'prosemirror-state'
import { Editor } from '@tiptap/core'
import { ToolbarItem } from '../ui/toolbar/ToolbarItem'
import { ToolbarItemType } from '../ui/toolbar/ToolbarRegistry'
import type { EditorCore } from '../core/EditorCore'

// Define the items we want in the tooltip
const tooltipItems: ToolbarItemType[] = [
    { type: 'button', label: 'Bold', icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
    { type: 'button', label: 'Italic', icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
    { type: 'button', label: 'Underline', icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
    { type: 'button', label: 'Strike', icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
    { type: 'button', label: 'Code', icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
    { type: 'button', label: 'Highlight', icon: 'highlighter', command: 'toggleHighlight', activeName: 'highlight', shortcut: '⇧⌘H' },
    { 
        type: 'button', 
        label: 'Link', 
        icon: 'link', 
        command: 'setLink', 
        activeName: 'link',
        onExecute: (core: EditorCore) => {
             const previousUrl = core.editor.getAttributes('link').href
             const url = window.prompt('URL', previousUrl)

             // cancelled
             if (url === null) {
               return
             }

             // empty
             if (url === '') {
               core.editor.chain().focus().extendMarkRange('link').unsetLink().run()
               return
             }

             // update
             core.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
    }
]

function createTooltipElement(editor: Editor) {
  const container = document.createElement('div')
  container.className = 'be-selection-tooltip be-flex be-items-center be-bg-white be-shadow-lg be-rounded-md be-border be-border-gray-200 be-p-1 be-gap-1'
  
  // Mock EditorCore for ToolbarItem
  // ToolbarItem only uses editor and events.on
  const mockCore = {
      editor: editor,
      events: {
          on: (event: string, fn: any) => {
              // Map custom event names to Tiptap events if needed, but ToolbarItem uses 'selectionUpdate' and 'transaction'
              // EditorCore events: 'selectionUpdate', 'transaction'
              // Tiptap Editor events: 'selectionUpdate', 'transaction'
              // They match!
              editor.on(event as any, fn)
          },
          off: (event: string, fn: any) => {
              editor.off(event as any, fn)
          },
          emit: () => {}
      }
  } as unknown as EditorCore

  tooltipItems.forEach(item => {
      if (item.type === 'button') {
          const toolbarItem = new ToolbarItem(item, mockCore)
          container.appendChild(toolbarItem.getElement())
      }
      // We can add dividers or other types if needed
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
            // Only show if there is a selection and it's not empty
            // Also check if selection is not just a cursor
            return from !== to && editor.isEditable && !editor.state.selection.empty
        },
        tippyOptions: {
            duration: 100,
            offset: [0, 10],
            zIndex: 9999,
        },
      } as BubbleMenuPluginProps),
    ]
  },
})
