<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
// import '@block-editor/editor/src/styles/index.css' // It is aliased in vite.config.ts

const editorContainer = ref<HTMLElement | null>(null);
let editor: EditorCore | null = null;

const params = new URLSearchParams(window.location.search);
const room = params.get("room") || "block-editor-demo-room";
const userName =
  params.get("user") || `用户-${Math.random().toString(36).slice(2, 6)}`;
const userColor = `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`;
const locale = (
  params.get("lang") ||
  navigator.language ||
  "zh-CN"
).toLowerCase();

const editorLocale = locale.startsWith("en") ? "en-US" : "zh-CN";

onMounted(() => {
  if (editorContainer.value) {
    // 1. Initialize Core
    const core = new EditorCore({
      element: document.createElement("div"), // Internal element for Tiptap
      content:
        "<p>Welcome to the <strong>Block Editor</strong> (Vue Version)! Open this page in multiple tabs with same ?room=xxx to test collaboration.</p>",
      collaboration: {
        enabled: true,
        roomName: room,
        websocketUrl: "wss://demos.yjs.dev",
        user: {
          name: userName,
          color: userColor,
        },
      },
      i18n: editorLocale,
    } as any);

    // 2. Initialize UI Renderer
    // This will mount the toolbar, workspace, etc. into our container
    new EditorUIRenderer(core, editorContainer.value, {
      i18n: editorLocale,
    } as any);

    editor = core;
  }
});

onBeforeUnmount(() => {
  editor?.destroy();
  if (editorContainer.value) {
    editorContainer.value.innerHTML = "";
  }
});
</script>

<template>
  <div ref="editorContainer" class="app-container"></div>
</template>

<style>
/* Ensure the container takes full height */
.app-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}

body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}
</style>
