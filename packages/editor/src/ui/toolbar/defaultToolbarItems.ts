import { ToolbarItemType } from './ToolbarRegistry'
import { EditorCore } from '../../core/EditorCore'
import { InsertImageDialog } from './dialogs/insert-image-dialog'
import { InsertLinkDialog } from './dialogs/insert-link-dialog'
import { VersionHistoryDialog } from './dialogs/version-history-dialog'

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
  { label: 'Impact', value: 'Impact' },
]

const FONT_SIZES = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '30', value: '30px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
  { label: '60', value: '60px' },
  { label: '72', value: '72px' },
]

const LINE_HEIGHTS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
]

export const defaultToolbarItems: ToolbarItemType[][] = [
  // History
  [
    { type: 'button', label: 'Undo', icon: 'undo', command: 'undo', shortcut: '⌘Z' },
    { type: 'button', label: 'Redo', icon: 'redo', command: 'redo', shortcut: '⇧⌘Z' },
    {
      type: 'button',
      label: '版本历史',
      icon: 'fileText',
      onExecute: (core: EditorCore) => {
        new VersionHistoryDialog(core).show()
      }
    },
  ],
  // Typography Group 1: Headings & Fonts
  [
    { 
      type: 'dropdown', 
      label: 'Heading',
      icon: 'paragraph', 
      width: '80px', 
      layout: 'list',
      options: [
        { label: 'Normal', icon: 'paragraph', value: 'paragraph', command: 'setParagraph', isActive: (editor) => editor.isActive('paragraph') },
        { label: 'Heading 1', icon: 'h1', value: 'h1', command: 'toggleHeading', args: { level: 1 }, isActive: (editor) => editor.isActive('heading', { level: 1 }) },
        { label: 'Heading 2', icon: 'h2', value: 'h2', command: 'toggleHeading', args: { level: 2 }, isActive: (editor) => editor.isActive('heading', { level: 2 }) },
        { label: 'Heading 3', icon: 'h3', value: 'h3', command: 'toggleHeading', args: { level: 3 }, isActive: (editor) => editor.isActive('heading', { level: 3 }) },
      ]
    },
    {
      type: 'dropdown',
      label: 'Font',
      width: '100px',
      layout: 'list',
      options: FONT_FAMILIES.map(font => ({
        label: font.label,
        value: font.value,
        command: font.value ? 'setFontFamily' : 'unsetFontFamily',
        args: font.value || undefined,
        isActive: (editor) => font.value ? editor.isActive('textStyle', { fontFamily: font.value }) : !editor.getAttributes('textStyle').fontFamily
      }))
    },
    {
      type: 'dropdown',
      label: '字号',
      width: '100px',
      layout: 'list',
      options: FONT_SIZES.map(size => ({
        label: size.label,
        value: size.value,
        command: 'setFontSize',
        args: size.value,
        isActive: (editor) => editor.isActive('textStyle', { fontSize: size.value })
      }))
    },
  ],
  // Typography Group 2: Style & Color
  [
    { type: 'button', label: 'Bold', icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
    { type: 'button', label: 'Italic', icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
    { type: 'button', label: 'Underline', icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
    { type: 'button', label: 'Strike', icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
    { type: 'color', label: 'Text Color', command: 'setColor' },
    { type: 'button', label: 'Highlight', icon: 'highlighter', command: 'toggleHighlight', activeName: 'highlight', shortcut: '⇧⌘H' },
    { type: 'button', label: 'Code', icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
    { type: 'button', label: 'Code Block', icon: 'code', command: 'toggleCodeBlock', activeName: 'codeBlock', shortcut: '⌥⌘C' },
    {
      type: 'button',
      label: '清除格式',
      icon: 'clearFormatting',
      shortcut: '⌥⌘0',
      onExecute: (core: EditorCore) => {
        core.editor.chain().focus().unsetAllMarks().clearNodes().run()
      }
    },
  ],
  // Paragraph Group: Alignment & Line Height & Lists
  [
    { 
      type: 'dropdown', 
      label: 'Align',
      icon: 'alignLeft', 
      width: '40px', 
      layout: 'row',
      options: [
        { label: 'Left', icon: 'alignLeft', value: 'left', command: 'setTextAlign', args: 'left', isActive: (editor) => editor.isActive({ textAlign: 'left' }) },
        { label: 'Center', icon: 'alignCenter', value: 'center', command: 'setTextAlign', args: 'center', isActive: (editor) => editor.isActive({ textAlign: 'center' }) },
        { label: 'Right', icon: 'alignRight', value: 'right', command: 'setTextAlign', args: 'right', isActive: (editor) => editor.isActive({ textAlign: 'right' }) },
        { label: 'Justify', icon: 'alignJustify', value: 'justify', command: 'setTextAlign', args: 'justify', isActive: (editor) => editor.isActive({ textAlign: 'justify' }) },
      ]
    },
    {
      type: 'dropdown',
      label: 'Line Height',
      // width: '100px',
      layout: 'list',
      options: LINE_HEIGHTS.map(lh => ({
        label: lh.label,
        value: lh.value,
        command: 'setLineHeight',
        args: lh.value,
        isActive: (editor) => editor.isActive({ lineHeight: lh.value })
      }))
    },
    { type: 'button', label: '缩进', icon: 'indent', command: 'indent', shortcut: '⌘]' },
    { type: 'button', label: '减少缩进', icon: 'outdent', command: 'outdent', shortcut: '⌘[' },
    { type: 'button', label: 'Bullet List', icon: 'list', command: 'toggleBulletList', activeName: 'bulletList', shortcut: '⇧⌘8' },
    { type: 'button', label: 'Ordered List', icon: 'listOrdered', command: 'toggleOrderedList', activeName: 'orderedList', shortcut: '⇧⌘7' },
    { type: 'button', label: 'Task List', icon: 'task', command: 'toggleTaskList', activeName: 'taskList', shortcut: '⇧⌘9' },
    { type: 'button', label: 'Blockquote', icon: 'quote', command: 'toggleBlockquote', activeName: 'blockquote', shortcut: '⇧⌘B' },
  ],
  // Insert Group
  [
    { 
      type: 'button', 
      label: 'Insert Table', 
      icon: 'table', 
      command: 'insertTable', 
      args: { rows: 3, cols: 3, withHeaderRow: false } 
    },
    { 
      type: 'button', 
      label: 'Insert Image', 
      icon: 'image', 
      command: 'addImage', 
      onExecute: (core: EditorCore) => {
          new InsertImageDialog((url) => {
              core.editor.chain().focus().setImage({ src: url }).run()
          }).show()
      }
    },
    {
      type: 'button',
      label: 'Insert Link',
      icon: 'link',
      command: 'addLink',
      isActive: (editor) => editor.isActive('link'),
      onExecute: (core: EditorCore) => {
          const { from, to } = core.editor.state.selection
          const text = core.editor.state.doc.textBetween(from, to, ' ')
          
          new InsertLinkDialog((url, linkText) => {
              core.editor.chain().focus()
                  .extendMarkRange('link')
                  .insertContent({
                      type: 'text',
                      text: linkText,
                      marks: [{ type: 'link', attrs: { href: url } }]
                  })
                  .run()
          }, text).show()
      }
    },
    {
      type: 'button',
      label: '分割线',
      icon: 'minus',
      command: 'setHorizontalRule',
    },
    {
      type: 'button',
      label: 'Callout',
      icon: 'info',
      onExecute: (core: EditorCore) => {
        core.editor.commands.insertCallout('info')
      }
    },
  ],
  // Export Group
  [
    { 
      type: 'button', 
      label: 'Import DOCX', 
      icon: 'upload', 
      command: 'importDocx',
      onExecute: (core: EditorCore) => core.importer.triggerImport()
    },
    {
      type: 'button',
      label: 'Import Markdown',
      icon: 'upload',
      command: 'importMarkdown',
      onExecute: (core: EditorCore) => core.markdownImporter.triggerImport()
    },
    { 
      type: 'button', 
      label: 'Export to Word', 
      icon: 'file', 
      command: 'exportDocx',
      onExecute: (core: EditorCore) => core.exporter.exportToDocx()
    },
    { 
      type: 'button', 
      label: 'Export to PDF', 
      icon: 'fileText', 
      command: 'exportPdf',
      onExecute: (core: EditorCore) => core.exporter.exportToPdf()
    },
    {
      type: 'button',
      label: 'Export to Markdown',
      icon: 'fileText',
      command: 'exportMarkdown',
      onExecute: (core: EditorCore) => core.exporter.exportToMarkdown()
    },
  ],
  // Comment Group
  [
    {
      type: 'button',
      label: '添加评论',
      icon: 'comment',
      command: 'addComment',
      shortcut: '⌥⌘M',
      onExecute: (core: EditorCore) => {
        core.events.emit('toggleCommentPanel')
      },
    },
  ],
]
