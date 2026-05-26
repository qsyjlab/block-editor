import type {
  EditorUIModuleMountContext,
  OutlineDataItem,
  OutlineModulePlugin,
} from '@block-editor/editor'

export interface CustomOutlinePluginOptions {
  title?: string
  description?: string
  emptyText?: string
}

function findActiveHeadingPos(headings: OutlineDataItem[], cursorPos: number): number | null {
  let active: number | null = null
  headings.forEach((item) => {
    if (item.pos <= cursorPos) active = item.pos
  })
  return active
}

export function createCustomOutlinePlugin(
  options: CustomOutlinePluginOptions = {},
): OutlineModulePlugin {
  return {
    mount: (ctx: EditorUIModuleMountContext) => {
      const { regionContainer, renderer, editorCore } = ctx
      if (!regionContainer) return

      const i18n = editorCore.i18n.outline
      const state = {
        headings: [] as OutlineDataItem[],
        activePos: null as number | null,
      }

      regionContainer.innerHTML = ''
      regionContainer.style.cssText = `
        height: 100%;
        box-sizing: border-box;
        overflow: auto;
        border-left: 1px solid var(--border-color);
        background: var(--paper-bg);
        padding: 12px;
      `

      const title = document.createElement('h3')
      title.textContent = options.title || '自定义大纲'
      title.style.cssText = 'margin:0;font-size:14px;font-weight:700;color:var(--text-color);'

      const desc = document.createElement('p')
      desc.textContent = options.description || '点击条目可跳转；当前阅读位置会自动高亮。'
      desc.style.cssText =
        'margin:6px 0 10px;font-size:12px;line-height:1.6;color:var(--text-muted);'

      const list = document.createElement('div')
      list.style.cssText = 'display:flex;flex-direction:column;gap:6px;'

      const render = () => {
        list.innerHTML = ''
        if (!state.headings.length) {
          const empty = document.createElement('div')
          empty.textContent = options.emptyText || i18n.untitled
          empty.style.cssText = 'font-size:12px;color:var(--text-muted);padding:6px 2px;'
          list.appendChild(empty)
          return
        }

        state.headings.forEach((item) => {
          const row = document.createElement('button')
          row.type = 'button'
          row.textContent = `H${item.level} · ${item.text || i18n.untitled}`
          row.style.cssText = `
            text-align:left;
            border:1px solid ${state.activePos === item.pos ? 'var(--primary-color)' : 'var(--border-color)'};
            background:${state.activePos === item.pos ? 'color-mix(in srgb, var(--primary-color) 12%, var(--surface-bg))' : 'var(--surface-soft)'};
            color:${state.activePos === item.pos ? 'var(--primary-color)' : 'var(--text-color)'};
            border-radius:8px;
            padding:6px 8px;
            cursor:pointer;
            margin-left:${Math.max(0, (item.level - 1) * 10)}px;
            font-size:12px;
          `
          row.onclick = () => {
            const safe = Math.max(1, item.pos + 1)
            editorCore.editor.commands.setTextSelection(safe)
            editorCore.editor.commands.focus()
          }
          list.appendChild(row)
        })
      }

      const refreshActive = () => {
        const cursorPos = editorCore.editor.state.selection.from
        state.activePos = findActiveHeadingPos(state.headings, cursorPos)
        render()
      }

      const offOutline = renderer.onOutlineDataChange((headings) => {
        state.headings = headings
        refreshActive()
      })

      editorCore.events.on('selectionUpdate', refreshActive)
      state.headings = renderer.getOutlineData()
      refreshActive()

      regionContainer.append(title, desc, list)

      return {
        unmount: () => {
          offOutline()
          editorCore.events.off('selectionUpdate', refreshActive)
          regionContainer.innerHTML = ''
        },
      }
    },
  }
}
