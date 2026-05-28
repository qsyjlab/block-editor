import type { Selection } from 'prosemirror-state'

/** ProseMirror table CellSelection (anchor/head cells). */
export function isCellSelection(selection: Selection): boolean {
  const maybe = selection as Selection & {
    $anchorCell?: unknown
    $headCell?: unknown
    isColSelection?: () => boolean
    isRowSelection?: () => boolean
  }
  return (
    typeof maybe.isColSelection === 'function' ||
    typeof maybe.isRowSelection === 'function' ||
    (maybe.$anchorCell != null && maybe.$headCell != null)
  )
}
