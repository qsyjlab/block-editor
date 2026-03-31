import type { EditorCore } from '../../core/EditorCore'
import type { ToolbarItemType } from './ToolbarRegistry'
import { ToolbarItem } from './ToolbarItem'
import { ToolbarDropdown } from './ToolbarDropdown'
import { ColorPicker } from './color-picker/color-picker'

export function flattenToolbarGroups(groups: ToolbarItemType[][]): ToolbarItemType[] {
  return groups.flatMap((group, index) => {
    const chunk: ToolbarItemType[] = [...group]
    if (index < groups.length - 1) {
      chunk.push({ type: 'divider' })
    }
    return chunk
  })
}

export function createToolbarItemElement(
  item: ToolbarItemType,
  editorCore: EditorCore,
): HTMLElement | null {
  if (item.type === 'button') {
    return new ToolbarItem(item, editorCore).getElement()
  }

  if (item.type === 'dropdown') {
    return new ToolbarDropdown(item, editorCore).getElement()
  }

  if (item.type === 'color') {
    return new ColorPicker(item.label, editorCore).getElement()
  }

  if (item.type === 'divider') {
    const divider = document.createElement('div')
    divider.className = 'divider'
    return divider
  }

  return null
}
