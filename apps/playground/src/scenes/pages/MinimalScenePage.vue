<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { SELECTION_COMPACT_ITEMS, buildSceneIntroContent } from '../shared'
import { useSceneEditor } from '../useSceneEditor'

const editorContainer = ref<HTMLElement | null>(null)

useSceneEditor('minimal', editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement('div'),
    content: buildSceneIntroContent('极简模式'),
    collaboration: {
      enabled: context.collaborationEnabled,
      roomName: context.room,
      websocketUrl: 'wss://demos.yjs.dev',
      user: { name: context.userName, color: context.userColor },
    },
    i18n: context.editorLocale,
    uiConfig: {
      toolbar: { preset: 'minimal' },
      selectionToolbar: {
        items: SELECTION_COMPACT_ITEMS,
        hiddenCommands: ['setLink'],
      },
    },
  } as any)

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    toolbarMode: 'inline',
    commentPanelDefaultVisible: false,
    layout: {
      preset: 'minimal',
    },
  } as any)

  return core
})
</script>

<template>
  <SceneFrame title="极简模式" description="仅保留编辑区，适合沉浸式编辑场景。">
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
