export interface PanelCardOptions {
  className?: string
  role?: string
  clickable?: boolean
}

export function createPanelCard(options: PanelCardOptions = {}): HTMLElement {
  const card = document.createElement('div')
  card.className = ['be-panel-card', options.className || ''].filter(Boolean).join(' ')

  if (options.role) {
    card.setAttribute('role', options.role)
  }
  if (options.clickable) {
    card.classList.add('be-panel-card--clickable')
  }

  return card
}
