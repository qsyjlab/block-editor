import type { EditorCore } from '../../core/EditorCore'
import type { ShortcutScope } from '../../core/ShortcutRegistry'
import type { ToolbarItemType } from './ToolbarRegistry'

function applyOnItem(
  item: ToolbarItemType,
  editorCore: EditorCore,
  scopes?: ShortcutScope[],
): ToolbarItemType {
  const shortcutManager = (
    editorCore as unknown as {
      shortcuts?: { getShortcutForCommand?: (command: string, scopes?: ShortcutScope[]) => string }
    }
  ).shortcuts

  if (item.type === 'button' && item.command) {
    const shortcut = shortcutManager?.getShortcutForCommand?.(item.command, scopes)
    if (shortcut) {
      return {
        ...item,
        shortcut,
      }
    }
  }
  return item
}

export function applyShortcutHintsToItems(
  items: ToolbarItemType[],
  editorCore: EditorCore,
  scopes?: ShortcutScope[],
): ToolbarItemType[] {
  return items.map((item) => applyOnItem(item, editorCore, scopes))
}

export function applyShortcutHintsToGroups(
  groups: ToolbarItemType[][],
  editorCore: EditorCore,
  scopes?: ShortcutScope[],
): ToolbarItemType[][] {
  return groups.map((group) => applyShortcutHintsToItems(group, editorCore, scopes))
}
