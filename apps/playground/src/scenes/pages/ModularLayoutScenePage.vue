<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import { SELECTION_COMPACT_ITEMS } from "../shared";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

useSceneEditor("modular-layout", editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement("div"),
    content: `
      <h2>模块化布局示例</h2>
      <p>选中文本后，selection toolbar 应挂在编辑区区域；多选块时工具条会出现在顶部区域。</p>
      <p>这里有一个评论引用测试段落，请选中后点击“添加评论”验证面板联动。</p>
      <table>
        <tr><th>模块</th><th>region</th><th>enabled</th></tr>
        <tr><td>selectionToolbar</td><td>editor</td><td>true</td></tr>
        <tr><td>blockHandle</td><td>editor</td><td>true</td></tr>
        <tr><td>tableBubbleMenu</td><td>editor</td><td>true</td></tr>
        <tr><td>blockMultiSelectBar</td><td>toolbar</td><td>true</td></tr>
      </table>
    `,
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
    layoutSchema: {
      regions: {
        toolbar: { visible: true },
        outline: { width: 240 },
        comment: { width: 320 },
      },
      modules: {
        toolbar: { region: "toolbar", enabled: true },
        selectionToolbar: { region: "editor", enabled: true },
        outline: { region: "outline", enabled: true },
        commentPanel: { region: "comment", enabled: true },
        blockHandle: { region: "editor", enabled: true },
        tableBubbleMenu: { region: "editor", enabled: true },
        blockMultiSelectBar: { region: "toolbar", enabled: true },
      },
    },
  } as any);

  return core;
});
</script>

<template>
  <SceneFrame
    title="模块化布局（Schema）"
    description="演示 layoutSchema.modules.region：顶部显示多选栏、编辑区承载表格气泡菜单、评论区迁移到右侧并可按模块开关控制。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
