import { describe, expect, it } from 'vitest'
import { formatShortcutCombo, ShortcutRegistry } from '../ShortcutRegistry'

function createKeydownEvent(
  key: string,
  options: {
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    target?: EventTarget | null
  } = {},
) {
  let prevented = false
  const event = {
    key,
    ctrlKey: Boolean(options.ctrlKey),
    metaKey: Boolean(options.metaKey),
    shiftKey: Boolean(options.shiftKey),
    altKey: Boolean(options.altKey),
    target: options.target || null,
    get defaultPrevented() {
      return prevented
    },
    preventDefault() {
      prevented = true
    },
    stopPropagation() {},
  } as KeyboardEvent
  return event
}

describe('ShortcutRegistry', () => {
  it('dispatches by platform combo', () => {
    const registry = new ShortcutRegistry('windows')
    let called = false
    registry.register({
      id: 'find.open',
      source: 'test',
      scope: 'editor',
      combo: { mac: 'Mod+f', windows: 'Mod+f' },
      run: () => {
        called = true
      },
    })
    const event = createKeydownEvent('f', { ctrlKey: true })
    const consumed = registry.dispatch(event, null)
    expect(consumed).toBe(true)
    expect(called).toBe(true)
    expect(event.defaultPrevented).toBe(true)
  })

  it('detects conflicts in same scope and combo', () => {
    const registry = new ShortcutRegistry('mac')
    registry.register({
      id: 'a',
      source: 'test',
      scope: 'editor',
      combo: { mac: 'Mod+f', windows: 'Mod+f' },
      run: () => {},
    })
    registry.register({
      id: 'b',
      source: 'test',
      scope: 'editor',
      combo: { mac: 'Cmd+f', windows: 'Ctrl+f' },
      run: () => {},
    })
    const conflicts = registry.findConflicts()
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].entries.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('skips shortcut in input unless allowInInput', () => {
    const registry = new ShortcutRegistry('windows')
    const input = { tagName: 'INPUT' } as unknown as EventTarget
    let calls = 0
    registry.register({
      id: 'plain',
      source: 'test',
      scope: 'editor',
      combo: { mac: 'Mod+f', windows: 'Mod+f' },
      run: () => {
        calls += 1
      },
    })
    let event = createKeydownEvent('f', { ctrlKey: true, target: input })
    const consumed = registry.dispatch(event, null)
    expect(consumed).toBe(false)
    expect(calls).toBe(0)

    registry.register({
      id: 'allow',
      source: 'test',
      scope: 'editor',
      combo: { mac: 'Mod+h', windows: 'Mod+h' },
      allowInInput: true,
      run: () => {
        calls += 1
      },
    })
    event = createKeydownEvent('h', { ctrlKey: true, target: input })
    const consumedAllowed = registry.dispatch(event, null)
    expect(consumedAllowed).toBe(true)
    expect(calls).toBe(1)
  })

  it('formats shortcut combo for display', () => {
    expect(formatShortcutCombo('Mod+Shift+b', 'mac')).toBe('⌘⇧B')
    expect(formatShortcutCombo('Mod+Shift+b', 'windows')).toBe('Ctrl+Shift+B')
  })
})
