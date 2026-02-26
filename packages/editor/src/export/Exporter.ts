import { Editor } from '@tiptap/core'
import { Packer } from 'docx'
import { saveAs } from 'file-saver'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { DocxSerializer } from './DocxSerializer'

export class Exporter {
  constructor(private editor: Editor) {}

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
    const element = document.querySelector('.editor-container')
    if (!element) {
        alert('Could not find editor content to export.')
        return
    }

    // Get title for filename
    const docTitleInput = document.querySelector('.doc-title-input') as HTMLInputElement
    let finalFilename = filename
    if (docTitleInput && docTitleInput.value) {
        finalFilename = docTitleInput.value.endsWith('.pdf') ? docTitleInput.value : `${docTitleInput.value}.pdf`
    }

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: finalFilename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    }

    try {
        await html2pdf().set(opt).from(element as HTMLElement).save()
    } catch (e) {
        console.error('PDF export failed:', e)
        alert('PDF export failed. Please try printing to PDF instead.')
    }
  }

  /**
   * 导出为 DOCX
   */
  public async exportToDocx(filename: string = 'document.docx'): Promise<void> {
    try {
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
}