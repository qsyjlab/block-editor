export interface QuotePreviewOptions {
  text: string
  title?: string
  ariaLabel?: string
  className?: string
  onClick?: () => void
}

export function createQuotePreview(options: QuotePreviewOptions): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = ['be-quote-preview', options.className || ''].filter(Boolean).join(' ')
  btn.textContent = options.text ? `| ${options.text}` : ''

  if (options.title) btn.title = options.title
  if (options.ariaLabel) btn.setAttribute('aria-label', options.ariaLabel)
  if (options.onClick) {
    btn.addEventListener('click', () => options.onClick?.())
  }

  return btn
}
