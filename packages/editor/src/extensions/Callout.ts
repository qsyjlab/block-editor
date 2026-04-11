import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { resolveEditorI18n } from '../i18n'
import type { CalloutI18n } from '../i18n/types'
import { resolveUILayerHost } from '../ui/layer-root'

export type CalloutType = 'info' | 'success' | 'warning' | 'danger'

interface CalloutOptions {
  i18n: CalloutI18n
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (calloutType?: CalloutType) => ReturnType
      setCalloutType: (calloutType: CalloutType) => ReturnType
    }
  }
}

const DEFAULT_CALLOUT_I18N: CalloutI18n = resolveEditorI18n('en-US').callout

function buildCalloutStyles(
  i18n: CalloutI18n,
): Record<CalloutType, { icon: string; label: string }> {
  return {
    info: {
      icon: 'ℹ️',
      label: i18n.infoLabel,
    },
    success: {
      icon: '✅',
      label: i18n.successLabel,
    },
    warning: {
      icon: '⚠️',
      label: i18n.warningLabel,
    },
    danger: {
      icon: '❌',
      label: i18n.dangerLabel,
    },
  }
}

const CALLOUT_TYPES: CalloutType[] = ['info', 'success', 'warning', 'danger']

/** Build the floating type-switcher popup and attach it to `iconEl` */
function attachTypeSwitcher(
  iconEl: HTMLElement,
  styles: Record<CalloutType, { icon: string; label: string }>,
  switchTypeTitle: string,
  getEditor: () => any,
) {
  let popup: HTMLElement | null = null

  const closePopup = () => {
    popup?.remove()
    popup = null
    document.removeEventListener('mousedown', onOutside)
  }

  const onOutside = (e: MouseEvent) => {
    if (
      popup &&
      !popup.contains(e.target as globalThis.Node) &&
      !iconEl.contains(e.target as globalThis.Node)
    ) {
      closePopup()
    }
  }

  iconEl.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (popup) {
      closePopup()
      return
    }

    popup = document.createElement('div')
    popup.className = 'be-callout-switcher-menu'
    popup.setAttribute('aria-label', switchTypeTitle)
    popup.style.position = 'fixed'
    popup.style.zIndex = '99999'

    CALLOUT_TYPES.forEach((t) => {
      const s = styles[t]
      const btn = document.createElement('button')
      btn.className = `be-callout-type-btn be-callout-type-btn--${t}`
      btn.title = s.label
      btn.innerHTML = `<span class="be-callout-type-btn__icon">${s.icon}</span><span class="be-callout-type-btn__label">${s.label}</span>`
      btn.addEventListener('mousedown', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        getEditor()?.commands.setCalloutType(t)
        closePopup()
      })
      popup!.appendChild(btn)
    })

    const host =
      (iconEl.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
      (iconEl.closest('[data-be-ui-root="true"]') as HTMLElement | null) ||
      resolveUILayerHost('dropdown', iconEl)
    host.appendChild(popup)

    // Position below the icon
    const rect = iconEl.getBoundingClientRect()
    const popupW = 4 * 56 + 16 // ~240px estimate
    let left = rect.left
    if (left + popupW > window.innerWidth - 8) {
      left = window.innerWidth - popupW - 8
    }
    popup.style.top = `${rect.bottom + 4}px`
    popup.style.left = `${left}px`

    setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
  })
}

export const Callout = TiptapNode.create<CalloutOptions>({
  name: 'callout',

  addOptions() {
    return {
      i18n: DEFAULT_CALLOUT_I18N,
    }
  },

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      calloutType: {
        default: 'info' as CalloutType,
        parseHTML: (el) => (el.getAttribute('data-callout-type') as CalloutType) || 'info',
        renderHTML: (attrs) => ({ 'data-callout-type': attrs.calloutType }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const type: CalloutType = node.attrs.calloutType || 'info'
    const styles = buildCalloutStyles(this.options.i18n)
    const style = styles[type]

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'be-callout',
        'data-callout-type': type,
      }),
      [
        'span',
        {
          class: 'be-callout-icon',
          'data-callout-switcher': 'true',
          contenteditable: 'false',
          title: this.options.i18n.switchTypeTitle,
        },
        style.icon,
      ],
      ['div', { class: 'be-callout-content', style: 'flex:1;min-width:0;' }, 0],
    ]
  },

  addNodeView() {
    return ({ node, editor }) => {
      const type: CalloutType = node.attrs.calloutType || 'info'
      const styles = buildCalloutStyles(this.options.i18n)
      const style = styles[type]

      const dom = document.createElement('div')
      dom.className = 'be-callout'
      dom.setAttribute('data-callout-type', type)

      const iconEl = document.createElement('span')
      iconEl.className = 'be-callout-icon'
      iconEl.setAttribute('data-callout-switcher', 'true')
      iconEl.setAttribute('contenteditable', 'false')
      iconEl.title = this.options.i18n.switchTypeTitle
      iconEl.textContent = style.icon

      attachTypeSwitcher(iconEl, styles, this.options.i18n.switchTypeTitle, () => editor)

      const contentEl = document.createElement('div')
      contentEl.className = 'be-callout-content'
      contentEl.style.cssText = 'flex:1;min-width:0;'

      dom.appendChild(iconEl)
      dom.appendChild(contentEl)

      return {
        dom,
        contentDOM: contentEl,
        update(updatedNode) {
          if (updatedNode.type.name !== 'callout') return false
          const newType: CalloutType = updatedNode.attrs.calloutType || 'info'
          const newStyle = styles[newType]
          dom.setAttribute('data-callout-type', newType)
          iconEl.textContent = newStyle.icon
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertCallout:
        (calloutType: CalloutType = 'info') =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContent({
              type: 'callout',
              attrs: { calloutType },
              content: [{ type: 'paragraph' }],
            })
            .run()
        },
      setCalloutType:
        (calloutType: CalloutType) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          // Find nearest callout node
          let found = false
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (found || node.type.name !== 'callout') return
            found = true
            if (dispatch) {
              dispatch(tr.setNodeMarkup(pos, undefined, { ...node.attrs, calloutType }))
            }
          })
          return found
        },
    }
  },
})
