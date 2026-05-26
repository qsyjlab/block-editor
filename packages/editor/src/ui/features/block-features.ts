import type { Editor } from '@tiptap/core'
import type { EditorCore } from '../../core/EditorCore'
import { resolveEditorI18n } from '../../i18n'
import type { EditorI18n } from '../../i18n'
import type { SlashCommandItem } from '../../extensions/SlashCommand'
import type { ToolbarItemType } from '../toolbar/ToolbarRegistry'
import { icons } from '../toolbar/icons'

export type FeatureSurface = 'toolbar' | 'selection-toolbar' | 'slash' | 'block-handle' | 'insert-menu'
export type FeatureGroup = 'block-style' | 'list' | 'insert'

export interface EditorFeature {
  id: string
  group: FeatureGroup
  surfaces: FeatureSurface[]
  label: string
  description?: string
  icon: string
  toolbarIcon?: string
  command?: string
  args?: any
  activeName?: string | Record<string, any>
  keywords?: string[]
  isActive?: (editor: Editor) => boolean
  run?: (ctx: FeatureRunContext) => void
}

export interface FeatureRunContext {
  editor: Editor
  core?: EditorCore
}

export interface BlockHandleFeatureItem {
  id: string
  label: string
  icon: string
  action: () => void
  danger?: boolean
}

export interface BlockHandleFeatureContext {
  i18nInput?: string | Partial<EditorI18n> | null
  labelOverrides?: Record<string, string>
  runCommand: (name: string, attrs?: any) => void
  replaceCurrentBlockWith: (content: unknown) => void
  moveBlock?: (direction: 1 | -1) => void
  duplicateBlock?: () => void
  deleteBlock?: () => void
  copyBlockLink?: () => void
  addToMultiSelect?: () => void
  insertParagraphBelow?: () => void
  openCommentPanel?: () => void
  promptImageSrc?: () => string | null
}

function runFeatureCommand(feature: EditorFeature, ctx: FeatureRunContext) {
  if (feature.run) {
    feature.run(ctx)
    return
  }

  if (!feature.command) return
  const chain = ctx.editor.chain().focus()
  const command = (chain as any)[feature.command]
  if (typeof command !== 'function') return

  if (feature.args === undefined) {
    command.call(chain).run()
  } else {
    command.call(chain, feature.args).run()
  }
}

function createTableJson(rows = 3, cols = 3) {
  return {
    type: 'table',
    content: Array.from({ length: rows }, () => ({
      type: 'tableRow',
      content: Array.from({ length: cols }, () => ({
        type: 'tableCell',
        content: [{ type: 'paragraph' }],
      })),
    })),
  }
}

