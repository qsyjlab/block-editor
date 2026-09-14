import { Editor } from '@tiptap/core'
import { saveAs } from 'file-saver'
import { editorToMarkdown } from '../utils/serializer'

export class Exporter {
  private static readonly PDF_EXCLUDE_SELECTOR = [
    '.toolbar',
    '.toolbar-dropdown-menu',
    '.global-tooltip',
    '.table-bubble-menu',
    '.be-selection-tooltip',
    '.be-inline-toolbar',
    '.be-slash-menu',
    '.be-block-handle',
    '.be-block-handle-menu',
    '.be-multiselect-bar',
    '.be-block-multiselect-overlays',
    '.tippy-box',
    '.tippy-popper',
    '.comment-panel',
    '.outline-sidebar',
    '.ProseMirror-gapcursor',
  ].join(',')

  constructor(private editor: Editor) {}

  private createPdfExportElement(): { element: HTMLElement; cleanup: () => void } | null {
    const editorContainer =
      (this.editor.view.dom.closest('.editor-container') as HTMLElement | null) ||
      (document.querySelector('.editor-container') as HTMLElement | null)

    if (!editorContainer) return null

    const proseMirror = this.editor.view.dom as HTMLElement
    // EXP-002 根因：html2pdf 0.14 会把源元素深克隆进自己的容器，并按「文档流高度」测量。
    // 源元素若自身是 absolute/fixed（或带 transform），克隆后脱离文档流，
    // html2pdf 容器高度塌缩为 0 → canvas 高度 0 → 导出整页空白。
    // 因此结构上分两层：
    //  - exportRoot：absolute + 负偏移，只负责对用户不可见；
    //  - paper：文档流内的普通块，是交给 html2pdf 渲染的真正源元素。
    const exportRoot = document.createElement('div')
    exportRoot.className = 'be-pdf-export-root'
    Object.assign(exportRoot.style, {
      position: 'absolute',
      left: '-20000px',
      top: '0',
      width: '874px',
      pointerEvents: 'none',
      zIndex: '0',
    })

    const paper = document.createElement('div')
    paper.className = 'be-pdf-export-paper'
    Object.assign(paper.style, {
      width: '794px',
      padding: '40px',
      boxSizing: 'border-box',
      background: '#fff',
      color: '#111827',
    })

    const titleInput = editorContainer.querySelector('.doc-title-input') as HTMLInputElement | null
    if (titleInput?.value?.trim()) {
      const titleEl = document.createElement('h1')
      titleEl.textContent = titleInput.value.trim()
      titleEl.style.margin = '0 0 24px'
      titleEl.style.fontSize = '32px'
      titleEl.style.lineHeight = '1.3'
      titleEl.style.color = '#111827'
      paper.appendChild(titleEl)
    }

    const contentClone = proseMirror.cloneNode(true) as HTMLElement
    contentClone.style.display = 'block'
    contentClone.style.width = '100%'
    contentClone.style.minHeight = '1px'
    contentClone.style.color = '#111827'
    contentClone.querySelectorAll(Exporter.PDF_EXCLUDE_SELECTOR).forEach((el) => el.remove())
    paper.appendChild(contentClone)
    exportRoot.appendChild(paper)

    document.body.appendChild(exportRoot)
    return {
      element: paper,
      cleanup: () => {
        if (exportRoot.parentElement === document.body) {
          document.body.removeChild(exportRoot)
        }
      },
    }
  }

  private sanitizeUnsupportedColorsOnClone(clonedDoc: Document) {
    clonedDoc.querySelectorAll('style').forEach((styleEl) => {
      const cssText = styleEl.textContent
      if (!cssText || !cssText.includes('oklch(')) return
      styleEl.textContent = cssText.replace(/oklch\([^)]*\)/g, '#3b82f6')
    })
  }

  /**
   * 打印文档 (浏览器原生)
   */
  public async print(): Promise<void> {
    const originalTitle = document.title
    const docTitleInput = document.querySelector('.doc-title-input') as HTMLInputElement
    if (docTitleInput && docTitleInput.value) {
      document.title = docTitleInput.value
    }

    window.print()

    document.title = originalTitle
  }

  /**
   * 导出为 PDF 文件 (使用 html2pdf.js)
   */
  public async exportToPdf(filename: string = 'document.pdf'): Promise<void> {
    const exportPayload = this.createPdfExportElement()
    if (!exportPayload) {
      alert('Could not find editor content to export.')
      return
    }

    const { element, cleanup } = exportPayload

    // Get title for filename
    const docTitleInput = document.querySelector('.doc-title-input') as HTMLInputElement
    let finalFilename = filename
    if (docTitleInput && docTitleInput.value) {
      finalFilename = docTitleInput.value.endsWith('.pdf')
        ? docTitleInput.value
        : `${docTitleInput.value}.pdf`
    }

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: finalFilename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        onclone: (clonedDoc: Document) => {
          this.sanitizeUnsupportedColorsOnClone(clonedDoc)
          clonedDoc.querySelectorAll(Exporter.PDF_EXCLUDE_SELECTOR).forEach((el) => el.remove())
        },
        ignoreElements: (el: Element) => {
          if (!(el instanceof HTMLElement)) return false
          return el.matches(Exporter.PDF_EXCLUDE_SELECTOR)
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    }

    try {
      const mod = await import('html2pdf.js')
      const html2pdf = (mod as any).default || (mod as any)
      if (typeof html2pdf !== 'function') {
        throw new Error('html2pdf loader failed')
      }
      await html2pdf().set(opt).from(element).save()
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF 导出失败，已降级为浏览器打印。')
      await this.print()
    } finally {
      cleanup()
    }
  }

  /**
   * 导出为 DOCX
   */
  public async exportToDocx(filename: string = 'document.docx'): Promise<void> {
    try {
      const [{ DocxSerializer }, { Packer }] = await Promise.all([
        import('./DocxSerializer'),
        import('docx'),
      ])
      const serializer = new DocxSerializer(this.editor)
      const doc = await serializer.serialize()

      const blob = await Packer.toBlob(doc)

      // 如果没有指定后缀，自动添加
      const finalFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`
      saveAs(blob, finalFilename)
    } catch (error) {
      console.error('DOCX export failed:', error)
      alert('导出 Word 文档失败，请查看控制台错误信息。')
    }
  }

  public async toMarkdownText(): Promise<string> {
    // 统一走 utils/serializer 的规范化管线（表格/任务列表/Callout/缩进 → GFM 友好形状）
    return editorToMarkdown(this.editor)
  }

  public async exportToMarkdown(filename: string = 'document.md'): Promise<void> {
    try {
      const markdown = await this.toMarkdownText()
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`
      saveAs(blob, finalFilename)
    } catch (error) {
      console.error('Markdown export failed:', error)
      alert('导出 Markdown 失败，请查看控制台错误信息。')
    }
  }
}
