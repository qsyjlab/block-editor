export class ColorSpectrum {
  private element: HTMLElement
  private onChange: (color: string) => void
  private h = 0 // Hue 0-360
  private s = 100 // Saturation 0-100
  private v = 100 // Value 0-100

  constructor(onChange: (color: string) => void) {
    this.onChange = onChange
    this.element = document.createElement('div')
    this.element.className = 'color-spectrum-panel'
    this.render()
  }

  getElement() {
    return this.element
  }

  private render() {
    const initialColor = this.resolveInitialColor()

    // 1. Spectrum Area (S/V)
    const spectrum = document.createElement('div')
    spectrum.className = 'spectrum-area'

    const cursor = document.createElement('div')
    cursor.className = 'spectrum-cursor'
    spectrum.appendChild(cursor)

    // 2. Hue Slider
    const hueSlider = document.createElement('div')
    hueSlider.className = 'hue-slider'

    const hueThumb = document.createElement('div')
    hueThumb.className = 'hue-thumb'
    hueSlider.appendChild(hueThumb)

    // 3. Inputs
    const inputRow = document.createElement('div')
    inputRow.className = 'color-input-row'

    const hexInput = document.createElement('input')
    hexInput.className = 'hex-input'
    hexInput.value = initialColor

    const preview = document.createElement('div')
    preview.className = 'color-preview'
    preview.style.backgroundColor = initialColor

    inputRow.appendChild(hexInput)
    inputRow.appendChild(preview)

    this.element.appendChild(spectrum)
    this.element.appendChild(hueSlider)
    this.element.appendChild(inputRow)

    // Events
    this.bindSpectrumEvents(spectrum, cursor, hexInput, preview)
    this.bindHueEvents(hueSlider, hueThumb, spectrum, hexInput, preview)

    hexInput.onchange = (e) => {
      const val = (e.target as HTMLInputElement).value
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        this.onChange(val)
        preview.style.backgroundColor = val
        // TODO: Update H/S/V from hex if needed for bi-directional sync
      }
    }
  }

  private resolveInitialColor() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color')
      .trim()
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw
    return '#4f7cff'
  }

  private bindSpectrumEvents(
    area: HTMLElement,
    cursor: HTMLElement,
    input: HTMLInputElement,
    preview: HTMLElement,
  ) {
    const update = (e: MouseEvent) => {
      const rect = area.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top

      x = Math.max(0, Math.min(x, rect.width))
      y = Math.max(0, Math.min(y, rect.height))

      cursor.style.left = `${x}px`
      cursor.style.top = `${y}px`

      this.s = (x / rect.width) * 100
      this.v = 100 - (y / rect.height) * 100

      const color = this.hsvToHex(this.h, this.s, this.v)
      input.value = color
      preview.style.backgroundColor = color
      this.onChange(color)
    }

    let isDragging = false
    area.onmousedown = (e) => {
      isDragging = true
      update(e)
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    const onMove = (e: MouseEvent) => {
      if (isDragging) update(e)
    }

    const onUp = () => {
      isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }

  private bindHueEvents(
    slider: HTMLElement,
    thumb: HTMLElement,
    spectrum: HTMLElement,
    input: HTMLInputElement,
    preview: HTMLElement,
  ) {
    const update = (e: MouseEvent) => {
      const rect = slider.getBoundingClientRect()
      let x = e.clientX - rect.left
      x = Math.max(0, Math.min(x, rect.width))

      thumb.style.left = `${x}px`
      this.h = (x / rect.width) * 360

      // Update spectrum background color
      spectrum.style.backgroundColor = `hsl(${this.h}, 100%, 50%)`

      const color = this.hsvToHex(this.h, this.s, this.v)
      input.value = color
      preview.style.backgroundColor = color
      this.onChange(color)
    }

    let isDragging = false
    slider.onmousedown = (e) => {
      isDragging = true
      update(e)
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    const onMove = (e: MouseEvent) => {
      if (isDragging) update(e)
    }

    const onUp = () => {
      isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }

  private hsvToHex(h: number, s: number, v: number): string {
    s /= 100
    v /= 100
    const f = (n: number) => {
      const k = (n + h / 60) % 6
      return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)
    }
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`
  }
}