export function createBlockFeatures(
  i18nInput?: string | Partial<EditorI18n> | null,
): EditorFeature[] {
  const i18n = resolveEditorI18n(i18nInput)
  const toolbar = i18n.toolbar
  const slash = i18n.slashCommand

  return [
    {
      id: 'paragraph',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.normal,
      description: slash.paragraphDescription,
      icon: '<span class="be-block-handle-insert-text-icon">T</span>',
      toolbarIcon: 'paragraph',
      command: 'setParagraph',
      keywords: [slash.paragraphTitle, 'paragraph', 'text', 'p'],
      isActive: (editor) => editor.isActive('paragraph'),
    },
    {
      id: 'heading1',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.heading1,
      description: slash.heading1Description,
      icon: '<span class="be-block-handle-insert-text-icon">H1</span>',
      toolbarIcon: 'h1',
      command: 'toggleHeading',
      args: { level: 1 },
      keywords: ['h1', slash.heading1Title.replace(/\s+/g, ''), 'heading1', 'title'],
      isActive: (editor) => editor.isActive('heading', { level: 1 }),
    },
    {
      id: 'heading2',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.heading2,
      description: slash.heading2Description,
      icon: '<span class="be-block-handle-insert-text-icon">H2</span>',
      toolbarIcon: 'h2',
      command: 'toggleHeading',
      args: { level: 2 },
      keywords: ['h2', slash.heading2Title.replace(/\s+/g, ''), 'heading2'],
      isActive: (editor) => editor.isActive('heading', { level: 2 }),
    },
    {
      id: 'heading3',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.heading3,
      description: slash.heading3Description,
      icon: '<span class="be-block-handle-insert-text-icon">H3</span>',
      toolbarIcon: 'h3',
      command: 'toggleHeading',
      args: { level: 3 },
      keywords: ['h3', slash.heading3Title.replace(/\s+/g, ''), 'heading3'],
      isActive: (editor) => editor.isActive('heading', { level: 3 }),
    },
    {
      id: 'bulletList',
      group: 'list',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.bulletList,
      description: slash.bulletListDescription,
      icon: icons.list,
      toolbarIcon: 'list',
      command: 'toggleBulletList',
      activeName: 'bulletList',
      keywords: ['ul', 'bullet', slash.bulletListTitle, 'list'],
    },
    {
      id: 'orderedList',
      group: 'list',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.orderedList,
      description: slash.orderedListDescription,
      icon: icons.listOrdered,
      toolbarIcon: 'listOrdered',
      command: 'toggleOrderedList',
      activeName: 'orderedList',
      keywords: ['ol', slash.orderedListTitle, 'ordered', 'number'],
    },
    {
      id: 'taskList',
      group: 'list',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.taskList,
      description: slash.taskListDescription,
      icon: icons.task,
      toolbarIcon: 'task',
      command: 'toggleTaskList',
      activeName: 'taskList',
      keywords: ['task', 'todo', slash.taskListTitle, 'check', 'checkbox'],
    },
    {
      id: 'blockquote',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.blockquote,
      description: slash.blockquoteDescription,
      icon: icons.quote,
      toolbarIcon: 'quote',
      command: 'toggleBlockquote',
      activeName: 'blockquote',
      keywords: ['quote', 'blockquote', slash.blockquoteTitle],
    },
    {
      id: 'codeBlock',
      group: 'block-style',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.codeBlock,
      description: slash.codeBlockDescription,
      icon: icons.code,
      toolbarIcon: 'code',
      command: 'toggleCodeBlock',
      activeName: 'codeBlock',
      keywords: ['code', 'codeblock', slash.codeBlockTitle, 'pre'],
    },
    {
      id: 'horizontalRule',
      group: 'insert',
      surfaces: ['toolbar', 'slash', 'block-handle', 'insert-menu'],
      label: toolbar.horizontalRule,
      description: slash.horizontalRuleDescription,
      icon: icons.minus,
      toolbarIcon: 'minus',
      command: 'setHorizontalRule',
      keywords: ['hr', 'divider', slash.horizontalRuleTitle, 'rule'],
    },
    {
      id: 'table',
      group: 'insert',
      surfaces: ['toolbar', 'slash', 'insert-menu'],
      label: toolbar.insertTable,
      description: slash.tableDescription,
      icon: icons.table,
      toolbarIcon: 'table',
      command: 'insertTable',
      args: { rows: 3, cols: 3, withHeaderRow: false },
      keywords: ['table', slash.tableTitle],
    },
    {
      id: 'callout',
      group: 'insert',
      surfaces: ['toolbar', 'slash', 'insert-menu'],
      label: toolbar.callout,
      description: slash.calloutDescription,
      icon: icons.info,
      toolbarIcon: 'info',
      keywords: ['callout', 'info', slash.calloutTitle, 'alert'],
      run: ({ editor }) => {
        ;(editor.commands as any).insertCallout('info')
      },
    },
  ]
}

export function getBlockFeaturesByIds(
  ids: string[],
  i18nInput?: string | Partial<EditorI18n> | null,
): EditorFeature[] {
  const map = new Map(createBlockFeatures(i18nInput).map((feature) => [feature.id, feature]))
  return ids.map((id) => map.get(id)).filter(Boolean) as EditorFeature[]
}

export function featureToToolbarButton(feature: EditorFeature): ToolbarItemType {
  return {
    type: 'button',
    id: feature.id,
    label: feature.label,
    icon: feature.toolbarIcon,
    command: feature.command,
    args: feature.args,
    activeName: feature.activeName,
    isActive: feature.isActive,
    onExecute: feature.run ? (core) => feature.run?.({ editor: core.editor, core }) : undefined,
  }
}

export function createBlockTypeDropdown(
  i18nInput?: string | Partial<EditorI18n> | null,
): ToolbarItemType {
  const i18n = resolveEditorI18n(i18nInput)
  const features = getBlockFeaturesByIds(['paragraph', 'heading1', 'heading2', 'heading3'], i18n)

  return {
    type: 'dropdown',
    id: 'blockType',
    label: i18n.toolbar.heading,
    icon: 'paragraph',
    width: '80px',
    layout: 'list',
    options: features.map((feature) => ({
      id: feature.id,
      label: feature.label,
      icon: feature.toolbarIcon,
      value: feature.id,
      command: feature.command,
      args: feature.args,
      isActive: feature.isActive,
    })),
  }
}

export function createSlashCommandItems(
  i18nInput?: string | Partial<EditorI18n> | null,
): SlashCommandItem[] {
  return createBlockFeatures(i18nInput)
    .filter((feature) => feature.surfaces.includes('slash'))
    .map((feature) => ({
      title: feature.label,
      description: feature.description || feature.label,
      icon: feature.icon,
      keywords: feature.keywords || [feature.label],
      command: (editor) => runFeatureCommand(feature, { editor }),
    }))
}

