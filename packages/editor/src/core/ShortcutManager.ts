import { ShortcutDefinition, ShortcutRegistry, ShortcutScope } from './ShortcutRegistry'

function isNodeTarget(target: EventTarget | null): target is Node {
  return Boolean(target && typeof (target as Node).nodeType === 'number')
}

export class ShortcutManager {
  private readonly registry: ShortcutRegistry
  private editorRoot: HTMLElement | null = null
  private listening = false

  constructor() {
    this.registry = new ShortcutRegistry()
  }

  setEditorRoot(root: HTMLElement | null) {
    this.editorRoot = root
  }

  start() {
    if (this.listening) return
    this.listening = true
    document.addEventListener('keydown', this.handleKeydown, true)
  }

  stop() {
    if (!this.listening) return
    this.listening = false
    document.removeEventListener('keydown', this.handleKeydown, true)
  }

  registerShortcut(def: ShortcutDefinition) {
    const dispose = this.registry.register(def)
    this.reportConflicts()
    return () => {
      dispose()
    }
  }

  listShortcuts() {
    return this.registry.list()
  }

  private reportConflicts() {
    const conflicts = this.registry.findConflicts()
    if (conflicts.length === 0) return
    const summary = conflicts
      .map((conflict) => {
        const ids = conflict.entries.map((entry) => entry.id).join(', ')
        return `[${conflict.scope}] ${conflict.signature} => ${ids}`
      })
      .join(' | ')
    console.warn(`[shortcut] conflict detected: ${summary}`)
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.editorRoot) return
    const target = event.target
    const inEditor = isNodeTarget(target) && this.editorRoot.contains(target)
    const activeElement = document.activeElement
    const activeInEditor = Boolean(activeElement && this.editorRoot.contains(activeElement))
    if (!inEditor && !activeInEditor) return
    this.registry.dispatch(event, this.editorRoot)
  }
}

export type { ShortcutDefinition, ShortcutScope }
