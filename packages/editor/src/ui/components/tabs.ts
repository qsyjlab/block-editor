import { icons } from '../toolbar/icons';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  content: HTMLElement;
}

export class Tabs {
  private container: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  private items: TabItem[];
  private activeTabId: string;

  constructor(items: TabItem[], defaultActiveId?: string) {
    this.items = items;
    this.activeTabId = defaultActiveId || items[0].id;
    
    this.container = document.createElement('div');
    this.header = document.createElement('div');
    this.header.className = 'be-flex be-gap-2 be-mb-6 be-bg-gray-100 be-p-1 be-rounded-xl';
    
    this.content = document.createElement('div');
    
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);

    this.render();
  }

  private render() {
    this.header.innerHTML = '';
    this.items.forEach(item => {
        const btn = document.createElement('button');
        const isActive = item.id === this.activeTabId;
        btn.className = `be-flex-1 be-py-2.5 be-rounded-lg be-text-sm be-font-medium be-transition-all ${isActive ? 'be-bg-white be-text-gray-900 be-shadow-sm' : 'be-text-gray-600 be-hover:text-gray-900'}`;
        
        const inner = document.createElement('div');
        inner.className = 'be-flex be-items-center be-justify-center be-gap-2';
        
        if (item.icon && icons[item.icon]) {
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = icons[item.icon];
            const svg = iconSpan.querySelector('svg');
            if (svg) {
              svg.setAttribute('width', '16');
              svg.setAttribute('height', '16');
            }
            inner.appendChild(iconSpan);
        }

        const span = document.createElement('span');
        span.textContent = item.label;
        inner.appendChild(span);
        btn.appendChild(inner);

        btn.onclick = () => {
            this.activeTabId = item.id;
            this.render();
            this.updateContent();
        };
        this.header.appendChild(btn);
    });

    this.updateContent();
  }

  private updateContent() {
    this.content.innerHTML = '';
    const activeItem = this.items.find(i => i.id === this.activeTabId);
    if (activeItem) {
        this.content.appendChild(activeItem.content);
    }
  }

  public getElement() {
    return this.container;
  }
}
