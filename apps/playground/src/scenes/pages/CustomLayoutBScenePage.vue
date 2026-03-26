<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import {
  SELECTION_COMPACT_ITEMS,
  buildLayoutB,
  buildSceneIntroContent,
} from "../shared";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

useSceneEditor("custom-layout-b", editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement("div"),
    content: buildSceneIntroContent("自定义布局 B（左导轨）"),
    collaboration: {
      enabled: true,
      roomName: context.room,
      websocketUrl: "wss://demos.yjs.dev",
      user: { name: context.userName, color: context.userColor },
    },
    i18n: context.editorLocale,
    uiConfig: {
      toolbar: {
        preset: "minimal",
        itemOrder: ["redo", "undo"],
        labelOverrides: {
          undo: "撤销(左导轨)",
          redo: "重做(左导轨)",
        },
        i18nLabelOverrides: {
          toggleBold: "toolbar.bold",
        },
      },
      selectionToolbar: { items: SELECTION_COMPACT_ITEMS },
    },
  } as any);

  new EditorUIRenderer(core, container, {
    i18n: context.editorLocale,
    theme: context.theme,
    toolbarMode: "top",
    layoutBuilder: buildLayoutB,
    commentPanelDefaultVisible: true,
  } as any);

  return core;
});
</script>

<template>
  <SceneFrame
    title="自定义布局 B（左导轨）"
    description="左侧导轨放工具栏+大纲，中间编辑区，右侧评论区。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
