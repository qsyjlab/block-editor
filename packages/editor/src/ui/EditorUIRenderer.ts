import { TextSelection } from 'prosemirror-state'
import { EditorCore } from '../core/EditorCore'
import { Toolbar } from './Toolbar'
import { Outline, OutlineI18n } from './Outline'
import { TableBubbleMenu } from './menus/TableBubbleMenu'
import { BlockMultiSelectBar } from './menus/block-multi-select-bar'
import { FindReplacePanel } from './menus/find-replace-panel'
import { CommentPanel } from './CommentPanel'
import { commentStore, type CommentThread } from '../extensions/Comment'
import { resolveEditorI18n } from '../i18n'
import type { EditorI18n } from '../i18n'
import type { EditorUIConfig } from './config/operation-bars'
import type {
  CommentPanelModuleInstance,
  EditorUIPlugins,
  EditorUILayoutSchema,
  EditorUIModuleDefinition,
  EditorUIModuleId,
  EditorUIModuleInstance,
  EditorUIRegion,
} from './modules/contracts'

export type ToolbarMode = 'top' | 'inline'
export type EditorThemeMode = 'light' | 'dark' | 'auto'

export interface EditorUILayoutSlots {
  toolbarContainer?: HTMLElement | null
  editorContainer: HTMLElement
  scrollContainer?: HTMLElement | null
  overlayContainer?: HTMLElement | null
  outlineContainer?: HTMLElement | null
  commentContainer?: HTMLElement | null
}

export interface EditorUILayoutBuilderParams {
  container: HTMLElement
  editorCore: EditorCore
  toolbarMode: ToolbarMode
}

export type EditorUILayoutPreset =
  | 'default'
  | 'minimal'
  | 'editor-outline'
  | 'editor-comment'
  | 'editor-outline-comment'

export interface EditorUILayoutDefinition {
  preset?: EditorUILayoutPreset
  builder?: (params: EditorUILayoutBuilderParams) => EditorUILayoutSlots
  regions?: EditorUILayoutSchema['regions']
  modules?: EditorUILayoutSchema['modules']
  plugins?: EditorUIPlugins
}

export interface EditorUIRendererOptions {
  toolbarMode?: ToolbarMode
  commentPanelDefaultVisible?: boolean
  theme?: EditorThemeMode
  i18n?: string | Partial<EditorI18n>
  outlineI18n?: Partial<OutlineI18n>
  uiConfig?: EditorUIConfig
  layoutBuilder?: (params: EditorUILayoutBuilderParams) => EditorUILayoutSlots
  layoutSchema?: EditorUILayoutSchema
  modules?: Partial<Record<EditorUIModuleId, EditorUIModuleDefinition>>
  plugins?: EditorUIPlugins
  layout?: EditorUILayoutDefinition
}

export interface OutlineDataItem {
  level: number
  text: string
  pos: number
  blockId?: string
}

export interface CommentPanelController {
  open: () => void
  close: () => void
  toggle: () => void
  setVisible: (visible: boolean) => void
  focusThread: (commentId: string) => void
  createFromSelection: () => boolean
}

