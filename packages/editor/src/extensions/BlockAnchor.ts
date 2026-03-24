import { Extension } from '@tiptap/core'

const BLOCK_NODE_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'taskList',
  'table',
  'codeBlock',
  'callout',
  'image',
]

export const BlockAnchor = Extension.create({
  name: 'blockAnchor',

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_NODE_TYPES,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id') || element.getAttribute('id') || null,
            renderHTML: (attributes) => {
              const blockId = typeof attributes.blockId === 'string' ? attributes.blockId : ''
              if (!blockId) return {}
              return {
                id: blockId,
                'data-block-id': blockId,
              }
            },
          },
        },
      },
    ]
  },
})
