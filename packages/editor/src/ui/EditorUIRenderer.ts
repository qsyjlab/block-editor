import { EditorCore } from '../core/EditorCore'
import { Toolbar } from './Toolbar'
import { Outline } from './Outline'
import { TableBubbleMenu } from './menus/TableBubbleMenu'
import { BlockMultiSelectBar } from './menus/block-multi-select-bar'
import { CommentPanel } from './CommentPanel'
import { TextSelection } from 'prosemirror-state'

export class EditorUIRenderer {
  private editorCore: EditorCore
  private container: HTMLElement
  
  private toolbarContainer: HTMLElement
  private mainContentArea: HTMLElement
  private editorPaper: HTMLElement
  private rightSidebar: HTMLElement
  private commentSidebar: HTMLElement
  private tiptapElement: HTMLElement
  private commentPanelVisible = false

  constructor(editorCore: EditorCore, container: HTMLElement) {
    this.editorCore = editorCore
    this.container = container
    
    // Use the .layout class from index.css
    this.container.classList.add('layout')
    this.container.style.flexDirection = 'column' // Ensure vertical stack of Toolbar + Workspace

    // 1. Toolbar Area
    this.toolbarContainer = document.createElement('div')
    this.container.appendChild(this.toolbarContainer)
    
    // 2. Workspace (Left + Main + Right)
    const workspace = document.createElement('div')
    workspace.style.display = 'flex'
    workspace.style.flex = '1'
    workspace.style.overflow = 'hidden'
    workspace.style.width = '100%'
    this.container.appendChild(workspace)

    // Main Content Area (Gray background, scrollable)
    this.mainContentArea = document.createElement('div')
    this.mainContentArea.classList.add('main-content') // Uses .main-content from css
    workspace.appendChild(this.mainContentArea)

    // Scrollable Wrapper for Paper
    const scrollArea = document.createElement('div')
    scrollArea.classList.add('editor-scroll-area') // Uses .editor-scroll-area from css
    this.mainContentArea.appendChild(scrollArea)

    // Editor Paper (White centered card)
    this.editorPaper = document.createElement('div')
    this.editorPaper.classList.add('editor-container') // Uses .editor-container from css
    scrollArea.appendChild(this.editorPaper)

    // Right Sidebar (Outline)
    this.rightSidebar = document.createElement('div')
    this.rightSidebar.classList.add('outline-sidebar')
    this.rightSidebar.style.width = '240px'
    this.rightSidebar.style.padding = '20px'
    this.rightSidebar.style.borderLeft = '1px solid #e8e8e8'
    this.rightSidebar.style.backgroundColor = '#fff'
    this.rightSidebar.style.display = 'block'
    workspace.appendChild(this.rightSidebar)

    // Comment Sidebar (hidden by default, toggled via toolbar)
    this.commentSidebar = document.createElement('div')
    this.commentSidebar.style.display = 'none'
    this.commentSidebar.style.width = '280px'
    this.commentSidebar.style.flexShrink = '0'
    workspace.appendChild(this.commentSidebar)

    // Initialize Components
    this.renderToolbar()
    this.renderOutline()
    this.renderMenus()
    this.renderCommentPanel()

    this.editorCore.events.on('toggleCommentPanel', () => this.toggleCommentPanel())

    // Re-mount editor element to our new container
    this.tiptapElement = this.editorCore.editor.options.element as HTMLElement
    this.editorPaper.appendChild(this.tiptapElement)

    window.addEventListener('hashchange', this.handleHashChange)
    this.tiptapElement.addEventListener('click', this.handleEditorLinkClick)
    queueMicrotask(() => this.navigateToCurrentHash())
  }

  /** Toggle comment panel visibility — called by toolbar comment button */
  public toggleCommentPanel() {
    this.commentPanelVisible = !this.commentPanelVisible
    this.commentSidebar.style.display = this.commentPanelVisible ? 'block' : 'none'
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
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
    this.navigateToCurrentHash()
  }

  private navigateToCurrentHash() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, '').trim())
    if (!hash) return
    this.focusBlockById(hash)
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

    const target = this.editorPaper.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return true
  }

  private renderToolbar() {
    new Toolbar(this.toolbarContainer, this.editorCore)
  }

  private renderOutline() {
    new Outline(this.rightSidebar, this.editorCore)
  }

  private renderCommentPanel() {
    new CommentPanel(this.editorCore, this.commentSidebar)
  }

  private renderMenus() {
    new TableBubbleMenu(this.editorCore)
    new BlockMultiSelectBar(this.editorCore)
  }
}
