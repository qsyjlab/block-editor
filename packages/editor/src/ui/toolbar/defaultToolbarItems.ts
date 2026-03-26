import { ToolbarItemType } from './ToolbarRegistry'
import { EditorCore } from '../../core/EditorCore'
import { InsertImageDialog } from './dialogs/insert-image-dialog'
import { InsertLinkDialog } from './dialogs/insert-link-dialog'
import { VersionHistoryDialog } from './dialogs/version-history-dialog'
import { resolveEditorI18n } from '../../i18n'
import type { EditorI18n } from '../../i18n'

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

export function buildDefaultToolbarItems(i18nInput?: string | Partial<EditorI18n> | null): ToolbarItemType[][] {
  const i18n = resolveEditorI18n(i18nInput)
  const t = i18n.toolbar

  return [
    [
      { type: 'button', label: t.undo, icon: 'undo', command: 'undo', shortcut: '⌘Z' },
      { type: 'button', label: t.redo, icon: 'redo', command: 'redo', shortcut: '⇧⌘Z' },
      {
        type: 'button',
        label: t.versionHistory,
        icon: 'fileText',
        onExecute: (core: EditorCore) => {
          new VersionHistoryDialog(core, i18n.dialogs.versionHistory, i18n.locale).show()
        },
      },
    ],
    [
      {
        type: 'dropdown',
        label: t.heading,
        icon: 'paragraph',
        width: '80px',
        layout: 'list',
        options: [
          { label: t.normal, icon: 'paragraph', value: 'paragraph', command: 'setParagraph', isActive: (editor) => editor.isActive('paragraph') },
          { label: t.heading1, icon: 'h1', value: 'h1', command: 'toggleHeading', args: { level: 1 }, isActive: (editor) => editor.isActive('heading', { level: 1 }) },
          { label: t.heading2, icon: 'h2', value: 'h2', command: 'toggleHeading', args: { level: 2 }, isActive: (editor) => editor.isActive('heading', { level: 2 }) },
          { label: t.heading3, icon: 'h3', value: 'h3', command: 'toggleHeading', args: { level: 3 }, isActive: (editor) => editor.isActive('heading', { level: 3 }) },
        ],
      },
      {
        type: 'dropdown',
        label: t.font,
        width: '100px',
        layout: 'list',
        options: FONT_FAMILIES.map((font) => ({
          label: font.label,
          value: font.value,
          command: font.value ? 'setFontFamily' : 'unsetFontFamily',
          args: font.value || undefined,
          isActive: (editor) =>
            font.value
              ? editor.isActive('textStyle', { fontFamily: font.value })
              : !editor.getAttributes('textStyle').fontFamily,
        })),
      },
      {
        type: 'dropdown',
        label: t.fontSize,
        width: '100px',
        layout: 'list',
        options: FONT_SIZES.map((size) => ({
          label: size.label,
          value: size.value,
          command: 'setFontSize',
          args: size.value,
          isActive: (editor) => editor.isActive('textStyle', { fontSize: size.value }),
        })),
      },
    ],
    [
      { type: 'button', label: t.bold, icon: 'bold', command: 'toggleBold', activeName: 'bold', shortcut: '⌘B' },
      { type: 'button', label: t.italic, icon: 'italic', command: 'toggleItalic', activeName: 'italic', shortcut: '⌘I' },
      { type: 'button', label: t.underline, icon: 'underline', command: 'toggleUnderline', activeName: 'underline', shortcut: '⌘U' },
      { type: 'button', label: t.strike, icon: 'strike', command: 'toggleStrike', activeName: 'strike', shortcut: '⇧⌘X' },
      { type: 'color', label: t.textColor, command: 'setColor' },
      { type: 'button', label: t.highlight, icon: 'highlighter', command: 'toggleHighlight', activeName: 'highlight', shortcut: '⇧⌘H' },
      { type: 'button', label: t.code, icon: 'code', command: 'toggleCode', activeName: 'code', shortcut: '⌘E' },
      { type: 'button', label: t.codeBlock, icon: 'code', command: 'toggleCodeBlock', activeName: 'codeBlock', shortcut: '⌥⌘C' },
      {
        type: 'button',
        label: t.clearFormatting,
        icon: 'clearFormatting',
        shortcut: '⌥⌘0',
        onExecute: (core: EditorCore) => {
          core.editor.chain().focus().unsetAllMarks().clearNodes().run()
        },
      },
    ],
    [
      {
        type: 'dropdown',
        label: t.align,
        icon: 'alignLeft',
        width: '40px',
        layout: 'row',
        options: [
          { label: t.left, icon: 'alignLeft', value: 'left', command: 'setTextAlign', args: 'left', isActive: (editor) => editor.isActive({ textAlign: 'left' }) },
          { label: t.center, icon: 'alignCenter', value: 'center', command: 'setTextAlign', args: 'center', isActive: (editor) => editor.isActive({ textAlign: 'center' }) },
          { label: t.right, icon: 'alignRight', value: 'right', command: 'setTextAlign', args: 'right', isActive: (editor) => editor.isActive({ textAlign: 'right' }) },
          { label: t.justify, icon: 'alignJustify', value: 'justify', command: 'setTextAlign', args: 'justify', isActive: (editor) => editor.isActive({ textAlign: 'justify' }) },
        ],
      },
      {
        type: 'dropdown',
        label: t.lineHeight,
        layout: 'list',
        options: LINE_HEIGHTS.map((lh) => ({
          label: lh.label,
          value: lh.value,
          command: 'setLineHeight',
          args: lh.value,
          isActive: (editor) => editor.isActive({ lineHeight: lh.value }),
        })),
      },
      { type: 'button', label: t.indent, icon: 'indent', command: 'indent', shortcut: '⌘]' },
      { type: 'button', label: t.outdent, icon: 'outdent', command: 'outdent', shortcut: '⌘[' },
      { type: 'button', label: t.bulletList, icon: 'list', command: 'toggleBulletList', activeName: 'bulletList', shortcut: '⇧⌘8' },
      { type: 'button', label: t.orderedList, icon: 'listOrdered', command: 'toggleOrderedList', activeName: 'orderedList', shortcut: '⇧⌘7' },
      { type: 'button', label: t.taskList, icon: 'task', command: 'toggleTaskList', activeName: 'taskList', shortcut: '⇧⌘9' },
      { type: 'button', label: t.blockquote, icon: 'quote', command: 'toggleBlockquote', activeName: 'blockquote', shortcut: '⇧⌘B' },
    ],
    [
      {
        type: 'button',
        label: t.insertTable,
        icon: 'table',
        command: 'insertTable',
        args: { rows: 3, cols: 3, withHeaderRow: false },
      },
      {
        type: 'button',
        label: t.insertImage,
        icon: 'image',
        command: 'addImage',
        onExecute: (core: EditorCore) => {
          new InsertImageDialog(
            (url) => {
              core.editor.chain().focus().setImage({ src: url }).run()
            },
            i18n.dialogs.insertImage,
          ).show()
        },
      },
      {
        type: 'button',
        label: t.insertLink,
        icon: 'link',
        command: 'addLink',
        isActive: (editor) => editor.isActive('link'),
        onExecute: (core: EditorCore) => {
          const { from, to } = core.editor.state.selection
          const text = core.editor.state.doc.textBetween(from, to, ' ')

          new InsertLinkDialog(
            (url, linkText) => {
              core.editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .insertContent({
                  type: 'text',
                  text: linkText,
                  marks: [{ type: 'link', attrs: { href: url } }],
                })
                .run()
            },
            text,
            '',
            i18n.dialogs.insertLink,
          ).show()
        },
      },
      {
        type: 'button',
        label: t.horizontalRule,
        icon: 'minus',
        command: 'setHorizontalRule',
      },
      {
        type: 'button',
        label: t.callout,
        icon: 'info',
        onExecute: (core: EditorCore) => {
          core.editor.commands.insertCallout('info')
        },
      },
    ],
    [
      {
        type: 'dropdown',
        label: t.file,
        icon: 'fileText',
        width: '88px',
        layout: 'list',
        options: [
          {
            label: t.importDocx,
            icon: 'upload',
            value: 'import-docx',
            onExecute: (core: EditorCore) => core.importer.triggerImport(),
          },
          {
            label: t.importMarkdown,
            icon: 'upload',
            value: 'import-markdown',
            onExecute: (core: EditorCore) => core.markdownImporter.triggerImport(),
          },
          {
            label: t.exportWord,
            icon: 'file',
            value: 'export-docx',
            onExecute: (core: EditorCore) => void core.exporter.exportToDocx(),
          },
          {
            label: t.exportPdf,
            icon: 'fileText',
            value: 'export-pdf',
            onExecute: (core: EditorCore) => void core.exporter.exportToPdf(),
          },
          {
            label: t.exportMarkdown,
            icon: 'fileText',
            value: 'export-markdown',
            onExecute: (core: EditorCore) => void core.exporter.exportToMarkdown(),
          },
          {
            label: t.markdownRegression,
            icon: 'fileText',
            value: 'markdown-regression',
            onExecute: async (core: EditorCore) => {
              const result = await core.runMarkdownRegressionMatrix()
              const passed = result.filter((item) => item.passed).length
              console.table(
                result.map((item) => ({
                  name: item.name,
                  passed: item.passed,
                  missing: item.missing.join(' | '),
                })),
              )
              alert(t.markdownRegressionResult(passed, result.length))
            },
          },
          {
            label: t.performanceBaseline,
            icon: 'fileText',
            value: 'performance-baseline',
            onExecute: async (core: EditorCore) => {
              const baseline = await core.runPerformanceBenchmark({ paragraphs: 2000, selectionOps: 200 })
              console.table(baseline)
              alert(t.performanceBaselineResult(baseline.setContentMs, baseline.selectionSweepMs))
            },
          },
        ],
      },
    ],
    [
      {
        type: 'button',
        label: t.addComment,
        icon: 'comment',
        command: 'addComment',
        shortcut: '⌥⌘M',
        onExecute: (core: EditorCore) => {
          core.events.emit('openCommentPanel')
        },
      },
    ],
  ]
}

export const defaultToolbarItems: ToolbarItemType[][] = buildDefaultToolbarItems()
