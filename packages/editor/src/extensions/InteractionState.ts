import { Extension } from '@tiptap/core'

export type InteractionMode = 'idle' | 'text-selection' | 'block-selection' | 'table-editing'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    interactionState: {
      setInteractionMode: (mode: InteractionMode) => ReturnType
      setBlockMenuOpen: (open: boolean) => ReturnType
    }
  }
}

export const InteractionState = Extension.create({
  name: 'interactionState',

  addStorage() {
    return {
      mode: 'idle' as InteractionMode,
      blockMenuOpen: false,
    }
  },

  addCommands() {
    return {
      setInteractionMode:
        (mode: InteractionMode) =>
        () => {
          ;(this.editor.storage.interactionState as { mode: InteractionMode }).mode = mode
          return true
        },
      setBlockMenuOpen:
        (open: boolean) =>
        () => {
          ;(this.editor.storage.interactionState as { blockMenuOpen: boolean }).blockMenuOpen = open
          return true
        },
    }
  },
})
