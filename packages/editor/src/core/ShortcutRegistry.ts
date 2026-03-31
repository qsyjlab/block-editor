export type ShortcutScope = 'global' | 'editor' | 'selection' | 'table' | 'comment' | 'modal'

export type ShortcutPlatform = 'mac' | 'windows'

export interface ShortcutCombo {
  mac: string
  windows: string
}

export interface ShortcutContext {
  event: KeyboardEvent
  target: EventTarget | null
  editorRoot: HTMLElement | null
  inInput: boolean
  inEditor: boolean
}

export interface ShortcutDefinition {
  id: string
  source: string
  scope: ShortcutScope
  command?: string
  combo: ShortcutCombo
  priority?: number
  allowInInput?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  when?: (ctx: ShortcutContext) => boolean
  run: (ctx: ShortcutContext) => void
}

export interface ShortcutConflict {
  scope: ShortcutScope
  signature: string
  entries: ShortcutDefinition[]
}

interface RegisteredShortcut {
  def: ShortcutDefinition
  macSignature: string
  windowsSignature: string
}

const MODIFIER_ORDER = ['mod', 'ctrl', 'meta', 'alt', 'shift'] as const

function normalizeKey(key: string) {
  const trimmed = key.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  const aliases: Record<string, string> = {
    cmd: 'meta',
    command: 'meta',
    control: 'ctrl',
    option: 'alt',
    escape: 'esc',
    return: 'enter',
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    ' ': 'space',
    spacebar: 'space',
    del: 'delete',
  }
  return aliases[lower] || lower
}

function normalizeCombo(raw: string, platform: ShortcutPlatform) {
  const parts = raw
    .split('+')
    .map((p) => normalizeKey(p))
    .filter(Boolean)
  const modifiers = new Set<string>()
  let key = ''
  for (const part of parts) {
    let modifier = part
    if (part === 'command' || part === 'cmd') {
      modifier = platform === 'mac' ? 'mod' : 'meta'
    } else if (part === 'meta') {
      modifier = platform === 'mac' ? 'mod' : 'meta'
    } else if (part === 'control' || part === 'ctrl') {
      modifier = platform === 'windows' ? 'mod' : 'ctrl'
    } else if (part === 'mod') {
      modifier = 'mod'
    }
    if (MODIFIER_ORDER.includes(modifier as (typeof MODIFIER_ORDER)[number])) {
      modifiers.add(modifier)
      continue
    }
    key = part
  }
  if (!key) return ''
  const sorted = Array.from(modifiers).sort(
    (a, b) => MODIFIER_ORDER.indexOf(a as any) - MODIFIER_ORDER.indexOf(b as any),
  )
  return [...sorted, key].join('+')
}

function displayKey(key: string, platform: ShortcutPlatform) {
  const dict: Record<string, string> = {
    esc: platform === 'mac' ? '⎋' : 'Esc',
    enter: platform === 'mac' ? '↩' : 'Enter',
    space: platform === 'mac' ? '␣' : 'Space',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    delete: platform === 'mac' ? '⌦' : 'Delete',
    backspace: platform === 'mac' ? '⌫' : 'Backspace',
    tab: platform === 'mac' ? '⇥' : 'Tab',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
  }
  if (dict[key]) return dict[key]
  if (key.length === 1) return key.toUpperCase()
  return key[0].toUpperCase() + key.slice(1)
}

function displayModifier(mod: string, platform: ShortcutPlatform) {
  const mac: Record<string, string> = {
    mod: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    meta: '⌘',
  }
  const windows: Record<string, string> = {
    mod: 'Ctrl',
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Win',
  }
  return platform === 'mac' ? mac[mod] || mod : windows[mod] || mod
}

export function formatShortcutCombo(raw: string, platform: ShortcutPlatform) {
  const signature = normalizeCombo(raw, platform)
  if (!signature) return ''
  const parts = signature.split('+').filter(Boolean)
  const mods = parts.slice(0, -1)
  const key = parts[parts.length - 1]
  const items = [...mods.map((mod) => displayModifier(mod, platform)), displayKey(key, platform)]
  if (platform === 'mac') return items.join('')
  return items.join('+')
}

