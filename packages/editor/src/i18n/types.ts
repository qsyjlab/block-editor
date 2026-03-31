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
  findReplace: string
  tableToolbar: string
  tableBackgroundColor: string
  tableColumnOperations: string
  tableRowOperations: string
  tableOperations: string
  addColumnBefore: string
  addColumnAfter: string
  deleteColumn: string
  addRowBefore: string
  addRowAfter: string
  deleteRow: string
  mergeCells: string
  splitCell: string
  deleteTable: string
}

export interface FindReplaceI18n {
  findPlaceholder: string
  replacePlaceholder: string
  previous: string
  next: string
  replace: string
  replaceAll: string
  toggleReplace: string
  close: string
  noResult: string
  empty: string
  counter: (current: number, total: number) => string
}

export interface InsertLinkDialogI18n {
  title: string
  subtitle: string
  closeDialogAriaLabel: string
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
  closeDialogAriaLabel: string
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
  closeDialogAriaLabel: string
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
  selectSnapshotDetail: string
  diffView: string
  blameView: string
  blankBaseline: string
  diffSummary: (baseLabel: string, added: number, deleted: number, modified: number) => string
  noDiff: string
  noBlameLines: string
  fullDiffHeader: (baseLabel: string) => string
  fullDiffSubtitle: (currentLabel: string, baseLabel: string, timeText: string) => string
}

export interface DialogI18n {
  insertLink: InsertLinkDialogI18n
  insertImage: InsertImageDialogI18n
  versionHistory: VersionHistoryDialogI18n
}

export interface CommentPanelI18n {
  panelAriaLabel: string
  title: string
  filterAll: string
  filterOpen: string
  filterResolved: string
  filterAriaPrefix: string
  draftPlaceholder: string
  draftAriaLabel: string
  createButton: string
  createButtonAriaLabel: string
  selectionQuoteAriaLabel: string
  selectionQuoteTitle: string
  selectionQuotePrefix: string
  selectionHintEmpty: string
  selectionHintReady: string
  emptyNoComments: string
  emptyResolved: string
  threadJumpTitle: string
  resolveAction: string
  reopenAction: string
  deleteAction: string
  replyPlaceholder: string
  replyAriaLabel: string
  replyButton: string
  replyButtonAriaLabel: string
  currentUser: string
}

export interface BlockHandleI18n {
  handleAriaLabel: string
  menuAriaLabel: string
  moveUp: string
  moveDown: string
  duplicateBlock: string
  copyBlockLink: string
  deleteBlock: string
  toParagraph: string
  toHeading1: string
  toHeading2: string
  toHeading3: string
  toBulletList: string
  toOrderedList: string
  toTaskList: string
  toBlockquote: string
  addToMultiSelect: string
  copyLinkPromptTitle: string
}

export interface BlockMultiSelectBarI18n {
  toolbarAriaLabel: string
  moveUp: string
  moveDown: string
  deleteSelected: string
  toParagraph: string
  toBlockquote: string
  toTaskList: string
  toBulletList: string
  toOrderedList: string
  toCallout: string
  clearSelection: string
  selectedCount: (count: number) => string
}

export interface SlashCommandI18n {
  editorPlaceholder: string
  menuAriaLabel: string
  paragraphTitle: string
  paragraphDescription: string
  heading1Title: string
  heading1Description: string
  heading2Title: string
  heading2Description: string
  heading3Title: string
  heading3Description: string
  bulletListTitle: string
  bulletListDescription: string
  orderedListTitle: string
  orderedListDescription: string
  taskListTitle: string
  taskListDescription: string
  blockquoteTitle: string
  blockquoteDescription: string
  codeBlockTitle: string
  codeBlockDescription: string
  horizontalRuleTitle: string
  horizontalRuleDescription: string
  tableTitle: string
  tableDescription: string
  calloutTitle: string
  calloutDescription: string
}

export interface ColorPickerI18n {
  presetColors: string
  customColor: string
}

export interface CommentExtensionI18n {
  defaultAuthor: string
  quickCommentFallback: string
  quickCommentFromSelection: (selectionText: string) => string
}

export interface VersionHistoryCoreI18n {
  defaultAuthorName: string
  initialSnapshotLabel: string
  autoSnapshotLabel: string
  manualSnapshotLabel: string
  beforeRestoreSnapshotLabel: string
  unknownAuthor: string
  emptyDocument: string
}

export interface ImageEnhancedI18n {
  captionPlaceholder: string
  alignLeft: string
  alignCenter: string
  alignRight: string
  alignFull: string
  previewImage: string
  previewLoading: string
  previewLoadFailed: string
  previewPrev: string
  previewNext: string
  previewZoomIn: string
  previewZoomOut: string
  previewRotate: string
  previewDownload: string
  previewScale: string
  closePreview: string
}

export interface CalloutI18n {
  infoLabel: string
  successLabel: string
  warningLabel: string
  dangerLabel: string
  switchTypeTitle: string
}

export interface CodeBlockI18n {
  blockTitle: string
  searchLanguagePlaceholder: string
  wrap: string
  copy: string
  toggleWrapTitle: string
  copyTitle: string
}

export interface EditorI18n {
  locale: string
  toolbar: ToolbarI18n
  outline: OutlineI18n
  dialogs: DialogI18n
  commentPanel: CommentPanelI18n
  blockHandle: BlockHandleI18n
  blockMultiSelectBar: BlockMultiSelectBarI18n
  slashCommand: SlashCommandI18n
  colorPicker: ColorPickerI18n
  commentExtension: CommentExtensionI18n
  versionHistoryCore: VersionHistoryCoreI18n
  imageEnhanced: ImageEnhancedI18n
  callout: CalloutI18n
  codeBlock: CodeBlockI18n
  findReplace: FindReplaceI18n
}
