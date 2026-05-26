import type { ImageEnhancedI18n } from '../../i18n/types'
import { resolveUILayerHost } from '../layer-root'

interface PreviewItem {
  src: string
  alt: string
  title: string
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const ZOOM_STEP = 0.1

class ImagePreviewModal {
  private overlay: HTMLElement
  private centerEl: HTMLElement
  private imageEl: HTMLImageElement
  private statusEl: HTMLElement
  private hintEl: HTMLElement
  private counterEl: HTMLElement
  private scaleEl: HTMLButtonElement
  private prevBtn: HTMLButtonElement
  private nextBtn: HTMLButtonElement
  private zoomInBtn: HTMLButtonElement
  private zoomOutBtn: HTMLButtonElement
  private rotateBtn: HTMLButtonElement
  private downloadBtn: HTMLButtonElement
  private closeBtn: HTMLButtonElement
  private items: PreviewItem[] = []
  private activeIndex = 0
  private scale = 1
  private rotation = 0
  private offsetX = 0
  private offsetY = 0
  private dragStartX = 0
  private dragStartY = 0
  private dragOriginX = 0
  private dragOriginY = 0
  private isDragging = false
  private dragPointerId: number | null = null
  private i18n: ImageEnhancedI18n
  private previousOverflow = ''
  private isMounted = false
  private mountHost: HTMLElement | null = null

  constructor(i18n: ImageEnhancedI18n) {
    this.i18n = i18n
    this.overlay = document.createElement('div')
    this.overlay.className = 'be-image-viewer-overlay'

    const stage = document.createElement('div')
    stage.className = 'be-image-viewer-stage'

    this.closeBtn = this.createIconButton(
      'be-image-viewer-close',
      i18n.closePreview,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    )

    const center = document.createElement('div')
    center.className = 'be-image-viewer-center'
    this.centerEl = center

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'be-image-viewer-status'

    this.imageEl = document.createElement('img')
    this.imageEl.className = 'be-image-viewer-image'

    this.hintEl = document.createElement('div')
    this.hintEl.className = 'be-image-viewer-hint'

    center.appendChild(this.statusEl)
    center.appendChild(this.imageEl)
    center.appendChild(this.hintEl)

    stage.appendChild(center)

    const toolbar = document.createElement('div')
    toolbar.className = 'be-image-viewer-toolbar'

    this.prevBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewPrev,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    )
    this.counterEl = document.createElement('span')
    this.counterEl.className = 'be-image-viewer-counter'

    this.nextBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewNext,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
    )