function createPresetLayoutBuilder(
  preset: EditorUILayoutPreset,
): (params: EditorUILayoutBuilderParams) => EditorUILayoutSlots {
  return ({ container }) => {
    container.innerHTML = ''
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.minWidth = '0'
    container.style.minHeight = '0'

    const toolbarContainer = document.createElement('div')
    container.appendChild(toolbarContainer)

    const workspace = document.createElement('div')
    workspace.style.display = 'flex'
    workspace.style.flex = '1'
    workspace.style.width = '100%'
    workspace.style.overflow = 'hidden'
    workspace.style.minWidth = '0'
    workspace.style.minHeight = '0'
    container.appendChild(workspace)

    const mainContent = document.createElement('div')
    mainContent.className = 'main-content'
    mainContent.style.minWidth = '0'
    mainContent.style.minHeight = '0'
    workspace.appendChild(mainContent)

    const scrollArea = document.createElement('div')
    scrollArea.className = 'editor-scroll-area'
    scrollArea.style.minWidth = '0'
    scrollArea.style.minHeight = '0'
    mainContent.appendChild(scrollArea)

    const editorPaper = document.createElement('div')
    editorPaper.className = 'editor-container'
    scrollArea.appendChild(editorPaper)

    const outline = document.createElement('div')
    outline.className = 'outline-sidebar'
    outline.style.width = '260px'
    outline.style.padding = '16px 14px'
    outline.style.borderLeft = '1px solid var(--border-color)'
    outline.style.backgroundColor = 'var(--paper-bg)'

    const comment = document.createElement('div')
    comment.style.width = '320px'
    comment.style.borderLeft = '1px solid var(--border-color)'

    if (preset === 'editor-outline' || preset === 'editor-outline-comment') {
      workspace.appendChild(outline)
    }

    if (preset === 'editor-comment' || preset === 'editor-outline-comment') {
      workspace.appendChild(comment)
    }

    if (preset === 'minimal') {
      toolbarContainer.style.display = 'none'
      outline.style.display = 'none'
      comment.style.display = 'none'
    }

    return {
      toolbarContainer,
      editorContainer: editorPaper,
      scrollContainer: scrollArea,
      overlayContainer: container,
      outlineContainer:
        preset === 'editor-outline' || preset === 'editor-outline-comment' ? outline : null,
      commentContainer:
        preset === 'editor-comment' || preset === 'editor-outline-comment' ? comment : null,
    }
  }
}

function normalizeRendererOptions(options: EditorUIRendererOptions): EditorUIRendererOptions {
  const layout = options.layout
  if (!layout) return options

  const next: EditorUIRendererOptions = { ...options }

  if (layout.builder) {
    next.layoutBuilder = layout.builder
  } else if (layout.preset) {
    next.layoutBuilder = createPresetLayoutBuilder(layout.preset)
  }

  const layoutRegions = layout.regions || {}
  const layoutModules = layout.modules || {}
  if (Object.keys(layoutRegions).length || Object.keys(layoutModules).length) {
    next.layoutSchema = {
      ...(next.layoutSchema || {}),
      regions: {
        ...(next.layoutSchema?.regions || {}),
        ...layoutRegions,
      },
      modules: {
        ...(next.layoutSchema?.modules || {}),
        ...layoutModules,
      },
    }
  }

  if (layout.plugins) {
    next.plugins = {
      ...(next.plugins || {}),
      ...layout.plugins,
    }
  }

  return next
}

export class EditorUIRenderer {
  private editorCore: EditorCore
  private container: HTMLElement
  private options: EditorUIRendererOptions

  private slots: EditorUILayoutSlots
  private tiptapElement: HTMLElement
  private commentPanelVisible = false
  private linkPreviewEl: HTMLElement | null = null
  private hoverAnchor: HTMLAnchorElement | null = null
  private readonly i18n: EditorI18n
  private readonly moduleDefinitions: Record<EditorUIModuleId, EditorUIModuleDefinition>
  private readonly mountedModules: Partial<Record<EditorUIModuleId, EditorUIModuleInstance>> = {}
  private readonly moduleMountPoints: Partial<Record<EditorUIModuleId, HTMLElement>> = {}
  private commentPanelHost: HTMLElement | null = null
  private commentPanelRegion: EditorUIRegion = 'comment'
  private commentPanelFloating = false
  private commentPanelInstance: CommentPanelModuleInstance | null = null
  private readonly focusCommentThreadHandler: (commentId: string) => void
  private readonly commentPanelController: CommentPanelController

