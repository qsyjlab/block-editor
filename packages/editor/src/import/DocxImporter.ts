import mammoth from 'mammoth'
import { Editor } from '@tiptap/core'

/**
 * 将 mammoth 生成的 HTML 进行后处理，补全 Tiptap 自定义节点所需的标记：
 * 1. Callout：识别 data-callout-type 的 div（由 styleMap 注入）
 * 2. Indent：将 margin-left inline style 转为 data-indent 属性
 */
function postProcessHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // ── Indent：将 style="margin-left: Xem" 或 style="margin-left: Xpx" 转为 data-indent ──
  const indentableSelectors = 'p, h1, h2, h3, h4, h5, h6'
  doc.querySelectorAll<HTMLElement>(indentableSelectors).forEach((el) => {
    const ml = el.style.marginLeft
    if (!ml) return

    let level = 0
    if (ml.endsWith('em')) {
      const val = parseFloat(ml)
      // 每 1.5em ≈ 1 级缩进（与 Indent.ts 的 0.5in 约等价）
      level = Math.round(val / 1.5)
    } else if (ml.endsWith('px')) {
      const val = parseFloat(ml)
      // 每 ~48px ≈ 1 级
      level = Math.round(val / 48)
    } else if (ml.endsWith('in')) {
      const val = parseFloat(ml)
      level = Math.round(val / 0.5)
    } else if (ml.endsWith('pt')) {
      const val = parseFloat(ml)
      // 36pt ≈ 0.5in
      level = Math.round(val / 36)
    }

    if (level > 0) {
      el.setAttribute('data-indent', String(Math.min(level, 8)))
      el.style.removeProperty('margin-left')
    }
  })

  // ── Callout：将带有 data-callout-type 的 div 规范化 ──
  // mammoth styleMap 会生成 <div data-callout-type="info"><p>...</p></div>
  // Tiptap Callout parseHTML 已能识别 div[data-callout-type]，无需额外处理
  // 但确保内容 div 下有 paragraph
  doc.querySelectorAll<HTMLElement>('div[data-callout-type]').forEach((el) => {
    // 如果直接包含文本节点，包裹成 <p>
    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const p = doc.createElement('p')
        p.textContent = child.textContent || ''
        el.replaceChild(p, child)
      }
    })
  })

  return doc.body.innerHTML
}

/**
 * DocxImporter — 将 .docx 文件导入 Tiptap 编辑器
 *
 * 支持：
 * - 标准 Word 样式（Heading 1-6, Title, Subtitle）
 * - 加粗/斜体/下划线/删除线
 * - Callout 信息块（需在 Word 中使用特定段落样式：Info Box / Warning Box / Danger Box / Success Box）
 * - 缩进（margin-left 转 data-indent）
 */
export class DocxImporter {
  private fileInput: HTMLInputElement

  constructor(private editor: Editor) {
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = '.docx'
    this.fileInput.style.display = 'none'
    this.fileInput.setAttribute('aria-hidden', 'true')
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

    /**
     * styleMap 说明：
     * - Callout 类型：将 Word 段落样式 "Info Box" / "Warning Box" / "Danger Box" / "Success Box"
     *   映射为带 data-callout-type 属性的 div，由 postProcessHtml 和 Tiptap Callout.parseHTML 识别
     * - 列表/标题等保持默认
     */
    const options = {
      styleMap: [
        // Standard headings
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        // Callout styles — authors can use these paragraph styles in Word
        "p[style-name='Info Box'] => div[data-callout-type='info'] > p:fresh",
        "p[style-name='Warning Box'] => div[data-callout-type='warning'] > p:fresh",
        "p[style-name='Danger Box'] => div[data-callout-type='danger'] > p:fresh",
        "p[style-name='Success Box'] => div[data-callout-type='success'] > p:fresh",
        // Callout 中文样式名备用
        "p[style-name='信息块'] => div[data-callout-type='info'] > p:fresh",
        "p[style-name='警告块'] => div[data-callout-type='warning'] > p:fresh",
        "p[style-name='危险块'] => div[data-callout-type='danger'] > p:fresh",
        "p[style-name='成功块'] => div[data-callout-type='success'] > p:fresh",
        // Inline styles
        "r[style-name='Strong'] => strong",
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
        "comment-reference => sup",
      ],
      includeDefaultStyleMap: true,
      // Preserve indentation via style attributes so postProcessHtml can convert them
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((imageBuffer) => {
          return { src: `data:${image.contentType};base64,${imageBuffer}` }
        })
      }),
    }

    try {
      console.log('Importing DOCX...')

      const result = await mammoth.convertToHtml({ arrayBuffer }, options)
      let html = result.value
      const messages = result.messages

      if (messages.length > 0) {
        console.warn('Docx import warnings:', messages)
      }

      // Post-process: convert indent styles, normalize callout divs
      html = postProcessHtml(html)

      // Set content, preserving history
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
