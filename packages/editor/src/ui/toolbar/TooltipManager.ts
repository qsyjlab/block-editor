import { GlobalTooltip } from '../components/Tooltip'

export class TooltipManager {
  private tooltip: GlobalTooltip
  private currentTarget: HTMLElement | null = null

  constructor() {
    this.tooltip = new GlobalTooltip()
    this.attachListeners()
  }

  private attachListeners() {
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]')
      if (target && target !== this.currentTarget) {
        this.currentTarget = target as HTMLElement
        const text = this.currentTarget.getAttribute('data-tooltip')
        if (text) this.show(this.currentTarget, text)
      }
    })

    document.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]')
      if (target && target === this.currentTarget) {
        // Check if the relatedTarget (where mouse went) is still inside currentTarget
        const relatedTarget = e.relatedTarget as Node | null
        if (relatedTarget && this.currentTarget.contains(relatedTarget)) {
          return
        }

        this.hide()
        this.currentTarget = null
      }
    })
  }

  private show(target: HTMLElement, text: string) {
    const shortcut = target.getAttribute('data-shortcut')
    this.tooltip.show(target, text, shortcut)
  }

  private hide() {
    this.tooltip.hide()
  }
}
