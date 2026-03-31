import { enUS } from './en'
import { zhCN } from './zh'
import type { EditorI18n } from './types'

export * from './types'
export { zhCN, enUS }

export function resolveEditorI18n(input?: string | Partial<EditorI18n> | null): EditorI18n {
  if (!input) return zhCN

  if (typeof input === 'string') {
    return input.toLowerCase().startsWith('en') ? enUS : zhCN
  }

  const locale = (input.locale || zhCN.locale).toLowerCase()
  const base = locale.startsWith('en') ? enUS : zhCN

  return {
    locale: input.locale || base.locale,
    toolbar: {
      ...base.toolbar,
      ...input.toolbar,
    },
    outline: {
      ...base.outline,
      ...input.outline,
    },
    dialogs: {
      ...base.dialogs,
      ...input.dialogs,
      insertLink: {
        ...base.dialogs.insertLink,
        ...input.dialogs?.insertLink,
      },
      insertImage: {
        ...base.dialogs.insertImage,
        ...input.dialogs?.insertImage,
      },
      versionHistory: {
        ...base.dialogs.versionHistory,
        ...input.dialogs?.versionHistory,
      },
    },
    commentPanel: {
      ...base.commentPanel,
      ...input.commentPanel,
    },
    blockHandle: {
      ...base.blockHandle,
      ...input.blockHandle,
    },
    blockMultiSelectBar: {
      ...base.blockMultiSelectBar,
      ...input.blockMultiSelectBar,
    },
    slashCommand: {
      ...base.slashCommand,
      ...input.slashCommand,
    },
    colorPicker: {
      ...base.colorPicker,
      ...input.colorPicker,
    },
    commentExtension: {
      ...base.commentExtension,
      ...input.commentExtension,
    },
    versionHistoryCore: {
      ...base.versionHistoryCore,
      ...input.versionHistoryCore,
    },
    imageEnhanced: {
      ...base.imageEnhanced,
      ...input.imageEnhanced,
    },
    callout: {
      ...base.callout,
      ...input.callout,
    },
    codeBlock: {
      ...base.codeBlock,
      ...input.codeBlock,
    },
    findReplace: {
      ...base.findReplace,
      ...input.findReplace,
    },
  }
}
