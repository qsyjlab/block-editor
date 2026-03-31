import { describe, expect, it } from 'vitest'
import { ShortcutManager } from '../ShortcutManager'

describe('ShortcutManager', () => {
  it('resolves command shortcut by priority and scope', () => {
    const manager = new ShortcutManager()

    manager.registerShortcut({
      id: 'cmd.low',
      source: 'test',
      scope: 'editor',
      command: 'toggleBold',
      combo: { mac: 'Mod+b', windows: 'Mod+b' },
      priority: 10,
      run: () => {},
    })

    manager.registerShortcut({
      id: 'cmd.high',
      source: 'test',
      scope: 'selection',
      command: 'toggleBold',
      combo: { mac: 'Alt+Mod+b', windows: 'Alt+Mod+b' },
      priority: 40,
      run: () => {},
    })

    const all = manager.getShortcutForCommand('toggleBold')
    const selectionOnly = manager.getShortcutForCommand('toggleBold', ['selection'])

    expect(all.length).toBeGreaterThan(0)
    expect(selectionOnly.length).toBeGreaterThan(0)
    expect(all).toBe(selectionOnly)
  })
})
