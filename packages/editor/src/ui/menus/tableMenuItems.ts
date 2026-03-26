import { resolveEditorI18n } from '../../i18n'
import type { EditorI18n } from '../../i18n'
import { ToolbarItemType } from '../toolbar/ToolbarRegistry'

export function getTableMenuButtons(i18nInput?: string | Partial<EditorI18n> | null): ToolbarItemType[] {
    const i18n = resolveEditorI18n(i18nInput)
    const t = i18n.toolbar

    return [
    { type: 'divider' },
    { type: 'color', label: t.tableBackgroundColor, command: 'setCellAttribute' }, // This needs ToolbarColorPicker support for cell background
    { 
        type: 'dropdown', 
        label: t.align, 
        icon: 'alignLeft', 
        width: 'auto', 
        layout: 'row',
        options: [
            { label: t.left, icon: 'alignLeft', value: 'left', command: 'setTextAlign', args: 'left', isActive: (editor) => editor.isActive({ textAlign: 'left' }) },
            { label: t.center, icon: 'alignCenter', value: 'center', command: 'setTextAlign', args: 'center', isActive: (editor) => editor.isActive({ textAlign: 'center' }) },
            { label: t.right, icon: 'alignRight', value: 'right', command: 'setTextAlign', args: 'right', isActive: (editor) => editor.isActive({ textAlign: 'right' }) },
        ]
    },
    { type: 'divider' },
    { type: 'button', label: t.bold, icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
    { type: 'button', label: t.strike, icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
    { type: 'button', label: t.italic, icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
    { type: 'button', label: t.underline, icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
    { type: 'button', label: t.code, icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
    { type: 'button', label: t.codeBlock, icon: 'code', command: 'toggleCodeBlock', activeName: 'codeBlock', shortcut: '⌥⌘C' },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: t.tableColumnOperations, 
        icon: 'tableColumnBefore', // Generic column icon
        width: 'auto',
        layout: 'row',
        options: [
            { label: t.addColumnBefore, icon: 'tableColumnBefore', value: 'addColumnBefore', command: 'addColumnBefore', isDisabled: (editor) => !editor.can().addColumnBefore() },
            { label: t.addColumnAfter, icon: 'tableColumnAfter', value: 'addColumnAfter', command: 'addColumnAfter', isDisabled: (editor) => !editor.can().addColumnAfter() },
            { label: t.deleteColumn, icon: 'tableDeleteColumn', value: 'deleteColumn', command: 'deleteColumn', isDisabled: (editor) => !editor.can().deleteColumn() },
        ]
    },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: t.tableRowOperations, 
        icon: 'tableRowBefore', // Generic row icon
        width: 'auto',
        layout: 'row',
        options: [
            { label: t.addRowBefore, icon: 'tableRowBefore', value: 'addRowBefore', command: 'addRowBefore', isDisabled: (editor) => !editor.can().addRowBefore() },
            { label: t.addRowAfter, icon: 'tableRowAfter', value: 'addRowAfter', command: 'addRowAfter', isDisabled: (editor) => !editor.can().addRowAfter() },
            { label: t.deleteRow, icon: 'tableDeleteRow', value: 'deleteRow', command: 'deleteRow', isDisabled: (editor) => !editor.can().deleteRow() },
        ]
    },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: t.tableOperations, 
        icon: 'tableMerge', 
        width: 'auto',
        layout: 'row',
        options: [
            { label: t.mergeCells, icon: 'tableMerge', value: 'mergeCells', command: 'mergeCells', isDisabled: (editor) => !editor.can().mergeCells() },
            { label: t.splitCell, icon: 'tableSplit', value: 'splitCell', command: 'splitCell', isDisabled: (editor) => !editor.can().splitCell() },
        ]
    },
    { type: 'divider' },
    { type: 'button', label: t.deleteTable, icon: 'tableDelete', command: 'deleteTable', isDisabled: (editor) => !editor.can().deleteTable() },
  ]
}
