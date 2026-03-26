import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import type { CalloutI18n } from '../i18n/types'

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

const DEFAULT_CALLOUT_I18N: CalloutI18n = {
  infoLabel: '信息',
  successLabel: '成功',
  warningLabel: '警告',
  dangerLabel: '危险',
  switchTypeTitle: '点击切换类型',
}

function buildCalloutStyles(i18n: CalloutI18n): Record<
  CalloutType,
  { bg: string; border: string; icon: string; label: string }
> {
  return {
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      icon: 'ℹ️',
      label: i18n.infoLabel,
    },
    success: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: '✅',
      label: i18n.successLabel,
    },
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      icon: '⚠️',
      label: i18n.warningLabel,
    },
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      icon: '❌',
      label: i18n.dangerLabel,
    },
  }
}

const CALLOUT_TYPES: CalloutType[] = ['info', 'success', 'warning', 'danger']

/** Build the floating type-switcher popup and attach it to `iconEl` */
function attachTypeSwitcher(
  iconEl: HTMLElement,
  styles: Record<CalloutType, { bg: string; border: string; icon: string; label: string }>,
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
    if (popup && !popup.contains(e.target as globalThis.Node) && !iconEl.contains(e.target as globalThis.Node)) {
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
    popup.setAttribute('aria-label', switchTypeTitle)
    Object.assign(popup.style, {
      position: 'fixed',
      zIndex: '99999',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 10px 24px -4px rgba(0,0,0,0.14)',
      padding: '4px',
      display: 'flex',
      gap: '2px',
    })

    CALLOUT_TYPES.forEach((t) => {
      const s = styles[t]
      const btn = document.createElement('button')
      Object.assign(btn.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '6px 10px',
        border: '1px solid transparent',
        borderRadius: '6px',
        background: s.bg,
        cursor: 'pointer',
        fontSize: '18px',
        lineHeight: '1',
        transition: 'border-color 0.1s',
        minWidth: '44px',
      })
      btn.title = s.label
      btn.innerHTML = `<span>${s.icon}</span><span style="font-size:10px;color:#6b7280;font-family:inherit;">${s.label}</span>`

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = s.border
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'transparent'
      })
      btn.addEventListener('mousedown', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        getEditor()?.commands.setCalloutType(t)
        closePopup()
      })
      popup!.appendChild(btn)
    })

    document.body.appendChild(popup)

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
        style: `background:${style.bg};border:1px solid ${style.border};border-radius:6px;padding:12px 16px;margin:4px 0;display:flex;gap:10px;`,
      }),
      [
        'span',
        {
          class: 'be-callout-icon',
          'data-callout-switcher': 'true',
          style:
            'flex-shrink:0;font-size:16px;margin-top:1px;cursor:pointer;border-radius:4px;padding:1px 3px;transition:background 0.15s;',
          contenteditable: 'false',
          title: this.options.i18n.switchTypeTitle,
        },
        style.icon,
      ],
      [
        'div',
        { class: 'be-callout-content', style: 'flex:1;min-width:0;' },
        0,
      ],
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
      dom.style.cssText = `background:${style.bg};border:1px solid ${style.border};border-radius:6px;padding:12px 16px;margin:4px 0;display:flex;gap:10px;`

      const iconEl = document.createElement('span')
      iconEl.className = 'be-callout-icon'
      iconEl.setAttribute('data-callout-switcher', 'true')
      iconEl.setAttribute('contenteditable', 'false')
      iconEl.title = this.options.i18n.switchTypeTitle
      iconEl.style.cssText =
        'flex-shrink:0;font-size:16px;margin-top:1px;cursor:pointer;border-radius:4px;padding:1px 3px;transition:background 0.15s;user-select:none;'
      iconEl.textContent = style.icon

      iconEl.addEventListener('mouseenter', () => {
        iconEl.style.background = 'rgba(0,0,0,0.07)'
      })
      iconEl.addEventListener('mouseleave', () => {
        iconEl.style.background = 'transparent'
      })

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
          dom.style.background = newStyle.bg
          dom.style.borderColor = newStyle.border
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
