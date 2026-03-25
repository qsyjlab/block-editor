import type { OutlineI18n } from '../ui/Outline'

export interface ToolbarI18n {
  more: string
  undo: string
  redo: string
  versionHistory: string
  heading: string
  normal: string
  heading1: string
  heading2: string
  heading3: string
  font: string
  fontSize: string
  bold: string
  italic: string
  underline: string
  strike: string
  textColor: string
  highlight: string
  code: string
  codeBlock: string
  clearFormatting: string
  align: string
  left: string
  center: string
  right: string
  justify: string
  lineHeight: string
  indent: string
  outdent: string
  bulletList: string
  orderedList: string
  taskList: string
  blockquote: string
  insertTable: string
  insertImage: string
  insertLink: string
  horizontalRule: string
  callout: string
  file: string
  importDocx: string
  importMarkdown: string
  exportWord: string
  exportPdf: string
  exportMarkdown: string
  markdownRegression: string
  markdownRegressionResult: (passed: number, total: number) => string
  performanceBaseline: string
  performanceBaselineResult: (setContentMs: number, selectionMs: number) => string
  addComment: string
}

export interface InsertLinkDialogI18n {
  title: string
  subtitle: string
  urlLabel: string
  urlPlaceholder: string
  textLabel: string
  textOptionalHint: string
  textPlaceholder: string
  cancel: string
  insert: string
  update: string
}

export interface InsertImageDialogI18n {
  title: string
  subtitle: string
  tabUrl: string
  tabUpload: string
  urlLabel: string
  urlPlaceholder: string
  preview: string
  invalidImage: string
  cancel: string
  insert: string
  uploadHint: string
  uploadClick: string
  uploadSupport: string
}

export interface VersionHistoryDialogI18n {
  title: string
  subtitle: string
  tips: string
  saveSnapshot: string
  manualSnapshotLabel: string
  noSnapshots: string
  sourceAuto: string
  sourceManual: string
  sourceRestore: string
  viewChanges: string
  collapse: string
  restoreToThis: string
  restoreConfirm: string
  restoreCompareTip: (previousLabel: string) => string
  noChanges: string
  fullDiff: string
  detailUnavailable: string
  completeDiffTitle: string
  oldLine: string
  newLine: string
  oldVersion: string
  blankBase: string
}

export interface DialogI18n {
  insertLink: InsertLinkDialogI18n
  insertImage: InsertImageDialogI18n
  versionHistory: VersionHistoryDialogI18n
}

export interface EditorI18n {
  locale: string
  toolbar: ToolbarI18n
  outline: OutlineI18n
  dialogs: DialogI18n
}