  constructor(
    editorCore: EditorCore,
    container: HTMLElement,
    options: EditorUIRendererOptions = {},
  ) {
    const normalizedOptions = normalizeRendererOptions(options)
    this.editorCore = editorCore
    this.container = container
    this.options = {
      toolbarMode: normalizedOptions.toolbarMode || 'top',
      commentPanelDefaultVisible: normalizedOptions.commentPanelDefaultVisible ?? false,
      theme: normalizedOptions.theme || 'auto',
      i18n: normalizedOptions.i18n,
      outlineI18n: normalizedOptions.outlineI18n,
      uiConfig: normalizedOptions.uiConfig,
      layoutBuilder: normalizedOptions.layoutBuilder,
      layoutSchema: normalizedOptions.layoutSchema,
      modules: normalizedOptions.modules,
      plugins: normalizedOptions.plugins,
      layout: normalizedOptions.layout,
    }

    this.i18n = resolveEditorI18n(this.options.i18n || this.editorCore.i18n)
    this.commentPanelController = {
      open: () => this.openCommentPanel(),
      close: () => this.closeCommentPanel(),
      toggle: () => this.toggleCommentPanel(),
      setVisible: (visible: boolean) => {
        this.commentPanelVisible = visible
        this.applyCommentPanelVisibility()
      },
      focusThread: (commentId: string) => {
        this.openCommentPanel()
        if (this.options.plugins?.commentPanel) {
          this.commentPanelInstance?.focusThread?.(commentId)
          return
        }
        this.editorCore.events.emit('focusCommentThread', commentId)
      },
      createFromSelection: () => {
        return Boolean((this.editorCore.editor.commands as any).addComment?.())
      },
    }

    this.slots =
      this.options.layoutBuilder?.({
        container: this.container,
        editorCore: this.editorCore,
        toolbarMode: this.options.toolbarMode || 'top',
      }) || this.createDefaultLayout()

    this.commentPanelVisible = Boolean(this.options.commentPanelDefaultVisible)
    this.applyLayoutSchemaToSlots()
    this.applyTheme()
    this.applyLayoutDataAttributes()
    this.moduleDefinitions = this.buildModuleDefinitions(this.options.modules)

    this.editorCore.events.on('toggleCommentPanel', () => this.toggleCommentPanel())
    this.editorCore.events.on('openCommentPanel', () => this.openCommentPanel())
    this.focusCommentThreadHandler = (commentId: string) => {
      if (!this.options.plugins?.commentPanel) return
      this.commentPanelInstance?.focusThread?.(commentId)
    }
    this.editorCore.events.on('focusCommentThread', this.focusCommentThreadHandler)

    this.tiptapElement = this.editorCore.editor.options.element as HTMLElement
    this.tiptapElement.dataset.beToolbarMode = this.options.toolbarMode || 'top'
    this.slots.editorContainer.appendChild(this.tiptapElement)
    this.editorCore.shortcuts.setEditorRoot(this.slots.editorContainer)
    this.editorCore.shortcuts.start()
    this.mountModules()

    window.addEventListener('hashchange', this.handleHashChange)
    this.tiptapElement.addEventListener('click', this.handleEditorLinkClick)
    this.tiptapElement.addEventListener('click', this.handleEditorCommentClick)
    this.tiptapElement.addEventListener('mouseover', this.handleEditorLinkHover)
    this.tiptapElement.addEventListener('mouseout', this.handleEditorLinkLeave)
    queueMicrotask(() => this.navigateToCurrentHash())
  }

  public toggleCommentPanel() {
    if (!this.commentPanelHost) return
    this.commentPanelVisible = !this.commentPanelVisible
    this.applyCommentPanelVisibility()
  }

  public openCommentPanel() {
    if (!this.commentPanelHost) return
    this.commentPanelVisible = true
    this.applyCommentPanelVisibility()
  }

  public closeCommentPanel() {
    if (!this.commentPanelHost) return
    this.commentPanelVisible = false
    this.applyCommentPanelVisibility()
  }

  private applyCommentPanelVisibility() {
    if (!this.commentPanelHost) return
    if (this.options.layoutSchema?.regions?.[this.commentPanelRegion]?.visible === false) {
      this.commentPanelHost.style.display = 'none'
      this.commentPanelInstance?.setVisible?.(false)
      this.editorCore.events.emit('commentPanelVisibilityChange', false)
      return
    }
    this.commentPanelHost.style.display = this.commentPanelVisible ? 'block' : 'none'
    this.commentPanelInstance?.setVisible?.(this.commentPanelVisible)
    this.editorCore.events.emit('commentPanelVisibilityChange', this.commentPanelVisible)
  }

  public getCommentPanelController(): CommentPanelController {
    return this.commentPanelController
  }

