import { describe, expect, it } from 'vitest'
import { InteractionState } from '../InteractionState'

describe('InteractionState', () => {
  it('should switch interaction mode via command', () => {
    const context: any = {
      editor: {
        storage: {
          interactionState: {
            mode: 'idle',
            blockMenuOpen: false,
          },
        },
      },
    }

    const commands = (InteractionState as any).config.addCommands.call(context)
    const result = commands.setInteractionMode('table-editing')()

    expect(result).toBe(true)
    expect(context.editor.storage.interactionState.mode).toBe('table-editing')
  })

  it('should toggle block menu open state via command', () => {
    const context: any = {
      editor: {
        storage: {
          interactionState: {
            mode: 'idle',
            blockMenuOpen: false,
          },
        },
      },
    }

    const commands = (InteractionState as any).config.addCommands.call(context)
    expect(commands.setBlockMenuOpen(true)()).toBe(true)
    expect(context.editor.storage.interactionState.blockMenuOpen).toBe(true)

    expect(commands.setBlockMenuOpen(false)()).toBe(true)
    expect(context.editor.storage.interactionState.blockMenuOpen).toBe(false)
  })
})
