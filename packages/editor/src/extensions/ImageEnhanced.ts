/**
 * ImageEnhanced — extends @tiptap/extension-image with:
 *   - alignment (left / center / right / full-width)
 *   - custom width/height via drag-resize handles
 *   - optional caption text below the image
 *
 * NodeView is rendered as:
 *   <figure class="be-image-figure" data-align="…">
 *     <div class="be-image-wrapper">
 *       <img />
 *       <div class="be-resize-handle be-resize-handle-br" />   ← bottom-right corner
 *     </div>
 *     <figcaption class="be-image-caption" contenteditable="true">…</figcaption>
 *   </figure>
 */

import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageEnhanced: {
      setImageAlign: (align: ImageAlign) => ReturnType
      setImageSize: (width: number, height?: number) => ReturnType
    }
  }
}

export type ImageAlign = 'left' | 'center' | 'right' | 'full'

const MIN_WIDTH = 60
const MAX_WIDTH = 1200

export const ImageEnhanced = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center' as ImageAlign,
        parseHTML: (el) => (el.closest('figure')?.getAttribute('data-align') as ImageAlign) || 'center',
        renderHTML: () => ({}), // handled by NodeView / figure wrapper
      },
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const w = el.getAttribute('width') || el.style.width
          return w ? parseInt(w) : null
        },
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      height: {
        default: null as number | null,
        parseHTML: (el) => {
          const h = el.getAttribute('height') || el.style.height
          return h ? parseInt(h) : null
        },
        renderHTML: (attrs) => (attrs.height ? { height: attrs.height } : {}),
      },
      caption: {
        default: '' as string,
        parseHTML: (el) => el.closest('figure')?.querySelector('figcaption')?.textContent || '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'figure[data-image] img' },
      { tag: 'img[src]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: ImageAlign) =>
        ({ commands, editor }) => {
          if (!editor.isActive('image')) return false
          return commands.updateAttributes('image', { align })
        },
      setImageSize:
        (width: number, height?: number) =>
        ({ commands, editor }) => {
          if (!editor.isActive('image')) return false
          return commands.updateAttributes('image', { width, height: height ?? null })
        },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const align: ImageAlign = node.attrs.align || 'center'
      const initWidth: number | null = node.attrs.width
      const initHeight: number | null = node.attrs.height
      const caption: string = node.attrs.caption || ''

      // --- figure ---
      const figure = document.createElement('figure')
      figure.className = 'be-image-figure'
      figure.setAttribute('data-image', 'true')
      figure.setAttribute('data-align', align)
      applyFigureAlign(figure, align)

      // --- wrapper (positions the resize handle) ---
      const wrapper = document.createElement('div')
      wrapper.className = 'be-image-wrapper'
      wrapper.style.cssText = 'position:relative;display:inline-block;max-width:100%;'

      // --- img ---
      const img = document.createElement('img')
      img.src = node.attrs.src || ''
      img.alt = node.attrs.alt || ''
      img.title = node.attrs.title || ''
      img.style.cssText =
        'display:block;max-width:100%;height:auto;border-radius:4px;'
      if (initWidth) {
        img.style.width = `${initWidth}px`
        if (initHeight) img.style.height = `${initHeight}px`
      }

      // --- resize handle (bottom-right corner) ---
      const handle = document.createElement('div')
      handle.className = 'be-resize-handle'
      handle.style.cssText = `
        position:absolute;bottom:4px;right:4px;
        width:12px;height:12px;
        border-right:2px solid rgba(255,255,255,0.9);
        border-bottom:2px solid rgba(255,255,255,0.9);
        cursor:nwse-resize;
        opacity:0;transition:opacity 0.15s;
        z-index:10;
      `

      wrapper.addEventListener('mouseenter', () => { handle.style.opacity = '1' })
      wrapper.addEventListener('mouseleave', () => { handle.style.opacity = '0' })

      // drag-resize logic
      let startX = 0, startW = 0, startH = 0

      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - startX
        let newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx))
        // maintain aspect ratio
        const ratio = startH / startW
        const newH = Math.round(newW * ratio)
        img.style.width = `${newW}px`
        img.style.height = `${newH}px`
      }

      const onUp = (e: MouseEvent) => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        const dx = e.clientX - startX
        let newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx))
        const ratio = startH / startW
        const newH = Math.round(newW * ratio)
        if (typeof getPos === 'function') {
          editor
            .chain()
            .updateAttributes('image', { width: newW, height: newH })
            .run()
        }
      }

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        startX = e.clientX
        startW = img.offsetWidth || initWidth || 300
        startH = img.offsetHeight || initHeight || 200
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      })

      // --- alignment toolbar (appears on click) ---
      const alignBar = buildAlignBar((newAlign) => {
        figure.setAttribute('data-align', newAlign)
        applyFigureAlign(figure, newAlign)
        editor.chain().updateAttributes('image', { align: newAlign }).run()
      })
      alignBar.style.display = 'none'

      img.addEventListener('click', (e) => {
        e.stopPropagation()
        alignBar.style.display = alignBar.style.display === 'none' ? 'flex' : 'none'
      })
      document.addEventListener('click', () => {
        alignBar.style.display = 'none'
      })

      // --- figcaption ---
      const figcaption = document.createElement('figcaption')
      figcaption.className = 'be-image-caption'
      figcaption.contentEditable = 'true'
      figcaption.style.cssText =
        'display:block;text-align:center;font-size:13px;color:#6b7280;margin-top:6px;min-height:1em;outline:none;'
      figcaption.textContent = caption
      figcaption.setAttribute('data-placeholder', '添加图片说明…')

      figcaption.addEventListener('input', () => {
        editor.chain().updateAttributes('image', { caption: figcaption.textContent || '' }).run()
      })

      // --- assemble ---
      wrapper.appendChild(img)
      wrapper.appendChild(handle)
      figure.appendChild(alignBar)
      figure.appendChild(wrapper)
      figure.appendChild(figcaption)

      return {
        dom: figure,
        ignoreMutation: (mutation) => {
          // ignore caption edits — they're contentEditable but outside contentDOM
          if (figcaption.contains(mutation.target as Node)) return true
          return false
        },
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false
          const newAlign: ImageAlign = updatedNode.attrs.align || 'center'
          figure.setAttribute('data-align', newAlign)
          applyFigureAlign(figure, newAlign)
          img.src = updatedNode.attrs.src || ''
          if (updatedNode.attrs.width) {
            img.style.width = `${updatedNode.attrs.width}px`
            img.style.height = updatedNode.attrs.height ? `${updatedNode.attrs.height}px` : 'auto'
          }
          figcaption.textContent = updatedNode.attrs.caption || ''
          return true
        },
        stopEvent(event) {
          // Allow clicks/keyboard inside figcaption
          if (figcaption.contains(event.target as Node)) return true
          return false
        },
      }
    }
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyFigureAlign(figure: HTMLElement, align: ImageAlign) {
  figure.style.display = 'block'
  figure.style.margin =
    align === 'center' ? '8px auto'
    : align === 'right' ? '8px 0 8px auto'
    : '8px auto 8px 0'
  figure.style.width = align === 'full' ? '100%' : 'fit-content'
  if (align === 'full') {
    const img = figure.querySelector('img') as HTMLImageElement | null
    if (img) { img.style.width = '100%'; img.style.height = 'auto' }
  }
}

function buildAlignBar(onAlign: (align: ImageAlign) => void): HTMLElement {
  const bar = document.createElement('div')
  bar.style.cssText = `
    display:flex;gap:4px;justify-content:center;
    background:rgba(17,24,39,0.75);border-radius:6px;
    padding:3px 6px;margin-bottom:6px;
  `

  const opts: { align: ImageAlign; icon: string; title: string }[] = [
    { align: 'left',   icon: '⬅',  title: '左对齐' },
    { align: 'center', icon: '↔',  title: '居中' },
    { align: 'right',  icon: '➡',  title: '右对齐' },
    { align: 'full',   icon: '⬌',  title: '宽度铺满' },
  ]

  opts.forEach(({ align, icon, title }) => {
    const btn = document.createElement('button')
    btn.title = title
    btn.textContent = icon
    btn.style.cssText = `
      background:transparent;border:none;color:white;
      cursor:pointer;font-size:14px;padding:2px 4px;
      border-radius:4px;transition:background 0.1s;
    `
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.2)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent' })
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onAlign(align)
    })
    bar.appendChild(btn)
  })

  return bar
}
