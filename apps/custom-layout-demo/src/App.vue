<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import {
  EditorCore,
  EditorUIRenderer,
  type EditorUILayoutSlots,
} from "@block-editor/editor";

const editorContainer = ref<HTMLElement | null>(null);
let editor: EditorCore | null = null;

const params = new URLSearchParams(window.location.search);
const room = params.get("room") || "block-editor-custom-layout-room";
const userName =
  params.get("user") || `用户-${Math.random().toString(36).slice(2, 6)}`;
const userColor = `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`;
const locale = (
  params.get("lang") ||
  navigator.language ||
  "zh-CN"
).toLowerCase();
const editorLocale = locale.startsWith("en") ? "en-US" : "zh-CN";
const rawTheme = (params.get("theme") || "auto").toLowerCase();
const editorTheme =
  rawTheme === "dark" || rawTheme === "light" || rawTheme === "auto"
    ? rawTheme
    : "auto";

function createCustomLayout(
  container: HTMLElement,
  core: EditorCore,
): EditorUILayoutSlots {
  container.innerHTML = "";
  container.className = "custom-layout-root";

  const workspace = document.createElement("div");
  workspace.className = "custom-layout-workspace";
  container.appendChild(workspace);

  const leftSidebar = document.createElement("aside");
  leftSidebar.className = "custom-sidebar custom-sidebar-left";
  workspace.appendChild(leftSidebar);

  const leftTitle = document.createElement("h3");
  leftTitle.textContent = "Outline + Custom Blocks";
  leftSidebar.appendChild(leftTitle);

  const customBlock = document.createElement("section");
  customBlock.className = "custom-block-card";
  customBlock.innerHTML = `
    <div class="custom-block-card__title">自定义区块</div>
    <div class="custom-block-card__desc">示例：将区块操作集成在大纲侧栏。</div>
  `;

  const actionRow = document.createElement("div");
  actionRow.className = "custom-block-actions";

  const toggleCommentBtn = document.createElement("button");
  toggleCommentBtn.textContent = "切换评论区";
  toggleCommentBtn.onclick = () => core.events.emit("toggleCommentPanel");

  const insertCalloutBtn = document.createElement("button");
  insertCalloutBtn.textContent = "插入 Callout";
  insertCalloutBtn.onclick = () =>
    core.editor.chain().focus().insertCallout("info").run();

  actionRow.appendChild(toggleCommentBtn);
  actionRow.appendChild(insertCalloutBtn);
  customBlock.appendChild(actionRow);
  leftSidebar.appendChild(customBlock);

  const outlineMount = document.createElement("div");
  outlineMount.className = "custom-outline-mount";
  leftSidebar.appendChild(outlineMount);

  const center = document.createElement("main");
  center.className = "custom-editor-main";
  workspace.appendChild(center);

  const scrollArea = document.createElement("div");
  scrollArea.className = "editor-scroll-area custom-scroll-area";
  center.appendChild(scrollArea);

  const editorPaper = document.createElement("div");
  editorPaper.className = "editor-container custom-editor-paper";
  scrollArea.appendChild(editorPaper);

  const rightSidebar = document.createElement("aside");
  rightSidebar.className = "custom-sidebar custom-sidebar-right";
  workspace.appendChild(rightSidebar);

  const rightTitle = document.createElement("h3");
  rightTitle.textContent = "Comments Hub";
  rightSidebar.appendChild(rightTitle);

  const commentMount = document.createElement("div");
  commentMount.className = "custom-comment-mount";
  rightSidebar.appendChild(commentMount);

  return {
    toolbarContainer: null,
    editorContainer: editorPaper,
    scrollContainer: scrollArea,
    overlayContainer: container,
    outlineContainer: outlineMount,
    commentContainer: commentMount,
  };
}

onMounted(() => {
  if (!editorContainer.value) return;

  const core = new EditorCore({
    element: document.createElement("div"),
    content:
      "<p>Custom layout demo：无顶部 toolbar，使用行内模式。选中文本后会出现完整工具栏。</p><p>左侧集成了大纲与自定义区块，右侧集成评论区。</p>",
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

  new EditorUIRenderer(core, editorContainer.value, {
    toolbarMode: "inline",
    commentPanelDefaultVisible: true,
    i18n: editorLocale,
    theme: editorTheme,
    layoutBuilder: ({
      container,
      editorCore,
    }: {
      container: HTMLElement;
      editorCore: EditorCore;
    }) => createCustomLayout(container, editorCore),
  } as any);

  editor = core;
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
.app-container {
  width: 100vw;
  height: 100vh;
}

.custom-layout-root {
  width: 100%;
  height: 100%;
  background: #f5f7fb;
}

.custom-layout-workspace {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 0;
  width: 100%;
  height: 100%;
}

.custom-sidebar {
  background: #fff;
  border-right: 1px solid #eceff4;
  overflow: hidden;
  padding: 14px;
  box-sizing: border-box;
}

.custom-sidebar-right {
  border-right: none;
  border-left: 1px solid #eceff4;
}

.custom-sidebar h3 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

.custom-block-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 12px;
  background: #fafcff;
}

.custom-block-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.custom-block-card__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.custom-block-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.custom-block-actions button {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.custom-block-actions button:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}

.custom-outline-mount,
.custom-comment-mount {
  height: calc(100% - 84px);
  overflow: hidden;
}

.custom-editor-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.custom-scroll-area {
  padding: 20px;
}

.custom-editor-paper {
  min-height: calc(100vh - 40px);
}

body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    sans-serif;
}
</style>
