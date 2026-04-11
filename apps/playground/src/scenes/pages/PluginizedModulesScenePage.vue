<script setup lang="ts">
import { ref } from 'vue'
import type { EditorUIModuleMountContext } from '@block-editor/editor'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'

const editorContainer = ref<HTMLElement | null>(null)

function mountPluginOutline(ctx: EditorUIModuleMountContext) {
  const { regionContainer, editorCore } = ctx
  if (!regionContainer) return

  regionContainer.innerHTML = ''
  regionContainer.style.padding = '12px'
  regionContainer.style.overflow = 'auto'
  regionContainer.style.borderLeft = '1px solid var(--border-color)'
  regionContainer.style.background = 'var(--paper-bg)'

  const title = document.createElement('h3')
  title.textContent = '插件化大纲'
  title.style.cssText = 'margin:0 0 8px;font-size:14px;font-weight:700;color:var(--text-color);'
  regionContainer.appendChild(title)

  const tip = document.createElement('p')
  tip.textContent = '由外部插件渲染（非内置 Outline），点击条目可跳转标题。'
  tip.style.cssText = 'margin:0 0 10px;font-size:12px;color:var(--text-muted);'
  regionContainer.appendChild(tip)

  const list = document.createElement('div')
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;'
  regionContainer.appendChild(list)

  const render = () => {
    list.innerHTML = ''
    const headings: Array<{ pos: number; level: number; text: string }> = []
    editorCore.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          pos,
          level: node.attrs.level,
          text: node.textContent || '未命名标题',
        })
      }
      return true
    })

    if (headings.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = '暂无标题'
      empty.style.cssText = 'font-size:12px;color:var(--text-muted);'
      list.appendChild(empty)
      return
    }

    headings.forEach((item) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.textContent = `H${item.level} · ${item.text}`
      row.style.cssText = `
        text-align:left;
        border:1px solid var(--border-color);
        background:var(--surface-soft);
        color:var(--text-color);
        border-radius:8px;
        padding:6px 8px;
        cursor:pointer;
        margin-left:${(item.level - 1) * 8}px;
      `
      row.onclick = () => {
        const safe = Math.max(1, item.pos + 1)
        editorCore.editor.commands.setTextSelection(safe)
        editorCore.editor.commands.focus()
      }
      list.appendChild(row)
    })
  }

  editorCore.events.on('update', render)
  editorCore.events.on('selectionUpdate', render)
  render()

  return {
    unmount: () => {
      editorCore.events.off('update', render)
      editorCore.events.off('selectionUpdate', render)
      regionContainer.innerHTML = ''
    },
  }
}

