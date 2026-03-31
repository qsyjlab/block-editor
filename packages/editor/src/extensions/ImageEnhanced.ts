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
import { NodeSelection } from 'prosemirror-state'
import { resolveEditorI18n } from '../i18n'
import type { ImageEnhancedI18n } from '../i18n/types'
import { openImagePreviewFromImage } from '../ui/components/ImagePreviewModal'

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
interface ImageEnhancedOptions {
  HTMLAttributes: Record<string, any>
  i18n: ImageEnhancedI18n
  enableCaption: boolean
}

const DEFAULT_IMAGE_ENHANCED_I18N: ImageEnhancedI18n = resolveEditorI18n('en-US').imageEnhanced

export const ImageEnhanced = Image.extend<ImageEnhancedOptions>({
  name: 'image',

  addOptions() {
    return {
      ...this.parent?.(),
      i18n: DEFAULT_IMAGE_ENHANCED_I18N,
      enableCaption: false,
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center' as ImageAlign,
        parseHTML: (el) =>
          (el.closest('figure')?.getAttribute('data-align') as ImageAlign) || 'center',
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
    return [{ tag: 'figure[data-image] img' }, { tag: 'img[src]' }]
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
          return commands.updateAttributes('image', {
            width,
            height: height ?? null,
          })
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
      img.setAttribute('data-be-image-preview', 'true')
      img.setAttribute('draggable', 'false')
      img.style.cssText =
        'display:block;max-width:100%;height:auto;border-radius:4px;cursor:zoom-in;'
      if (initWidth) {
        img.style.width = `${initWidth}px`
        if (initHeight) img.style.height = `${initHeight}px`
      }
      img.addEventListener('dragstart', (event) => {
        event.preventDefault()
      })

      // --- resize handle (bottom-right corner) ---
      const handle = document.createElement('div')
      handle.className = 'be-resize-handle'
      handle.style.cssText = `
        position:absolute;bottom:4px;right:4px;
        width:12px;height:12px;
        border-right:2px solid color-mix(in srgb, var(--brand-solid-text) 90%, transparent);
        border-bottom:2px solid color-mix(in srgb, var(--brand-solid-text) 90%, transparent);
        cursor:nwse-resize;
        opacity:0;transition:opacity 0.15s;
        z-index:10;
      `

      wrapper.addEventListener('mouseenter', () => {
        handle.style.opacity = '1'
      })
      wrapper.addEventListener('mouseleave', () => {
        handle.style.opacity = '0'
      })

      // drag-resize logic
      let startX = 0,
        startW = 0,
        startH = 0

      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - startX
        const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx))
        // maintain aspect ratio
        const ratio = startH / startW
        const newH = Math.round(newW * ratio)
        img.style.width = `${newW}px`
        img.style.height = `${newH}px`
      }

      const applyImageAttrs = (patch: Record<string, unknown>) => {
        const { state, dispatch } = editor.view

        let basePos: number | null = null
        if (typeof getPos === 'function') {
          basePos = getPos()
        } else {
          try {
            basePos = editor.view.posAtDOM(img, 0)
          } catch {
            basePos = null
          }
        }

        if (typeof basePos === 'number') {
          const candidates = [basePos, basePos + 1, Math.max(0, basePos - 1)]
          const resolvedPos = candidates.find((pos) => {
            const nodeAtPos = state.doc.nodeAt(pos)
            return nodeAtPos?.type.name === 'image'
          })

          if (typeof resolvedPos === 'number') {
            const currentNode = state.doc.nodeAt(resolvedPos)
            if (currentNode) {
              dispatch(
                state.tr.setNodeMarkup(
                  resolvedPos,
                  undefined,
                  { ...currentNode.attrs, ...patch },
                  currentNode.marks,
                ),
              )
              return true
            }
          }
        }

        return editor.chain().focus().updateAttributes('image', patch).run()
      }

      const onUp = (e: MouseEvent) => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        const dx = e.clientX - startX
        const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx))
        const ratio = startH / startW
        const newH = Math.round(newW * ratio)
        if (typeof getPos === 'function') {
          applyImageAttrs({ width: newW, height: newH })
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
      const { bar: alignBar, setActiveAlign } = buildAlignBar(
        this.options.i18n,
        (newAlign) => {
          figure.setAttribute('data-align', newAlign)
          applyFigureAlign(figure, newAlign)
          applyImageAttrs({ align: newAlign })
        },
        () => openImagePreviewFromImage(img, this.options.i18n),
        align,
      )
      const setControlsVisible = (visible: boolean) => {
        alignBar.style.display = visible ? 'flex' : 'none'
        figure.classList.toggle('be-image-controls-active', visible)
        wrapper.classList.toggle('be-image-controls-active', visible)
      }
      setControlsVisible(false)

      const selectCurrentImageNode = () => {
        const { state, dispatch } = editor.view
        let basePos: number | null = null

        if (typeof getPos === 'function') {
          try {
            basePos = getPos()
          } catch {
            basePos = null
          }
        }

        if (typeof basePos !== 'number') {
          try {
            basePos = editor.view.posAtDOM(img, 0)
          } catch {
            basePos = null
          }
        }

        if (typeof basePos !== 'number') return

        const candidates = [basePos, basePos + 1, Math.max(0, basePos - 1)]
        const nodePos = candidates.find((pos) => {
          const nodeAtPos = state.doc.nodeAt(pos)
          return nodeAtPos?.type.name === 'image'
        })
        if (typeof nodePos !== 'number') return
        dispatch(state.tr.setSelection(NodeSelection.create(state.doc, nodePos)))
        editor.view.focus()
      }

      img.addEventListener('click', (e) => {
        e.stopPropagation()
        const controlsVisible = alignBar.style.display !== 'none'
        selectCurrentImageNode()
        setControlsVisible(true)
        if (controlsVisible) {
          openImagePreviewFromImage(img, this.options.i18n)
        }
      })
      img.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        setControlsVisible(true)
        openImagePreviewFromImage(img, this.options.i18n)
      })
      const onDocumentClick = (event: MouseEvent) => {
        if (!figure.contains(event.target as Node)) {
          setControlsVisible(false)
        }
      }
      document.addEventListener('click', onDocumentClick)

      // --- figcaption ---
      let figcaption: HTMLElement | null = null
      if (this.options.enableCaption) {
        const nextFigcaption = document.createElement('figcaption')
        nextFigcaption.className = 'be-image-caption'
        nextFigcaption.contentEditable = 'true'
        nextFigcaption.style.cssText =
          'display:block;text-align:center;font-size:13px;color:var(--text-muted);margin-top:6px;min-height:1em;outline:none;'
        nextFigcaption.textContent = caption
        nextFigcaption.setAttribute('data-placeholder', this.options.i18n.captionPlaceholder)
        nextFigcaption.addEventListener('mousedown', (event) => {
          event.stopPropagation()
          figure.classList.add('be-image-caption-editing')
          setControlsVisible(false)
        })
        nextFigcaption.addEventListener('focus', () => {
          figure.classList.add('be-image-caption-editing')
          setControlsVisible(false)
        })
        nextFigcaption.addEventListener('blur', () => {
          figure.classList.remove('be-image-caption-editing')
        })
        nextFigcaption.addEventListener('input', () => {
          applyImageAttrs({ caption: nextFigcaption.textContent || '' })
        })
        figcaption = nextFigcaption
      }

      // --- assemble ---
      wrapper.appendChild(alignBar)
      wrapper.appendChild(img)
      wrapper.appendChild(handle)
      figure.appendChild(wrapper)
      if (figcaption) {
        figure.appendChild(figcaption)
      }

      return {
        dom: figure,
        ignoreMutation: (mutation) => {
          // ignore caption edits — they're contentEditable but outside contentDOM
          if (figcaption && figcaption.contains(mutation.target as Node)) return true
          return false
        },
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false
          const newAlign: ImageAlign = updatedNode.attrs.align || 'center'
          figure.setAttribute('data-align', newAlign)
          applyFigureAlign(figure, newAlign)
          setActiveAlign(newAlign)
          img.src = updatedNode.attrs.src || ''
          if (updatedNode.attrs.width) {
            img.style.width = `${updatedNode.attrs.width}px`
            img.style.height = updatedNode.attrs.height ? `${updatedNode.attrs.height}px` : 'auto'
          }
          const nextCaption = updatedNode.attrs.caption || ''
          if (
            figcaption &&
            document.activeElement !== figcaption &&
            nextCaption &&
            figcaption.textContent !== nextCaption
          ) {
            figcaption.textContent = nextCaption
          }
          return true
        },
        stopEvent(event) {
          const target = event.target as Node
          // Keep image node interactions fully handled by NodeView.
          if (figcaption && figcaption.contains(target)) return true
          if (alignBar.contains(target)) return true
          if (handle.contains(target)) return true
          if (img.contains(target)) return true
          return false
        },
        destroy() {
          document.removeEventListener('click', onDocumentClick)
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
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
    align === 'center' ? '8px auto' : align === 'right' ? '8px 0 8px auto' : '8px auto 8px 0'
  figure.style.width = align === 'full' ? '100%' : 'fit-content'
  if (align === 'full') {
    const img = figure.querySelector('img') as HTMLImageElement | null
    if (img) {
      img.style.width = '100%'
      img.style.height = 'auto'
    }
  }
}

