<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'
import { createCustomCommentPanelPlugin } from '../plugins/createCustomCommentPanelPlugin'

const editorContainer = ref<HTMLElement | null>(null)

useSceneEditor('custom-comment-panel', editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement('div'),
    content: `
      <h2>自定义评论区完整示例</h2>
      <p>请先选中这一段或下面任意文本，在右侧输入评论内容后点击“添加到选区”。</p>
      <p>创建后可在右侧执行筛选、回复、解决/重开、删除，并可点击“跳转定位”回到正文标记位置。</p>
      <h3>需求背景</h3>
      <p>这里是一段示例文本，用于验证评论引用、线程回复和状态切换。</p>
      <h3>验收清单</h3>
      <ul>
        <li>创建评论后应出现引用与正文内容</li>
        <li>点击跳转应回到正文评论锚点</li>
        <li>解决/重开与回复应立即刷新线程</li>
      </ul>
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
        commentPanel: createCustomCommentPanelPlugin(),
      },
    },
  } as any)

  return core
})
</script>

<template>
  <SceneFrame
    title="自定义评论区（完整功能）"
    description="评论区完全由外部插件实现：选区预填、创建、筛选、回复、解决/重开、删除、跳转定位。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