export function createBlockHandleFeatureItems(
  ctx: BlockHandleFeatureContext,
  ids: string[],
): BlockHandleFeatureItem[] {
  const i18n = resolveEditorI18n(ctx.i18nInput)
  const handleLabelMap: Record<string, string> = {
    paragraph: i18n.blockHandle.toParagraph,
    heading1: i18n.blockHandle.toHeading1,
    heading2: i18n.blockHandle.toHeading2,
    heading3: i18n.blockHandle.toHeading3,
    bulletList: i18n.blockHandle.toBulletList,
    orderedList: i18n.blockHandle.toOrderedList,
    taskList: i18n.blockHandle.toTaskList,
    codeBlock: i18n.blockHandle.toCodeBlock,
    blockquote: i18n.blockHandle.toBlockquote,
    horizontalRule: i18n.blockHandle.toHorizontalRule,
    table: i18n.blockHandle.insertTable,
    callout: i18n.blockHandle.insertCallout,
  }

  return getBlockFeaturesByIds(ids, ctx.i18nInput).map((feature) => {
    let action = () => {
      if (feature.command) ctx.runCommand(feature.command, feature.args)
      else if (feature.run) {
        // `block-handle` does not own EditorCore. Use the underlying command names where possible.
        if (feature.id === 'callout') {
          ctx.replaceCurrentBlockWith({
            type: 'callout',
            attrs: { calloutType: 'info' },
            content: [{ type: 'paragraph' }],
          })
        }
      }
    }

    if (feature.id === 'horizontalRule') {
      action = () => ctx.replaceCurrentBlockWith({ type: 'horizontalRule' })
    } else if (feature.id === 'table') {
      action = () => ctx.replaceCurrentBlockWith(createTableJson())
    } else if (feature.id === 'callout') {
      action = () =>
        ctx.replaceCurrentBlockWith({
          type: 'callout',
          attrs: { calloutType: 'info' },
          content: [{ type: 'paragraph' }],
        })
    }

    return {
      id: feature.id,
      label: ctx.labelOverrides?.[feature.id] || handleLabelMap[feature.id] || feature.label,
      icon: feature.icon,
      action,
    }
  })
}

export function createImageInsertHandleItem(ctx: BlockHandleFeatureContext): BlockHandleFeatureItem {
  return {
    id: 'image',
    label: ctx.labelOverrides?.image || resolveEditorI18n(ctx.i18nInput).blockHandle.insertImage,
    icon: icons.image,
    action: () => {
      const src = (ctx.promptImageSrc || (() => window.prompt('请输入图片 URL')))()
      if (src) ctx.replaceCurrentBlockWith({ type: 'image', attrs: { src } })
    },
  }
}

export function createBlockHandleActionGroups(
  ctx: BlockHandleFeatureContext,
): BlockHandleFeatureItem[][] {
  const i18n = resolveEditorI18n(ctx.i18nInput).blockHandle

  return [
    [
      {
        id: 'moveUp',
        label: i18n.moveUp,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
        action: () => ctx.moveBlock?.(-1),
      },
      {
        id: 'moveDown',
        label: i18n.moveDown,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
        action: () => ctx.moveBlock?.(1),
      },
    ],
    [
      {
        id: 'comment',
        label: ctx.labelOverrides?.comment || i18n.comment,
        icon: icons.comment,
        action: () => ctx.openCommentPanel?.(),
      },
      {
        id: 'duplicateBlock',
        label: i18n.duplicateBlock,
        icon: icons.copy,
        action: () => ctx.duplicateBlock?.(),
      },
      {
        id: 'cutBlock',
        label: ctx.labelOverrides?.cutBlock || i18n.cutBlock,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>',
        action: () => ctx.deleteBlock?.(),
      },
      {
        id: 'deleteBlock',
        label: i18n.deleteBlock,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
        action: () => ctx.deleteBlock?.(),
        danger: true,
      },
    ],
    [
      {
        id: 'copyBlockLink',
        label: i18n.copyBlockLink,
        icon: icons.link,
        action: () => ctx.copyBlockLink?.(),
      },
      {
        id: 'addToMultiSelect',
        label: i18n.addToMultiSelect,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        action: () => ctx.addToMultiSelect?.(),
      },
      {
        id: 'insertParagraphBelow',
        label: ctx.labelOverrides?.insertParagraphBelow || i18n.insertParagraphBelow,
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
        action: () => ctx.insertParagraphBelow?.(),
      },
    ],
  ]
}