  public getOutlineData(): OutlineDataItem[] {
    const headings: OutlineDataItem[] = []
    this.editorCore.editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'heading') return true
      headings.push({
        level: Number(node.attrs?.level || 1),
        text: node.textContent || this.i18n.outline.untitled,
        pos,
        blockId: typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : undefined,
      })
      return true
    })
    return headings
  }

  public onOutlineDataChange(listener: (headings: OutlineDataItem[]) => void): () => void {
    const emit = () => listener(this.getOutlineData())
    this.editorCore.events.on('update', emit)
    return () => this.editorCore.events.off('update', emit)
  }

  public getCommentThreads(): CommentThread[] {
    return commentStore.getAll().map((thread) => ({
      ...thread,
      replies: thread.replies.map((reply) => ({ ...reply })),
    }))
  }

  public onCommentDataChange(listener: (threads: CommentThread[]) => void): () => void {
    return commentStore.on(() => listener(this.getCommentThreads()))
  }

  private configureFloatingCommentHost(host: HTMLElement) {
    const overlayRoot = this.slots.overlayContainer || this.container
    const rootPosition = window.getComputedStyle(overlayRoot).position
    if (rootPosition === 'static') {
      overlayRoot.style.position = 'relative'
    }

    host.dataset.beCommentHostFloating = 'true'
    host.style.position = 'absolute'
    host.style.top = '0'
    host.style.right = '0'
    host.style.bottom = '0'
    host.style.width = '320px'
    host.style.maxWidth = 'min(86vw, 360px)'
    host.style.zIndex = '20'
    host.style.pointerEvents = 'auto'
  }

  private applyLayoutDataAttributes() {
    this.container.dataset.beUiRoot = 'true'
    this.slots.editorContainer.dataset.beEditorContainer = 'true'
    this.slots.editorContainer.dataset.beRegion = 'editor'
    if (this.slots.scrollContainer) {
      this.slots.scrollContainer.dataset.beScrollContainer = 'true'
    }
    if (this.slots.toolbarContainer) {
      this.slots.toolbarContainer.dataset.beRegion = 'toolbar'
    }
    if (this.slots.outlineContainer) {
      this.slots.outlineContainer.dataset.beRegion = 'outline'
    }
    if (this.slots.commentContainer) {
      this.slots.commentContainer.dataset.beRegion = 'comment'
    }

    const overlayHost = this.slots.overlayContainer || this.container
    overlayHost.dataset.beOverlayContainer = 'true'
    overlayHost.dataset.beRegion = 'overlay'
  }

  private applyTheme() {
    const preferred = this.options.theme || 'auto'
    const resolved =
      preferred === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : preferred
    this.container.dataset.beTheme = resolved
  }

  private applyLayoutSchemaToSlots() {
    const regions = this.options.layoutSchema?.regions
    if (!regions) return

    const applyRegion = (
      el: HTMLElement | null | undefined,
      region?: { visible?: boolean; width?: string | number; order?: number },
    ) => {
      if (!el || !region) return
      if (typeof region.visible === 'boolean') {
        el.style.display = region.visible ? '' : 'none'
      }
      if (region.width !== undefined) {
        el.style.width = typeof region.width === 'number' ? `${region.width}px` : region.width
      }
      if (typeof region.order === 'number') {
        el.style.order = String(region.order)
      }
    }

    applyRegion(this.slots.toolbarContainer, regions.toolbar)
    applyRegion(this.slots.editorContainer, regions.editor)
    applyRegion(this.slots.outlineContainer, regions.outline)
    applyRegion(this.slots.commentContainer, regions.comment)
    applyRegion(this.slots.overlayContainer, regions.overlay)
  }

  private resolveRegionContainer(region: EditorUIRegion): HTMLElement | null {
    switch (region) {
      case 'toolbar':
        return this.slots.toolbarContainer || this.container
      case 'editor':
        return this.slots.editorContainer || this.container
      case 'outline':
        return this.slots.outlineContainer || this.container
      case 'comment':
        return this.slots.commentContainer || this.container
      case 'overlay':
        return this.slots.overlayContainer || this.container
      default:
        return this.container
    }
  }

  private resolveModuleRegion(
    id: EditorUIModuleId,
    fallbackRegion: EditorUIRegion,
  ): EditorUIRegion {
    return this.options.layoutSchema?.modules?.[id]?.region || fallbackRegion
  }

  private createModuleMountPoint(id: EditorUIModuleId, region: EditorUIRegion): HTMLElement | null {
    const host = this.resolveRegionContainer(region)
    if (!host) return null

    const mountPoint = document.createElement('div')
    mountPoint.dataset.beModuleId = id
    mountPoint.dataset.beModuleRegion = region
    host.appendChild(mountPoint)
    this.moduleMountPoints[id] = mountPoint
    return mountPoint
  }

  private configureSelectionToolbarModule(enabled: boolean, region: EditorUIRegion) {
    if (!this.tiptapElement) return
    this.tiptapElement.dataset.beSelectionToolbarEnabled = enabled ? 'true' : 'false'
    this.tiptapElement.dataset.beSelectionToolbarRegion = region
  }

  private createDefaultLayout(): EditorUILayoutSlots {
    this.container.innerHTML = ''
    this.container.classList.add('layout')
    this.container.style.flexDirection = 'column'

    let toolbarContainer: HTMLElement | null = null
    if (this.options.toolbarMode === 'top') {
      toolbarContainer = document.createElement('div')
      this.container.appendChild(toolbarContainer)
    }

    const workspace = document.createElement('div')
    workspace.style.display = 'flex'
    workspace.style.flex = '1'
    workspace.style.overflow = 'hidden'
    workspace.style.width = '100%'
    this.container.appendChild(workspace)

    const mainContentArea = document.createElement('div')
    mainContentArea.classList.add('main-content')
    workspace.appendChild(mainContentArea)

    const scrollArea = document.createElement('div')
    scrollArea.classList.add('editor-scroll-area')
    mainContentArea.appendChild(scrollArea)

    const editorPaper = document.createElement('div')
    editorPaper.classList.add('editor-container')
    scrollArea.appendChild(editorPaper)

    const outlineSidebar = document.createElement('div')
    outlineSidebar.classList.add('outline-sidebar')
    outlineSidebar.style.width = '260px'
    outlineSidebar.style.padding = '16px 14px'
    outlineSidebar.style.borderLeft = '1px solid var(--border-color)'
    outlineSidebar.style.backgroundColor = 'var(--paper-bg)'
    outlineSidebar.style.display = 'block'
    outlineSidebar.style.overflow = 'hidden'
    workspace.appendChild(outlineSidebar)

    const commentSidebar = document.createElement('div')
    commentSidebar.style.display = 'none'
    commentSidebar.style.width = '280px'
    commentSidebar.style.flexShrink = '0'
    workspace.appendChild(commentSidebar)

    return {
      toolbarContainer,
      editorContainer: editorPaper,
      scrollContainer: scrollArea,
      overlayContainer: this.container,
      outlineContainer: outlineSidebar,
      commentContainer: commentSidebar,
    }
  }

  private handleHashChange = () => {
    this.navigateToCurrentHash()
  }

  private handleEditorLinkClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    let hash = ''

    if (href.startsWith('#')) {
      hash = href
    } else {
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
          return
        }
        hash = url.hash
      } catch {
        return
      }
    }

    if (!hash) return

    event.preventDefault()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${hash}`,
    )
    this.navigateToCurrentHash()
  }

  private handleEditorCommentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const mark = target?.closest('[data-comment-id]') as HTMLElement | null
    if (!mark) return

    const commentId = (mark.getAttribute('data-comment-id') || '').trim()
    if (!commentId) return

    this.openCommentPanel()
    this.editorCore.events.emit('focusCommentThread', commentId)
  }

  private navigateToCurrentHash() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, '').trim())
    if (!hash) return
    this.focusBlockById(hash)
  }

  private handleEditorLinkHover = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null
    if (!anchor) return

    this.hoverAnchor = anchor
    const blockId = decodeURIComponent((anchor.getAttribute('href') || '').replace(/^#/, '').trim())
    if (!blockId) return

    const preview = this.getBlockPreviewText(blockId)
    if (!preview) return
    this.showLinkPreview(anchor, preview)
  }

  private handleEditorLinkLeave = (event: MouseEvent) => {
    if (!this.hoverAnchor) return
    const related = event.relatedTarget as Node | null
    if (related && this.hoverAnchor.contains(related)) return
    this.hoverAnchor = null
    this.hideLinkPreview()
  }

  private getBlockPreviewText(blockId: string): string | null {
    const { state } = this.editorCore.editor
    let text = ''

    state.doc.descendants((node) => {
      if (node.attrs?.blockId !== blockId) return true
      text = (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      return false
    })

    if (!text) return null
    return text
  }

  private ensureLinkPreviewEl() {
    if (this.linkPreviewEl) return this.linkPreviewEl

    const el = document.createElement('div')
    el.className = 'be-link-preview-tooltip'
    const host = this.slots.overlayContainer || this.container
    host.appendChild(el)
    this.linkPreviewEl = el
    return el
  }

  private showLinkPreview(anchor: HTMLAnchorElement, text: string) {
    const el = this.ensureLinkPreviewEl()
    el.textContent = text

    const rect = anchor.getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - 340)
    const top = Math.min(rect.bottom + 8, window.innerHeight - 80)

    el.style.left = `${Math.max(8, left)}px`
    el.style.top = `${Math.max(8, top)}px`
    el.style.display = 'block'
  }

  private hideLinkPreview() {
    if (!this.linkPreviewEl) return
    this.linkPreviewEl.style.display = 'none'
  }

  private focusBlockById(blockId: string) {
    const { state, view } = this.editorCore.editor
    let foundPos: number | null = null

    state.doc.descendants((node, pos) => {
      if (node.attrs?.blockId === blockId) {
        foundPos = pos
        return false
      }
      return true
    })

    if (foundPos === null) return false

    const resolvedPos = state.doc.resolve(Math.min(foundPos + 1, state.doc.content.size))
    const selection = TextSelection.near(resolvedPos)
    view.dispatch(state.tr.setSelection(selection).scrollIntoView())

    const target = this.slots.editorContainer.querySelector(
      `[data-block-id="${blockId}"]`,
    ) as HTMLElement | null
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return true
  }

  private buildModuleDefinitions(
    overrides?: Partial<Record<EditorUIModuleId, EditorUIModuleDefinition>>,
  ): Record<EditorUIModuleId, EditorUIModuleDefinition> {
    const defaults: Record<EditorUIModuleId, EditorUIModuleDefinition> = {
      toolbar: {
        id: 'toolbar',
        defaultRegion: 'toolbar',
        mount: ({ options, regionContainer }) => {
          if (!regionContainer || options.toolbarMode !== 'top') return
          this.renderToolbar(regionContainer)
        },
      },
      selectionToolbar: {
        id: 'selectionToolbar',
        defaultRegion: 'overlay',
        mount: ({ region }) => {
          this.configureSelectionToolbarModule(true, region)
        },
      },
      outline: {
        id: 'outline',
        defaultRegion: 'outline',
        mount: (ctx) => {
          if (this.options.plugins?.outline) {
            return this.options.plugins.outline.mount(ctx)
          }
          const { regionContainer } = ctx
          if (!regionContainer) return
          this.renderOutline(regionContainer)
        },
      },
      commentPanel: {
        id: 'commentPanel',
        defaultRegion: 'comment',
        mount: (ctx) => {
          const { regionContainer, region } = ctx
          if (!regionContainer) return
          this.commentPanelRegion = region
          const hasDedicatedCommentSlot = Boolean(
            this.slots.commentContainer && regionContainer === this.slots.commentContainer,
          )
          this.commentPanelFloating = region === 'comment' && !hasDedicatedCommentSlot
          if (this.commentPanelFloating) {
            this.configureFloatingCommentHost(regionContainer)
          } else {
            delete regionContainer.dataset.beCommentHostFloating
            regionContainer.style.position = ''
            regionContainer.style.top = ''
            regionContainer.style.right = ''
            regionContainer.style.bottom = ''
            regionContainer.style.width = ''
            regionContainer.style.maxWidth = ''
            regionContainer.style.zIndex = ''
            regionContainer.style.pointerEvents = ''
          }
          this.commentPanelHost = regionContainer
          if (this.options.plugins?.commentPanel) {
            this.commentPanelInstance = this.options.plugins.commentPanel.mount(ctx) || null
          } else {
            this.commentPanelInstance = this.renderCommentPanel(regionContainer)
          }
          this.applyCommentPanelVisibility()
          return {
            unmount: () => {
              this.commentPanelInstance?.unmount?.()
              this.commentPanelInstance = null
            },
          }
        },
      },
      blockHandle: {
        id: 'blockHandle',
        defaultRegion: 'editor',
        mount: () => {
          ;(this.editorCore.editor.commands as any).setBlockHandleEnabled?.(true)
          return {
            unmount: () => {
              ;(this.editorCore.editor.commands as any).setBlockHandleEnabled?.(false)
            },
          }
        },
      },
      tableBubbleMenu: {
        id: 'tableBubbleMenu',
        defaultRegion: 'overlay',
        mount: ({ regionContainer }) => {
          const instance = new TableBubbleMenu(this.editorCore, regionContainer || undefined)
          return { unmount: () => instance.destroy() }
        },
      },
      blockMultiSelectBar: {
        id: 'blockMultiSelectBar',
        defaultRegion: 'overlay',
        mount: ({ regionContainer }) => {
          const instance = new BlockMultiSelectBar(this.editorCore, regionContainer || undefined)
          return { unmount: () => instance.destroy() }
        },
      },
      findReplacePanel: {
        id: 'findReplacePanel',
        defaultRegion: 'editor',
        mount: ({ regionContainer }) => {
          const instance = new FindReplacePanel(this.editorCore, regionContainer || undefined)
          return { unmount: () => instance.destroy() }
        },
      },
    }

    return {
      ...defaults,
      ...overrides,
    }
  }

  private mountModules() {
    const moduleOrder: EditorUIModuleId[] = [
      'toolbar',
      'selectionToolbar',
      'outline',
      'commentPanel',
      'blockHandle',
      'tableBubbleMenu',
      'blockMultiSelectBar',
      'findReplacePanel',
    ]

    moduleOrder.forEach((id) => {
      const cfg = this.options.layoutSchema?.modules?.[id]
      const def = this.moduleDefinitions[id]
      const resolvedRegion = this.resolveModuleRegion(id, def.defaultRegion)
      if (cfg?.enabled === false) {
        if (id === 'selectionToolbar') {
          this.configureSelectionToolbarModule(false, resolvedRegion)
        }
        if (id === 'blockHandle') {
          ;(this.editorCore.editor.commands as any).setBlockHandleEnabled?.(false)
        }
        return
      }
      const useDirectRegionHostForCommentPanel =
        id === 'commentPanel' &&
        resolvedRegion === 'comment' &&
        Boolean(this.slots.commentContainer)
      const regionContainer =
        id === 'selectionToolbar' || id === 'blockHandle'
          ? this.resolveRegionContainer(resolvedRegion)
          : useDirectRegionHostForCommentPanel
            ? this.resolveRegionContainer(resolvedRegion)
            : this.createModuleMountPoint(id, resolvedRegion) ||
              this.resolveRegionContainer(resolvedRegion)
      const instance =
        def.mount({
          id,
          region: resolvedRegion,
          regionContainer,
          editorCore: this.editorCore,
          renderer: this,
          slots: this.slots,
          i18n: this.i18n,
          options: this.options,
        }) || {}

      this.mountedModules[id] = instance
    })
  }

  private renderToolbar(toolbarContainer: HTMLElement): Toolbar {
    const toolbarConfig = this.options.uiConfig?.toolbar || this.editorCore.uiConfig?.toolbar
    return new Toolbar(toolbarContainer, this.editorCore, this.i18n, toolbarConfig)
  }

  private renderOutline(outlineContainer: HTMLElement): Outline {
    return new Outline(outlineContainer, this.editorCore, {
      scrollArea: this.slots.scrollContainer || null,
      i18n: {
        ...this.i18n.outline,
        ...this.options.outlineI18n,
      },
    })
  }

  private renderCommentPanel(commentContainer: HTMLElement): CommentPanelModuleInstance {
    const panel = new CommentPanel(this.editorCore, commentContainer, this.i18n.commentPanel)
    return {
      setVisible: (visible: boolean) => panel.setVisible(visible),
      focusThread: (commentId: string) => panel.focusThread(commentId),
      unmount: () => panel.destroy(),
    }
  }

  public destroy() {
    this.editorCore.events.off('focusCommentThread', this.focusCommentThreadHandler)
    Object.values(this.mountedModules).forEach((module) => module?.unmount?.())
    this.commentPanelInstance = null
  }
}
