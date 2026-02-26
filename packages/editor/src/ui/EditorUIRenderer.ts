import { EditorCore } from '../core/EditorCore'
import { Toolbar } from './Toolbar'
import { Outline } from './Outline'
import { TableBubbleMenu } from './menus/TableBubbleMenu'

export class EditorUIRenderer {
  private editorCore: EditorCore
  private container: HTMLElement
  
  private toolbarContainer: HTMLElement
  private mainContentArea: HTMLElement
  private editorPaper: HTMLElement
  private leftSidebar: HTMLElement
  private rightSidebar: HTMLElement

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

    // Left Sidebar (Doc Tree)
    // this.leftSidebar = document.createElement('div')
    // this.leftSidebar.classList.add('sidebar') // Uses .sidebar from css
    // this.leftSidebar.innerHTML = `
    //   <h3>Documents</h3>
    //   <div style="padding: 8px 0;">
    //     <div style="padding: 6px 12px; background: #e6ffec; color: #00b96b; border-radius: 4px; font-size: 14px; cursor: pointer;">
    //       Untitled Document
    //     </div>
    //   </div>
    // `
    // workspace.appendChild(this.leftSidebar)

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
    this.rightSidebar.classList.add('outline-sidebar') // Add class for styling/hiding
    this.rightSidebar.style.width = '240px'
    this.rightSidebar.style.padding = '20px'
    this.rightSidebar.style.borderLeft = '1px solid #e8e8e8'
    this.rightSidebar.style.backgroundColor = '#fff'
    this.rightSidebar.style.display = 'none' // Hidden by default on small screens? Let's show it.
    this.rightSidebar.style.display = 'block'
    workspace.appendChild(this.rightSidebar)

    // Initialize Components
    this.renderToolbar()
    this.renderOutline()
    this.renderMenus()
    
    // Re-mount editor element to our new container
    const tiptapElement = this.editorCore.editor.options.element
    this.editorPaper.appendChild(tiptapElement)
  }

  private renderToolbar() {
    new Toolbar(this.toolbarContainer, this.editorCore)
  }

  private renderOutline() {
    new Outline(this.rightSidebar, this.editorCore)
  }

  private renderMenus() {
    new TableBubbleMenu(this.editorCore)
  }
}
