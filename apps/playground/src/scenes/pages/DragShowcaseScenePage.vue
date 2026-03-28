<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

const DRAG_SHOWCASE_CONTENT = `
  <h2>拖拽专项回归场景</h2>
  <p>该场景用于专门验证块级拖拽的落点反馈、排序稳定性、图片块拖拽边界。</p>

  <p id="drag-source-paragraph">拖拽源段落 A：用于验证普通段落拖拽重排。</p>
  <blockquote id="drag-source-quote">
    <p>拖拽引用源：这是一个引用块，拖拽时应出现蓝色落点线。</p>
  </blockquote>
  <pre><code class="language-ts">const drag_showcase_code = "code block drag source"</code></pre>
  <p id="drag-source-image">
    <img src="https://picsum.photos/760/240?random=301" alt="drag-image-source" title="drag-image-source" />
  </p>

  <p id="drag-target-anchor">拖拽目标锚点段落：请将上面的段落、引用、代码块、图片块拖到此段落前后。</p>
  <p>尾部观察段落：拖拽图片后不应额外生成空白段落。</p>
`;

useSceneEditor(
  "drag-showcase",
  editorContainer,
  (container, context) => {
    const core = new EditorCore({
      element: document.createElement("div"),
      content: DRAG_SHOWCASE_CONTENT,
      collaboration: {
        enabled: context.collaborationEnabled,
        roomName: context.room,
        websocketUrl: "wss://demos.yjs.dev",
        user: { name: context.userName, color: context.userColor },
      },
      i18n: context.editorLocale,
      uiConfig: {
        toolbar: { preset: "full" },
        selectionToolbar: { preset: "full" },
      },
    } as any);

    new EditorUIRenderer(core, container, {
      i18n: context.editorLocale,
      theme: context.theme,
      toolbarMode: "top",
      commentPanelDefaultVisible: true,
    } as any);

    return core;
  },
  { defaultCollaborationEnabled: false },
);
</script>

<template>
  <SceneFrame
    title="拖拽专项场景"
    description="覆盖段落/引用/代码块/图片块拖拽反馈与排序稳定性。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