function buildAlignBar(
  i18n: ImageEnhancedI18n,
  onAlign: (align: ImageAlign) => void,
  onPreview: () => void,
  initialAlign: ImageAlign,
): { bar: HTMLElement; setActiveAlign: (align: ImageAlign) => void } {
  const bar = document.createElement('div')
  bar.className = 'be-image-align-bar be-image-toolbar'

  const opts: { align: ImageAlign; icon: string; title: string }[] = [
    {
      align: 'left',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
      title: i18n.alignLeft,
    },
    {
      align: 'center',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>',
      title: i18n.alignCenter,
    },
    {
      align: 'right',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
      title: i18n.alignRight,
    },
    {
      align: 'full',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="7 9 3 12 7 15"/><polyline points="17 9 21 12 17 15"/></svg>',
      title: i18n.alignFull,
    },
  ]

  const alignButtons = new Map<ImageAlign, HTMLButtonElement>()
  opts.forEach(({ align, icon, title }) => {
    const btn = document.createElement('button')
    btn.className = 'icon-btn be-image-align-btn'
    btn.type = 'button'
    btn.innerHTML = icon
    btn.dataset.tooltip = title
    btn.setAttribute('aria-label', title)
    btn.setAttribute('data-align', align)
    const applyAlign = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onAlign(align)
      setActiveAlign(align)
    }
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    btn.addEventListener('click', applyAlign)
    bar.appendChild(btn)
    alignButtons.set(align, btn)
  })

  const divider = document.createElement('span')
  divider.className = 'divider'
  bar.appendChild(divider)

  const previewBtn = document.createElement('button')
  previewBtn.className = 'icon-btn'
  previewBtn.type = 'button'
  previewBtn.setAttribute('aria-label', i18n.previewImage)
  previewBtn.dataset.tooltip = i18n.previewImage
  previewBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>'
  const openPreview = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onPreview()
  }
  previewBtn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
  })
  previewBtn.addEventListener('click', openPreview)
  bar.appendChild(previewBtn)

  function setActiveAlign(align: ImageAlign) {
    alignButtons.forEach((button, key) => {
      button.classList.toggle('active', key === align)
      button.setAttribute('aria-pressed', key === align ? 'true' : 'false')
    })
  }

  setActiveAlign(initialAlign)
  return { bar, setActiveAlign }
}