function mountPluginCommentPanel(ctx: EditorUIModuleMountContext) {
  const { regionContainer, editorCore } = ctx
  if (!regionContainer) return

  regionContainer.innerHTML = ''
  regionContainer.style.padding = '12px'
  regionContainer.style.borderLeft = '1px solid var(--border-color)'
  regionContainer.style.background = 'var(--paper-bg)'
  regionContainer.style.overflow = 'auto'

  const title = document.createElement('h3')
  title.textContent = '插件化评论面板'
  title.style.cssText = 'margin:0 0 8px;font-size:14px;font-weight:700;color:var(--text-color);'
  regionContainer.appendChild(title)

  const tip = document.createElement('p')
  tip.textContent = '示例：外部插件控制评论创建与标记列表，内部只依赖命令与文档结构。'
  tip.style.cssText = 'margin:0 0 10px;font-size:12px;color:var(--text-muted);'
  regionContainer.appendChild(tip)

  const createBtn = document.createElement('button')
  createBtn.type = 'button'
  createBtn.textContent = '基于当前选区创建评论标记'
  createBtn.style.cssText = `
    width:100%;
    height:34px;
    border-radius:8px;
    border:1px solid var(--primary-color);
    background:var(--brand-solid-bg);
    color:var(--brand-solid-text);
    font-size:12px;
    cursor:pointer;
  `
  createBtn.onclick = () => {
    ;(editorCore.editor.commands as any).addComment?.()
    renderMarks()
  }
  regionContainer.appendChild(createBtn)

  const info = document.createElement('div')
  info.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-secondary);'
  regionContainer.appendChild(info)

  const list = document.createElement('div')
  list.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;'
  regionContainer.appendChild(list)

  const renderMarks = () => {
    const ids: string[] = []
    editorCore.editor.state.doc.descendants((node) => {
      if (!node.isText || !node.marks?.length) return true
      node.marks.forEach((mark) => {
        if (mark.type.name === 'comment' && typeof mark.attrs?.commentId === 'string') {
          ids.push(mark.attrs.commentId)
        }
      })
      return true
    })

    const uniq = Array.from(new Set(ids))
    info.textContent = `评论标记数：${uniq.length}`
    list.innerHTML = ''

    if (uniq.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = '暂无评论标记，先在正文选中文本再点创建。'
      empty.style.cssText = 'font-size:12px;color:var(--text-muted);'
      list.appendChild(empty)
      return
    }

    uniq.forEach((id) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.textContent = id
      row.style.cssText = `
        text-align:left;
        border:1px solid var(--border-color);
        background:var(--surface-soft);
        color:var(--text-color);
        border-radius:8px;
        padding:6px 8px;
        cursor:pointer;
      `
      row.onclick = () => {
        const { state } = editorCore.editor
        let foundPos: number | null = null
        state.doc.descendants((node, pos) => {
          if (!node.isText || foundPos !== null) return true
          const hit = node.marks?.some(
            (mark) => mark.type.name === 'comment' && mark.attrs?.commentId === id,
          )
          if (hit) {
            foundPos = pos
            return false
          }
          return true
        })
        if (foundPos === null) return
        const safe = Math.max(1, Math.min(foundPos + 1, state.doc.content.size))
        editorCore.editor.commands.setTextSelection(safe)
        editorCore.editor.commands.focus()
      }
      list.appendChild(row)
    })
  }

  editorCore.events.on('update', renderMarks)
  renderMarks()

  return {
    setVisible: (visible: boolean) => {
      regionContainer.style.display = visible ? 'block' : 'none'
    },
    focusThread: (commentId: string) => {
      const btn = Array.from(list.querySelectorAll('button')).find(
        (node) => node.textContent === commentId,
      ) as HTMLButtonElement | undefined
      btn?.focus()
      btn?.click()
    },
    unmount: () => {
      editorCore.events.off('update', renderMarks)
      regionContainer.innerHTML = ''
    },
  }
}

useSceneEditor('pluginized-modules', editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement('div'),
    content: `
      <h2>插件化模块示例</h2>
      <p>本页将评论面板和大纲完全改为外部插件实现，Editor 内部只负责数据结构与事件转发。</p>
      <p>你可以选中文本后点击“基于当前选区创建评论标记”，并在右侧列表中点击标记定位。</p>
      <h3>第一节</h3>
      <p>这是第一节内容。</p>
      <h3>第二节</h3>
      <p>这是第二节内容。</p>
    `,
    collaboration: {
      enabled: context.collaborationEnabled,
      roomName: context.room,
      websocketUrl: 'wss://demos.yjs.dev',
      user: { name: context.userName, color: context.userColor },
    },
    i18n: context.editorLocale,
  } as any)

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    commentPanelDefaultVisible: true,
    layout: {
      preset: 'editor-outline-comment',
      plugins: {
        outline: {
          mount: mountPluginOutline,
        },
        commentPanel: {
          mount: mountPluginCommentPanel,
        },
      },
    },
  } as any)

  return core
})
</script>

<template>
  <SceneFrame
    title="可插拔模块示例"
    description="示例演示如何通过 EditorUIRenderer.plugins 注入外部评论面板与外部大纲，而不是改内部实现。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
