<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import { SELECTION_COMPACT_ITEMS, buildSceneIntroContent } from "../shared";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

useSceneEditor("default", editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement("div"),
    content: buildSceneIntroContent("默认布局（顶部工具栏）"),
    collaboration: {
      enabled: context.collaborationEnabled,
      roomName: context.room,
      websocketUrl: "wss://demos.yjs.dev",
      user: { name: context.userName, color: context.userColor },
    },
    i18n: context.editorLocale,
    uiConfig: {
      toolbar: {
        preset: "basic",
      },
      selectionToolbar: {
        items: SELECTION_COMPACT_ITEMS,
      },
    },
  } as any);

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    toolbarMode: "top",
    commentPanelDefaultVisible: true,
  } as any);

  return core;
});
</script>

<template>
  <SceneFrame
    title="默认布局（基础工具栏）"
    description="标准编辑器布局：基础顶部工具栏 + 大纲侧栏 + 评论侧栏。选中文本可在行内工具栏快速发起评论。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
