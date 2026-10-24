<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { EditorCore, EditorUIRenderer, DocumentManager, type StoredDocument } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'

const editorContainer = ref<HTMLElement | null>(null)
const docList = ref<StoredDocument[]>([])
const activeId = ref<string | null>(null)

let core: EditorCore | null = null
let manager: DocumentManager | null = null

function refreshList() {
  docList.value = manager ? manager.list() : []
}

function formatDate(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openDoc(id: string) {
  if (!core || !manager) return
  manager.flush()
  manager.attachEditor(core.editor, id)
  activeId.value = id
}

function createDoc() {
  if (!manager) return
  const doc = manager.create(`未命名文档`)
  refreshList()
  openDoc(doc.id)
}

function renameDoc(doc: StoredDocument) {
  if (!manager) return
  const title = window.prompt('重命名文档', doc.title)
  if (title === null) return
  const trimmed = title.trim()
  if (!trimmed) return
  manager.rename(doc.id, trimmed)
  refreshList()
}

function removeDoc(doc: StoredDocument) {
  if (!manager) return
  if (!window.confirm(`删除「${doc.title}」？该操作不可恢复。`)) return
  manager.remove(doc.id)
  refreshList()
  const next = docList.value[0]
  if (next && core) {
    openDoc(next.id)
  } else if (core) {
    activeId.value = null
    core.editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] })
  }
}

let draggingId: string | null = null

function onDragStart(doc: StoredDocument, event: DragEvent) {
  draggingId = doc.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', doc.id)
  }
}

function onDrop(doc: StoredDocument, event: DragEvent) {
  const sourceId = draggingId
  draggingId = null
  if (!manager || !sourceId || sourceId === doc.id) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const before = event.clientY < rect.top + rect.height / 2
  manager.reorder(sourceId, doc.id, before ? 'before' : 'after')
  refreshList()
}

onMounted(() => {
  if (!editorContainer.value) return
  manager = new DocumentManager()

  // 首次进入：没有文档时建一篇引导文档
  if (manager.list().length === 0) {
    manager.create(
      '欢迎使用多文档',
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '多文档管理' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '左侧新建/重命名/删除文档，编辑内容自动保存（localStorage）。' }] },
        ],
      },
    )
  }

  core = new EditorCore({
    element: document.createElement('div'),
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    collaboration: { enabled: false },
  })
  new EditorUIRenderer(core, editorContainer.value, {
    i18n: 'zh-CN',
    theme: 'light',
    layout: { preset: 'editor' },
  } as any)

  refreshList()
  const first = docList.value[0]
  if (first) openDoc(first.id)
})

onBeforeUnmount(() => {
  manager?.flush()
  manager?.destroy()
  core?.destroy()
  if (editorContainer.value) editorContainer.value.innerHTML = ''
  core = null
  manager = null
})
</script>

<template>
  <SceneFrame
    title="多文档管理"
    description="左侧文档树（localStorage 持久化）：新建 / 双击重命名 / 删除；编辑内容防抖自动保存。"
  >
    <div class="docs-layout">
      <aside class="docs-sidebar">
        <div class="docs-sidebar-head">
          <span class="docs-sidebar-title">文档</span>
          <button class="docs-new-btn" type="button" @click="createDoc">＋ 新建</button>
        </div>
        <ul class="docs-list">
          <li
            v-for="doc in docList"
            :key="doc.id"
            class="docs-item"
            :class="{ active: doc.id === activeId }"
            draggable="true"
            @click="openDoc(doc.id)"
            @dblclick="renameDoc(doc)"
            @dragstart="onDragStart(doc, $event)"
            @dragover.prevent
            @drop="onDrop(doc, $event)"
          >
            <div class="docs-item-main">
              <span class="docs-item-title">{{ doc.title }}</span>
              <span class="docs-item-time">{{ formatDate(doc.updatedAt) }}</span>
            </div>
            <button
              class="docs-item-delete"
              type="button"
              title="删除文档"
              @click.stop="removeDoc(doc)"
            >
              ×
            </button>
          </li>
        </ul>
        <p class="docs-tip">双击重命名 · 拖拽排序 · 单击切换</p>
      </aside>
      <div class="docs-editor" ref="editorContainer"></div>
    </div>
  </SceneFrame>
</template>

<style scoped>
.docs-layout {
  display: flex;
  height: 100%;
  min-height: 0;
}

.docs-sidebar {
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid var(--pg-border);
  background: var(--pg-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.docs-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--pg-border);
}

.docs-sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--pg-text);
}

.docs-new-btn {
  border: 1px solid var(--pg-border);
  background: transparent;
  color: var(--pg-text);
  border-radius: 6px;
  font-size: 12px;
  padding: 3px 8px;
  cursor: pointer;
}

.docs-new-btn:hover {
  border-color: var(--pg-primary, #00b96b);
  color: var(--pg-primary, #00b96b);
}

.docs-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  flex: 1;
}

.docs-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--pg-text);
}

.docs-item:hover {
  background: color-mix(in srgb, var(--pg-primary, #00b96b) 8%, transparent);
}

.docs-item.active {
  background: color-mix(in srgb, var(--pg-primary, #00b96b) 12%, transparent);
}

.docs-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docs-item-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-item-time {
  font-size: 11px;
  color: var(--pg-text-muted);
}

.docs-item-delete {
  border: none;
  background: transparent;
  color: var(--pg-text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0;
}

.docs-item:hover .docs-item-delete {
  opacity: 1;
}

.docs-item-delete:hover {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.docs-tip {
  margin: 0;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--pg-text-muted);
  border-top: 1px solid var(--pg-border);
}

.docs-editor {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
</style>
