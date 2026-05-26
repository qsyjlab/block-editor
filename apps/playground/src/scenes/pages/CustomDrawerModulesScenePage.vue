<script setup lang="ts">
import { ref } from 'vue'
import type { EditorUILayoutBuilderParams } from '@block-editor/editor'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'
import { createCustomCommentPanelPlugin } from '../plugins/createCustomCommentPanelPlugin'
import { createCustomOutlinePlugin } from '../plugins/createCustomOutlinePlugin'

const editorContainer = ref<HTMLElement | null>(null)

function buildDrawerLayout({ container, editorCore }: EditorUILayoutBuilderParams) {
  container.innerHTML = ''
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.minWidth = '0'
  container.style.minHeight = '0'

  const toolbarContainer = document.createElement('div')
  container.appendChild(toolbarContainer)

  const body = document.createElement('div')
  body.style.display = 'grid'
  body.style.gridTemplateColumns = '1fr 340px'
  body.style.minWidth = '0'
  body.style.minHeight = '0'
  body.style.flex = '1'
  container.appendChild(body)

  const editorWrap = document.createElement('div')
  editorWrap.style.minWidth = '0'
  editorWrap.style.minHeight = '0'
  editorWrap.style.display = 'flex'
  editorWrap.style.flexDirection = 'column'
  body.appendChild(editorWrap)

  const scrollContainer = document.createElement('div')
  scrollContainer.style.minWidth = '0'
  scrollContainer.style.minHeight = '0'
  scrollContainer.style.flex = '1'
  scrollContainer.style.overflow = 'auto'
  editorWrap.appendChild(scrollContainer)

  const editorPaper = document.createElement('div')
  editorPaper.style.minHeight = '100%'
  editorPaper.style.background = 'var(--paper-bg)'
  scrollContainer.appendChild(editorPaper)

  const drawer = document.createElement('aside')
  drawer.style.minWidth = '0'
  drawer.style.minHeight = '0'
  drawer.style.display = 'grid'
  drawer.style.gridTemplateRows = '48px 40% 60%'
  drawer.style.borderLeft = '1px solid var(--border-color)'
  drawer.style.background = 'var(--surface-bg)'
  body.appendChild(drawer)

  const drawerTop = document.createElement('div')
  drawerTop.style.display = 'flex'
  drawerTop.style.alignItems = 'center'
  drawerTop.style.justifyContent = 'space-between'
  drawerTop.style.gap = '8px'
  drawerTop.style.padding = '8px 10px'
  drawerTop.style.borderBottom = '1px solid var(--border-color)'
  drawerTop.style.boxSizing = 'border-box'

  const title = document.createElement('span')
  title.textContent = '业务抽屉'
  title.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-secondary);'
  drawerTop.appendChild(title)

  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '6px'

  const createBtn = (text: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = text
    btn.style.cssText = `
      height:28px;
      border-radius:8px;
      border:1px solid var(--border-color);
      background:var(--surface-soft);
      color:var(--text-secondary);
      padding:0 8px;
      cursor:pointer;
      font-size:12px;
    `
    btn.onclick = onClick
    return btn
  }

  const toggleComment = createBtn('评论开关', () => {
    editorCore.events.emit('toggleCommentPanel')
  })
  const toggleOutline = createBtn('大纲开关', () => {
    outlineContainer.style.display = outlineContainer.style.display === 'none' ? 'block' : 'none'
  })
  actions.append(toggleComment, toggleOutline)
  drawerTop.appendChild(actions)

  const outlineContainer = document.createElement('div')
  outlineContainer.style.minHeight = '0'
  outlineContainer.style.overflow = 'auto'

  const commentContainer = document.createElement('div')
  commentContainer.style.minHeight = '0'
  commentContainer.style.overflow = 'auto'
  commentContainer.style.borderTop = '1px solid var(--border-color)'

  drawer.append(drawerTop, outlineContainer, commentContainer)

  return {
    toolbarContainer,
    editorContainer: editorPaper,
    scrollContainer,
    overlayContainer: container,
    outlineContainer,
    commentContainer,
  }
}

useSceneEditor('custom-drawer-modules', editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement('div'),
    content: `
      <h2>外部抽屉布局示例</h2>
      <p>本场景演示：编辑区在左，自定义业务抽屉在右，抽屉中同时挂载“插件化大纲 + 插件化评论区”。</p>
      <p>你可以从右上角按钮切换大纲与评论可见性，验证“外部组装布局 + 模块可插拔”。</p>
      <h3>章节 A</h3>
      <p>请选中本段并在评论区添加评论。</p>
      <h3>章节 B</h3>
      <p>点击大纲条目可快速跳转到对应标题。</p>
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
      builder: buildDrawerLayout,
      plugins: {
        outline: createCustomOutlinePlugin({
          title: '自定义大纲（抽屉）',
          description: '由外部插件挂载到右侧抽屉上半区。',
          emptyText: '暂无标题',
        }),
        commentPanel: createCustomCommentPanelPlugin({
          title: '自定义评论区（抽屉）',
          description: '由外部插件挂载到右侧抽屉下半区。',
        }),
      },
    },
  } as any)

  return core
})
</script>

<template>
  <SceneFrame
    title="自定义抽屉布局（可插拔模块）"
    description="完整示例：外部 layout.builder 组装业务抽屉，并挂载自定义大纲与评论插件。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
