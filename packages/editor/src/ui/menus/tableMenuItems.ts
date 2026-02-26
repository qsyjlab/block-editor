import { ToolbarItemType } from '../toolbar/ToolbarRegistry'

export const tableMenuButtons: ToolbarItemType[] = [
    { type: 'divider' },
    { type: 'color', label: 'Background Color', command: 'setCellAttribute' }, // This needs ToolbarColorPicker support for cell background
    { 
        type: 'dropdown', 
        label: 'Align', 
        icon: 'alignLeft', 
        width: 'auto', 
        layout: 'row',
        options: [
            { label: 'Align Left', icon: 'alignLeft', value: 'left', command: 'setTextAlign', args: 'left', isActive: (editor) => editor.isActive({ textAlign: 'left' }) },
            { label: 'Align Center', icon: 'alignCenter', value: 'center', command: 'setTextAlign', args: 'center', isActive: (editor) => editor.isActive({ textAlign: 'center' }) },
            { label: 'Align Right', icon: 'alignRight', value: 'right', command: 'setTextAlign', args: 'right', isActive: (editor) => editor.isActive({ textAlign: 'right' }) },
        ]
    },
    { type: 'divider' },
    { type: 'button', label: 'Bold', icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
    { type: 'button', label: 'Strike', icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
    { type: 'button', label: 'Italic', icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
    { type: 'button', label: 'Underline', icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
    { type: 'button', label: 'Code', icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
    { type: 'button', label: 'Code Block', icon: 'code', command: 'toggleCodeBlock', activeName: 'codeBlock', shortcut: '⌥⌘C' },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: 'Column Operations', 
        icon: 'tableColumnBefore', // Generic column icon
        width: 'auto',
        layout: 'row',
        options: [
            { label: 'Add Column Before', icon: 'tableColumnBefore', value: 'addColumnBefore', command: 'addColumnBefore', isDisabled: (editor) => !editor.can().addColumnBefore() },
            { label: 'Add Column After', icon: 'tableColumnAfter', value: 'addColumnAfter', command: 'addColumnAfter', isDisabled: (editor) => !editor.can().addColumnAfter() },
            { label: 'Delete Column', icon: 'tableDeleteColumn', value: 'deleteColumn', command: 'deleteColumn', isDisabled: (editor) => !editor.can().deleteColumn() },
        ]
    },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: 'Row Operations', 
        icon: 'tableRowBefore', // Generic row icon
        width: 'auto',
        layout: 'row',
        options: [
            { label: 'Add Row Before', icon: 'tableRowBefore', value: 'addRowBefore', command: 'addRowBefore', isDisabled: (editor) => !editor.can().addRowBefore() },
            { label: 'Add Row After', icon: 'tableRowAfter', value: 'addRowAfter', command: 'addRowAfter', isDisabled: (editor) => !editor.can().addRowAfter() },
            { label: 'Delete Row', icon: 'tableDeleteRow', value: 'deleteRow', command: 'deleteRow', isDisabled: (editor) => !editor.can().deleteRow() },
        ]
    },
    { type: 'divider' },
    { 
        type: 'dropdown', 
        label: 'Table Operations', 
        icon: 'tableMerge', 
        width: 'auto',
        layout: 'row',
        options: [
            { label: 'Merge Cells', icon: 'tableMerge', value: 'mergeCells', command: 'mergeCells', isDisabled: (editor) => !editor.can().mergeCells() },
            { label: 'Split Cell', icon: 'tableSplit', value: 'splitCell', command: 'splitCell', isDisabled: (editor) => !editor.can().splitCell() },
        ]
    },
    { type: 'divider' },
    { type: 'button', label: 'Delete Table', icon: 'tableDelete', command: 'deleteTable', isDisabled: (editor) => !editor.can().deleteTable() },
]