    this.zoomOutBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewZoomOut,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    )
    this.scaleEl = document.createElement('button')
    this.scaleEl.type = 'button'
    this.scaleEl.className = 'be-image-viewer-scale'
    this.scaleEl.setAttribute('aria-label', i18n.previewScale)
    this.scaleEl.title = i18n.previewScale

    this.zoomInBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewZoomIn,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    )

    this.rotateBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewRotate,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"/></svg>',
    )
    this.downloadBtn = this.createIconButton(
      'be-image-viewer-tool-btn',
      i18n.previewDownload,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    )

    toolbar.appendChild(this.prevBtn)
    toolbar.appendChild(this.counterEl)
    toolbar.appendChild(this.nextBtn)
    toolbar.appendChild(this.createDivider())
    toolbar.appendChild(this.zoomOutBtn)
    toolbar.appendChild(this.scaleEl)
    toolbar.appendChild(this.zoomInBtn)
    toolbar.appendChild(this.createDivider())
    toolbar.appendChild(this.rotateBtn)
    toolbar.appendChild(this.downloadBtn)

    this.overlay.appendChild(stage)
    this.overlay.appendChild(this.closeBtn)
    this.overlay.appendChild(toolbar)

    this.bindEvents()
  }

  openFromImage(sourceImage: HTMLImageElement, i18n: ImageEnhancedI18n) {
    this.i18n = i18n
    this.syncLabels()
    const { items, index } = this.collectItems(sourceImage)
    if (items.length === 0) return
    this.items = items
    this.activeIndex = index
    this.scale = 1
    this.rotation = 0
    this.offsetX = 0
    this.offsetY = 0
    this.mountHost = resolveUILayerHost('modal', sourceImage)
    this.mount()
    this.renderCurrent()
  }

  private bindEvents() {
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close()
    })
    this.closeBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.close()
    })
    this.prevBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.goPrev()
    })
    this.nextBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.goNext()
    })
    this.zoomOutBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.zoomOut()
    })
    this.zoomInBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.zoomIn()
    })
    this.scaleEl.addEventListener('click', (event) => {
      event.preventDefault()
      this.resetScale()
    })
    this.rotateBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.rotate()
    })
    this.downloadBtn.addEventListener('click', (event) => {
      event.preventDefault()
      this.downloadCurrent()
    })
    this.imageEl.addEventListener('pointerdown', this.handleImagePointerDown)
    this.imageEl.addEventListener('dragstart', (event) => {
      event.preventDefault()
    })
    this.centerEl.addEventListener('wheel', this.handleWheelZoom, {
      passive: false,
    })

    this.imageEl.addEventListener('load', () => {
      this.overlay.classList.add('is-loaded')
      this.statusEl.textContent = ''
    })
    this.imageEl.addEventListener('error', () => {
      this.overlay.classList.add('is-error')
      this.statusEl.textContent = this.i18n.previewLoadFailed
    })
  }

  private mount() {
    if (!this.isMounted) {
      ;(this.mountHost || resolveUILayerHost('modal')).appendChild(this.overlay)
      this.isMounted = true
    }

    this.previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    this.overlay.classList.add('open')
    document.addEventListener('keydown', this.handleKeyDown, true)
  }

  private close() {
    if (!this.isMounted) return
    this.endImageDrag()
    this.overlay.classList.remove('open', 'is-loaded', 'is-error')
    this.imageEl.removeAttribute('src')
    this.statusEl.textContent = ''
    document.body.style.overflow = this.previousOverflow
    document.removeEventListener('keydown', this.handleKeyDown, true)
    this.overlay.remove()
    this.isMounted = false
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      this.goPrev()
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      this.goNext()
      return
    }
  }

  private renderCurrent() {
    const current = this.items[this.activeIndex]
    if (!current) return

    this.overlay.classList.remove('is-loaded', 'is-error')
    this.statusEl.textContent = this.i18n.previewLoading
    this.imageEl.src = current.src
    this.imageEl.alt = current.alt || current.title || this.i18n.previewImage
    this.hintEl.textContent = current.alt || current.title || this.i18n.previewImage
    this.counterEl.textContent = `${this.activeIndex + 1}/${this.items.length}`
    this.prevBtn.disabled = this.activeIndex <= 0
    this.nextBtn.disabled = this.activeIndex >= this.items.length - 1
    this.applyTransform()
  }

  private goPrev() {
    if (this.activeIndex <= 0) return
    this.activeIndex -= 1
    this.scale = 1
    this.rotation = 0
    this.offsetX = 0
    this.offsetY = 0
    this.renderCurrent()
  }

  private goNext() {
    if (this.activeIndex >= this.items.length - 1) return
    this.activeIndex += 1
    this.scale = 1
    this.rotation = 0
    this.offsetX = 0
    this.offsetY = 0
    this.renderCurrent()
  }

  private zoomIn() {
    this.scale = Math.min(MAX_ZOOM, Number((this.scale + ZOOM_STEP).toFixed(2)))
    this.applyTransform()
  }

  private zoomOut() {
    this.scale = Math.max(MIN_ZOOM, Number((this.scale - ZOOM_STEP).toFixed(2)))
    this.applyTransform()
  }

  private resetScale() {
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.applyTransform()
  }

  private rotate() {
    this.rotation = (this.rotation + 90) % 360
    this.applyTransform()
  }

  private applyTransform() {
    this.imageEl.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale}) rotate(${this.rotation}deg)`
    this.scaleEl.textContent = `${Math.round(this.scale * 100)}%`
  }

  private handleImagePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!this.overlay.classList.contains('open')) return

    this.dragPointerId = event.pointerId
    this.isDragging = true
    this.dragStartX = event.clientX
    this.dragStartY = event.clientY
    this.dragOriginX = this.offsetX
    this.dragOriginY = this.offsetY
    this.imageEl.classList.add('is-dragging')
    try {
      this.imageEl.setPointerCapture(event.pointerId)
    } catch {
      // noop
    }

    window.addEventListener('pointermove', this.handleImagePointerMove, true)
    window.addEventListener('pointerup', this.handleImagePointerUp, true)
    window.addEventListener('pointercancel', this.handleImagePointerUp, true)
    event.preventDefault()
  }

  private handleImagePointerMove = (event: PointerEvent) => {
    if (!this.isDragging || this.dragPointerId !== event.pointerId) return
    this.offsetX = this.dragOriginX + (event.clientX - this.dragStartX)
    this.offsetY = this.dragOriginY + (event.clientY - this.dragStartY)
    this.applyTransform()
    event.preventDefault()
  }

  private handleImagePointerUp = (event: PointerEvent) => {
    if (this.dragPointerId !== event.pointerId) return
    this.endImageDrag()
    event.preventDefault()
  }

  private endImageDrag() {
    this.isDragging = false
    if (this.dragPointerId !== null) {
      try {
        this.imageEl.releasePointerCapture(this.dragPointerId)
      } catch {
        // noop
      }
    }
    this.dragPointerId = null
    this.imageEl.classList.remove('is-dragging')
    window.removeEventListener('pointermove', this.handleImagePointerMove, true)
    window.removeEventListener('pointerup', this.handleImagePointerUp, true)
    window.removeEventListener('pointercancel', this.handleImagePointerUp, true)
  }

  private handleWheelZoom = (event: WheelEvent) => {
    if (!this.overlay.classList.contains('open')) return
    event.preventDefault()
    if (event.deltaY === 0) return

    const direction = event.deltaY < 0 ? 1 : -1
    const wheelStep = Math.min(0.4, Math.max(0.05, Math.abs(event.deltaY) / 600))
    const nextScale = this.scale + direction * wheelStep
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale))
    this.scale = Number(clamped.toFixed(2))
    this.applyTransform()
  }

  private downloadCurrent() {
    const current = this.items[this.activeIndex]
    if (!current?.src) return
    const a = document.createElement('a')
    a.href = current.src
    a.download = this.getFileName(current.src)
    a.rel = 'noopener'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  private getFileName(src: string) {
    try {
      const url = new URL(src, window.location.href)
      const rawName = url.pathname.split('/').pop() || 'image'
      return rawName.includes('.') ? rawName : `${rawName}.png`
    } catch {
      return 'image.png'
    }
  }

  private collectItems(sourceImage: HTMLImageElement) {
    const root =
      sourceImage.closest('.ProseMirror') ||
      (document.querySelector('.ProseMirror') as HTMLElement | null) ||
      document.body
    const nodes = Array.from(
      root.querySelectorAll<HTMLImageElement>('img[data-be-image-preview="true"]'),
    )
    const targets = nodes.length > 0 ? nodes : [sourceImage]
    const items: PreviewItem[] = targets.map((img) => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      title: img.getAttribute('title') || '',
    }))
    let index = targets.indexOf(sourceImage)
    if (index < 0) {
      index = items.findIndex((item) => item.src === sourceImage.src)
    }
    return {
      items: items.filter((item) => item.src),
      index: Math.max(0, index),
    }
  }

  private syncLabels() {
    this.closeBtn.setAttribute('aria-label', this.i18n.closePreview)
    this.prevBtn.setAttribute('aria-label', this.i18n.previewPrev)
    this.nextBtn.setAttribute('aria-label', this.i18n.previewNext)
    this.zoomOutBtn.setAttribute('aria-label', this.i18n.previewZoomOut)
    this.zoomInBtn.setAttribute('aria-label', this.i18n.previewZoomIn)
    this.rotateBtn.setAttribute('aria-label', this.i18n.previewRotate)
    this.downloadBtn.setAttribute('aria-label', this.i18n.previewDownload)
    this.scaleEl.setAttribute('aria-label', this.i18n.previewScale)

    this.closeBtn.title = this.i18n.closePreview
    this.prevBtn.title = this.i18n.previewPrev
    this.nextBtn.title = this.i18n.previewNext
    this.zoomOutBtn.title = this.i18n.previewZoomOut
    this.zoomInBtn.title = this.i18n.previewZoomIn
    this.rotateBtn.title = this.i18n.previewRotate
    this.downloadBtn.title = this.i18n.previewDownload
    this.scaleEl.title = this.i18n.previewScale
  }

  private createIconButton(className: string, ariaLabel: string, icon: string) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = className
    btn.setAttribute('aria-label', ariaLabel)
    btn.title = ariaLabel
    btn.innerHTML = icon
    return btn
  }

  private createDivider() {
    const divider = document.createElement('span')
    divider.className = 'be-image-viewer-divider'
    return divider
  }
}

let singleton: ImagePreviewModal | null = null

export function openImagePreviewFromImage(sourceImage: HTMLImageElement, i18n: ImageEnhancedI18n) {
  if (!singleton) {
    singleton = new ImagePreviewModal(i18n)
  }
  singleton.openFromImage(sourceImage, i18n)
}
