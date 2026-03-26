<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import { SCENE_CONFIGS } from "./config";
import { SCENE_KEYS, type SceneKey } from "../router";

const route = useRoute();
const editorContainer = ref<HTMLElement | null>(null);
let editor: EditorCore | null = null;

const sceneKey = computed<SceneKey>(() => {
  const raw = String(route.params.scene || "default");
  return (SCENE_KEYS as readonly string[]).includes(raw)
    ? (raw as SceneKey)
    : "default";
});

const scene = computed(() => SCENE_CONFIGS[sceneKey.value]);

function buildEditorContent(title: string) {
  return `
    <h2>${title}</h2>
    <p>这是 Playground 场景页。你可以通过左侧导航快速切换不同布局和操作栏模式。</p>
    <p>试试以下交互：选中文本、插入评论、打开表格工具栏、点击块操作菜单。</p>
    <blockquote>场景切换不会改变你的 room/user/lang 查询参数。</blockquote>
  `;
}

function createEditor() {
  if (!editorContainer.value) return;
  editorContainer.value.innerHTML = "";

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
  const rawTheme = (params.get("theme") || "light").toLowerCase();
  const theme = rawTheme === "dark" || rawTheme === "auto" ? rawTheme : "light";

  const core = new EditorCore({
    element: document.createElement("div"),
    content: buildEditorContent(scene.value.title),
    collaboration: {
      enabled: true,
      roomName: `${room}-${sceneKey.value}`,
      websocketUrl: "wss://demos.yjs.dev",
      user: { name: userName, color: userColor },
    },
    i18n: editorLocale,
    uiConfig: scene.value.coreUIConfig,
  } as any);

  new EditorUIRenderer(core, editorContainer.value, {
    i18n: editorLocale,
    theme,
    ...scene.value.uiOptions,
  } as any);

  editor = core;
}

function destroyEditor() {
  editor?.destroy();
  editor = null;
  if (editorContainer.value) {
    editorContainer.value.innerHTML = "";
  }
}

onMounted(createEditor);
onBeforeUnmount(destroyEditor);

watch(
  () => [sceneKey.value, route.query.theme],
  () => {
    destroyEditor();
    createEditor();
  },
);
</script>

<template>
  <div class="scene-page">
    <div class="scene-header">
      <h2>{{ scene.title }}</h2>
      <p>{{ scene.description }}</p>
    </div>
    <div ref="editorContainer" class="scene-editor" />
  </div>
</template>

<style scoped>
.scene-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.scene-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--pg-border);
  background: var(--pg-surface);
  flex-shrink: 0;
}

.scene-header h2 {
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  color: var(--pg-text);
}

.scene-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pg-text-muted);
}

.scene-editor {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--pg-bg);
}

.scene-editor :deep(.layout) {
  height: 100% !important;
  min-height: 0;
}

.scene-editor :deep(.main-content) {
  min-width: 0;
  min-height: 0;
}

.scene-editor :deep(.editor-scroll-area) {
  min-width: 0;
  min-height: 0;
  padding: 12px;
}

.scene-editor :deep(.editor-container) {
  border-radius: 6px;
  min-height: 100%;
}

.scene-editor :deep(.toolbar) {
  padding: 6px 10px;
}
</style>
