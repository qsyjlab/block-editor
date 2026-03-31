import { Editor } from '@tiptap/core'
import { EditorCore } from '../../core/EditorCore'

export interface ToolbarItemConfig {
  type: 'button'
  id?: string
  label: string
  tooltip?: string
  icon?: string
  command?: string
  args?: any
  activeName?: string | Record<string, any>
  shortcut?: string
  // Custom execution logic (e.g. for export/import)
  onExecute?: (editorCore: EditorCore) => void
  // Custom active state logic
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
}

export interface DropdownOptionConfig {
  id?: string
  label: string
  tooltip?: string
  icon?: string
  value: string
  command?: string
  args?: any
  onExecute?: (editorCore: EditorCore) => void | Promise<void>
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
}

export interface ToolbarDropdownConfig {
  type: 'dropdown'
  id?: string
  label: string
  tooltip?: string
  icon?: string
  width?: string
  options: DropdownOptionConfig[]
  layout?: 'list' | 'row'
  isDisabled?: (editor: Editor) => boolean
}

export interface ToolbarColorConfig {
  type: 'color'
  id?: string
  label: string
  tooltip?: string
  command: string
  isDisabled?: (editor: Editor) => boolean
}

export interface ToolbarDividerConfig {
  type: 'divider'
}

export type ToolbarItemType =
  | ToolbarItemConfig
  | ToolbarDropdownConfig
  | ToolbarColorConfig
  | ToolbarDividerConfig

export class ToolbarRegistry {
  private static items: ToolbarItemType[][] = []

  static registerGroup(items: ToolbarItemType[]) {
    this.items.push(items)
  }

  static getItems(): ToolbarItemType[][] {
    return this.items
  }

  static clear() {
    this.items = []
  }
}
