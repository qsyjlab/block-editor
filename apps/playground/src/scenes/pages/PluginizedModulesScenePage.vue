<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'
import { createCustomCommentPanelPlugin } from '../plugins/createCustomCommentPanelPlugin'
import { createCustomOutlinePlugin } from '../plugins/createCustomOutlinePlugin'

const editorContainer = ref<HTMLElement | null>(null)

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
        outline: createCustomOutlinePlugin({
          title: '插件化大纲',
          description: '由外部插件渲染（非内置 Outline），点击条目可跳转标题。',
          emptyText: '暂无标题',
        }),
        commentPanel: createCustomCommentPanelPlugin({
          title: '插件化评论面板',
          description: '示例：外部插件控制评论创建与线程管理，内核仅提供数据与事件。',
        }),
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