function eventToSignature(event: KeyboardEvent, platform: ShortcutPlatform) {
  const mods: string[] = []
  const hasMod = platform === 'mac' ? event.metaKey : event.ctrlKey
  if (hasMod) mods.push('mod')
  if (event.ctrlKey && platform === 'mac') mods.push('ctrl')
  if (event.metaKey && platform === 'windows') mods.push('meta')
  if (event.altKey) mods.push('alt')
  if (event.shiftKey) mods.push('shift')
  const key = normalizeKey(event.key)
  if (!key) return ''
  const normalizedMods = mods.sort(
    (a, b) => MODIFIER_ORDER.indexOf(a as any) - MODIFIER_ORDER.indexOf(b as any),
  )
  return [...normalizedMods, key].join('+')
}

function detectPlatform(): ShortcutPlatform {
  const platform = (typeof navigator !== 'undefined' && navigator.platform) || ''
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? 'mac' : 'windows'
}

function isInputLike(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tagName = ((el as { tagName?: string }).tagName || '').toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') return true
  if ((el as { isContentEditable?: boolean }).isContentEditable) return true
  return false
}

export class ShortcutRegistry {
  private readonly shortcuts = new Map<string, RegisteredShortcut>()
  private readonly platform: ShortcutPlatform

  constructor(platform: ShortcutPlatform = detectPlatform()) {
    this.platform = platform
  }

  register(def: ShortcutDefinition) {
    const macSignature = normalizeCombo(def.combo.mac, 'mac')
    const windowsSignature = normalizeCombo(def.combo.windows, 'windows')
    if (!macSignature || !windowsSignature) {
      throw new Error(`Invalid shortcut combo for ${def.id}`)
    }
    const existing = this.shortcuts.get(def.id)
    if (existing) {
      throw new Error(`Shortcut id already exists: ${def.id}`)
    }
    this.shortcuts.set(def.id, { def, macSignature, windowsSignature })
    return () => {
      this.shortcuts.delete(def.id)
    }
  }

  list() {
    return Array.from(this.shortcuts.values()).map((entry) => entry.def)
  }

  findConflicts(): ShortcutConflict[] {
    const byScopeAndSignature = new Map<string, RegisteredShortcut[]>()
    for (const entry of this.shortcuts.values()) {
      const signature = this.platform === 'mac' ? entry.macSignature : entry.windowsSignature
      const key = `${entry.def.scope}::${signature}`
      const current = byScopeAndSignature.get(key) || []
      current.push(entry)
      byScopeAndSignature.set(key, current)
    }
    const conflicts: ShortcutConflict[] = []
    for (const [key, entries] of byScopeAndSignature.entries()) {
      if (entries.length < 2) continue
      const [scope, signature] = key.split('::')
      conflicts.push({
        scope: scope as ShortcutScope,
        signature,
        entries: entries.map((e) => e.def),
      })
    }
    return conflicts
  }

  dispatch(event: KeyboardEvent, editorRoot: HTMLElement | null) {
    const target = event.target
    const inEditor = Boolean(editorRoot && target instanceof Node && editorRoot.contains(target))
    const inInput = isInputLike(target)
    const signature = eventToSignature(event, this.platform)
    if (!signature) return false

    const candidates = Array.from(this.shortcuts.values())
      .filter((entry) => {
        const expected = this.platform === 'mac' ? entry.macSignature : entry.windowsSignature
        return expected === signature
      })
      .sort((a, b) => (b.def.priority || 0) - (a.def.priority || 0))

    if (candidates.length === 0) return false

    const context: ShortcutContext = {
      event,
      target,
      editorRoot,
      inInput,
      inEditor,
    }

    for (const candidate of candidates) {
      if (inInput && !candidate.def.allowInInput) continue
      if (candidate.def.when && !candidate.def.when(context)) continue
      if (candidate.def.preventDefault !== false) event.preventDefault()
      if (candidate.def.stopPropagation) event.stopPropagation()
      candidate.def.run(context)
      return true
    }
    return false
  }

  getPlatform() {
    return this.platform
  }

  formatCombo(combo: ShortcutCombo) {
    return formatShortcutCombo(combo[this.platform], this.platform)
  }
}
