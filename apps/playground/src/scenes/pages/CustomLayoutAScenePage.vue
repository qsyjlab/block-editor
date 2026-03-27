<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import {
  SELECTION_COMPACT_ITEMS,
  buildLayoutA,
  buildSceneIntroContent,
} from "../shared";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

useSceneEditor("custom-layout-a", editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement("div"),
    content: buildSceneIntroContent("自定义布局 A（评论左侧）"),
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
        hiddenCommands: ["toggleTaskList", "toggleOrderedList"],
      },
      selectionToolbar: { items: SELECTION_COMPACT_ITEMS },
    },
  } as any);

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    toolbarMode: "top",
    layoutBuilder: buildLayoutA,
    commentPanelDefaultVisible: true,
  } as any);

  return core;
});
</script>

<template>
  <SceneFrame
    title="自定义布局 A（评论左侧）"
    description="评论区在左、编辑区在中、大纲在右，顶部工具栏保留。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
