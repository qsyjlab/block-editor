import mammoth from 'mammoth'
import { Editor } from '@tiptap/core'

export class DocxImporter {
  private fileInput: HTMLInputElement

  constructor(private editor: Editor) {
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = '.docx'
    this.fileInput.style.display = 'none'
    document.body.appendChild(this.fileInput)

    this.fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        this.import(files[0])
      }
      // Reset value so same file can be selected again
      this.fileInput.value = ''
    })
  }

  public triggerImport() {
    this.fileInput.click()
  }

  public async import(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer()
    
    // Mammoth options for style mapping
    // We try to map Word styles to HTML tags that Tiptap understands
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "r[style-name='Strong'] => strong",
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
        "comment-reference => sup"
      ],
      includeDefaultStyleMap: true
    }

    try {
      // Show loading state (optional, can be done via events)
      console.log('Importing DOCX...')
      
      const result = await mammoth.convertToHtml({ arrayBuffer }, options)
      const html = result.value
      const messages = result.messages

      if (messages.length > 0) {
        console.warn('Docx import warnings:', messages)
      }

      // Render to editor
      // We set content, preserving history
      this.editor.commands.setContent(html, true)
      
      console.log('DOCX imported successfully')
      
    } catch (error) {
      console.error('Docx import failed:', error)
      alert('导入 DOCX 文档失败，请确保文件格式正确。')
    }
  }

  public destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput)
    }
  }
}
