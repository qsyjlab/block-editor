export interface BaseTagOptions {
  label: string
  ariaLabel?: string
  active?: boolean
  className?: string
}

export function createBaseTag(options: BaseTagOptions): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = options.label
  btn.className = ['be-tag', options.className || ''].filter(Boolean).join(' ')

  if (options.ariaLabel) {
    btn.setAttribute('aria-label', options.ariaLabel)
  }
  if (options.active) {
    btn.classList.add('is-active')
  }

  return btn
}
