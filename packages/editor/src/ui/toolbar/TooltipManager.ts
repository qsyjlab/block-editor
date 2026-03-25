import { computePosition, flip, shift, offset, arrow, autoUpdate } from '@floating-ui/dom';

export class TooltipManager {
  private tooltip: HTMLElement;
  private arrowElement: HTMLElement;
  private currentTarget: HTMLElement | null = null;
  private cleanup: (() => void) | null = null;

  constructor() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'global-tooltip';
    
    this.arrowElement = document.createElement('div');
    this.arrowElement.className = 'tooltip-arrow';
    this.tooltip.appendChild(this.arrowElement);

    document.body.appendChild(this.tooltip);
    
    this.attachListeners();
  }

  private attachListeners() {
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (target && target !== this.currentTarget) {
        this.currentTarget = target as HTMLElement;
        const text = this.currentTarget.getAttribute('data-tooltip');
        if (text) this.show(this.currentTarget, text);
      }
    });

    document.addEventListener('mouseout', (e) => {
       const target = (e.target as HTMLElement).closest('[data-tooltip]');
       if (target && target === this.currentTarget) {
         // Check if the relatedTarget (where mouse went) is still inside currentTarget
         const relatedTarget = e.relatedTarget as Node | null;
         if (relatedTarget && this.currentTarget.contains(relatedTarget)) {
             return;
         }
         
         this.hide();
         this.currentTarget = null;
       }
    });
  }

  private show(target: HTMLElement, text: string) {
    // Clear previous content but keep arrow
    this.tooltip.innerHTML = '';
    
    // Create tooltip content structure
    const content = document.createElement('div');
    content.className = 'tooltip-content';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'tooltip-text';
    textSpan.textContent = text;
    content.appendChild(textSpan);
    
    const shortcut = target.getAttribute('data-shortcut');
    if (shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.className = 'tooltip-shortcut';
        shortcutSpan.textContent = shortcut;
        content.appendChild(shortcutSpan);
    }
    
    this.tooltip.appendChild(content);
    this.tooltip.appendChild(this.arrowElement);

    this.tooltip.style.display = 'block';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.top = '0';
    this.tooltip.style.left = '0';
    this.tooltip.style.zIndex = '200000';
    
    // Ensure initial visibility is hidden until positioned
    // opacity is handled by css class .visible, but visibility helps avoid flicker
    this.tooltip.style.visibility = 'hidden';

    if (this.cleanup) this.cleanup();

    this.cleanup = autoUpdate(target, this.tooltip, () => {
      // Check if target is still connected to DOM
      if (!target.isConnected) {
          this.hide();
          this.currentTarget = null;
          return;
      }

      computePosition(target, this.tooltip, {
        placement: 'top',
        strategy: 'fixed',
        middleware: [
          offset(6),
          flip(),
          shift({ padding: 5 }),
          arrow({ element: this.arrowElement }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        Object.assign(this.tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
          visibility: 'visible',
        });

        // Accessing the arrow data
        const { x: arrowX, y: arrowY } = middlewareData.arrow || {};

        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right',
        }[placement.split('-')[0]];

        Object.assign(this.arrowElement.style, {
          left: arrowX != null ? `${arrowX}px` : '',
          top: arrowY != null ? `${arrowY}px` : '',
          right: '',
          bottom: '',
          [staticSide!]: '-4px', // Arrow size
        });
        
        this.tooltip.classList.add('visible');
      });
    });
  }

  private hide() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.tooltip.classList.remove('visible');
    this.tooltip.style.display = 'none';
    this.tooltip.style.visibility = 'hidden';
  }
}
