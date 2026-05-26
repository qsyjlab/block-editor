import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const CurrentLineHighlight = Extension.create({
  name: 'currentLineHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('currentLineHighlight'),
        props: {
          decorations: ({ doc, selection }) => {
            const { isEditable, isFocused } = this.editor
            if (!isEditable || !isFocused) {
              return DecorationSet.empty
            }
            if (selection instanceof NodeSelection) {
              return DecorationSet.empty
            }
            if (this.editor.isActive('image')) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = []
            const { $anchor } = selection

            // Find the block node at the current selection
            // We want the direct child of doc usually, or the deepest block?
            // "Current Line" usually means the paragraph/block user is typing in.

            // If selection is inside a block, we want that block.
            // $anchor.depth is the depth of the text node.
            // We walk up until we find a block node.

            let depth = $anchor.depth
            while (depth > 0) {
              const node = $anchor.node(depth)
              if (node.isBlock) {
                // Add decoration to this node
                // But wait, Decoration.node needs to be applied to the node itself.
                // If we use Decoration.node, it wraps the node content or adds class to the node view?
                // It adds class to the node's DOM element if it's a block.

                const pos = $anchor.before(depth)
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: 'be-active-block',
                  }),
                )
                break // Only highlight the immediate block
              }
              depth--
            }

            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})
