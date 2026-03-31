<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { SELECTION_COMPACT_ITEMS, buildSceneIntroContent } from '../shared'
import { useSceneEditor } from '../useSceneEditor'

const editorContainer = ref<HTMLElement | null>(null)

useSceneEditor('inline-toolbar', editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement('div'),
    content: buildSceneIntroContent('行内工具栏模式'),
    collaboration: {
      enabled: context.collaborationEnabled,
      roomName: context.room,
      websocketUrl: 'wss://demos.yjs.dev',
      user: { name: context.userName, color: context.userColor },
    },
    i18n: context.editorLocale,
    uiConfig: {
      toolbar: {
        preset: 'full',
        hiddenCommands: ['setHorizontalRule', 'insertTable'],
      },
      selectionToolbar: {
        items: SELECTION_COMPACT_ITEMS,
        itemOrder: ['sel-comment', 'sel-bold', 'sel-italic', 'sel-link'],
        labelOverrides: {
          addComment: '批注',
        },
        itemOverrides: {
          'sel-comment': {
            tooltip: '打开评论区并预填选中内容',
            icon: 'comment',
          },
        },
      },
    },
  } as any)

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    toolbarMode: 'inline',
    commentPanelDefaultVisible: false,
  } as any)

  return core
})
</script>

<template>
  <SceneFrame title="行内工具栏模式" description="隐藏顶部工具栏，选中文本后显示行内工具栏。">
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
