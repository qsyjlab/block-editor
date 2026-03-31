<script setup lang="ts">
import { computed, ref } from 'vue'
import { EditorCore, EditorUIRenderer, type ShortcutScope } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'

interface ShortcutViewItem {
  id: string
  scope: ShortcutScope
  source: string
  combo: string
}

const editorContainer = ref<HTMLElement | null>(null)
const shortcutItems = ref<ShortcutViewItem[]>([])
const activeScope = ref<'all' | ShortcutScope>('all')

const SCOPE_LABEL: Record<'all' | ShortcutScope, string> = {
  all: '全部',
  global: '全局',
  editor: '编辑区',
  selection: '选区',
  table: '表格',
  comment: '评论',
  modal: '弹层',
}

const filterScopes = computed(() => {
  const scopes = Array.from(new Set(shortcutItems.value.map((item) => item.scope)))
  return ['all', ...scopes] as Array<'all' | ShortcutScope>
})

const filteredItems = computed(() => {
  const sorted = [...shortcutItems.value].sort((a, b) => {
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope)
    return a.id.localeCompare(b.id)
  })
  if (activeScope.value === 'all') return sorted
  return sorted.filter((item) => item.scope === activeScope.value)
})

const SHORTCUT_CONTENT = `
  <h1>快捷键演示页</h1>
  <p>请在正文尝试输入、选区、表格与评论操作，验证按钮与快捷键行为一致。</p>
  <h2>文本快捷键</h2>
  <p>选中这段文本后尝试 <code>Cmd/Ctrl+B</code>、<code>Cmd/Ctrl+I</code>、<code>Cmd/Ctrl+U</code>。</p>
  <h2>查找替换</h2>
  <p>按 <code>Cmd/Ctrl+F</code> 打开查找，按 <code>Cmd/Ctrl+H</code> 打开替换。</p>
  <h2>多选块</h2>
  <p>在块 handle 区框选多个块后，尝试 <code>Backspace/Delete</code> 与 <code>Alt+↑/↓</code>。</p>
  <blockquote>评论示例：选中文本后按 <code>Alt+Cmd/Ctrl+M</code> 打开评论面板。</blockquote>
  <table>
    <tr><th>模块</th><th>负责人</th><th>状态</th></tr>
    <tr><td>Shortcut</td><td>UI</td><td>In Progress</td></tr>
    <tr><td>History</td><td>Core</td><td>Review</td></tr>
  </table>
`

useSceneEditor(
  'shortcuts',
  editorContainer,
  (container, context) => {
    const core = new EditorCore({
      element: document.createElement('div'),
      content: SHORTCUT_CONTENT,
      collaboration: {
        enabled: context.collaborationEnabled,
        roomName: context.room,
        websocketUrl: 'wss://demos.yjs.dev',
        user: { name: context.userName, color: context.userColor },
      },
      i18n: context.editorLocale,
      uiConfig: {
        toolbar: { preset: 'full' },
        selectionToolbar: { preset: 'full' },
      },
    } as any)

    new EditorUIRenderer(core, container, {
      i18n: context.editorLocale,
      theme: context.theme,
      toolbarMode: 'top',
      commentPanelDefaultVisible: true,
    } as any)

    shortcutItems.value = core.shortcuts.listShortcuts().map((item) => ({
      id: item.id,
      scope: item.scope,
      source: item.source,
      combo: core.shortcuts.formatCombo(item),
    }))

    return core
  },
  { defaultCollaborationEnabled: false },
)
</script>

<template>
  <SceneFrame
    title="快捷键总览"
    description="统一快捷键注册中心导出，按作用域筛选并可直接在右侧编辑区回放。"
  >
    <div class="shortcut-scene">
      <aside class="shortcut-panel">
        <div class="shortcut-panel__header">
          <h3>快捷键清单</h3>
          <span>{{ filteredItems.length }} 项</span>
        </div>
        <div class="shortcut-scope-filter">
          <button
            v-for="scope in filterScopes"
            :key="scope"
            type="button"
            class="shortcut-chip"
            :class="{ 'shortcut-chip--active': activeScope === scope }"
            @click="activeScope = scope"
          >
            {{ SCOPE_LABEL[scope] || scope }}
          </button>
        </div>
        <div class="shortcut-list">
          <div v-for="item in filteredItems" :key="item.id" class="shortcut-row">
            <div class="shortcut-row__main">
              <p class="shortcut-id">{{ item.id }}</p>
              <p class="shortcut-source">{{ item.source }} · {{ SCOPE_LABEL[item.scope] }}</p>
            </div>
            <kbd>{{ item.combo }}</kbd>
          </div>
        </div>
      </aside>
      <div ref="editorContainer" class="shortcut-editor" />
    </div>
  </SceneFrame>
</template>

<style scoped>
.shortcut-scene {
  height: 100%;
  display: grid;
  grid-template-columns: 340px 1fr;
  min-height: 0;
}

.shortcut-panel {
  border-right: 1px solid var(--pg-border);
  background: var(--pg-surface);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.shortcut-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shortcut-panel__header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--pg-text);
}

.shortcut-panel__header span {
  font-size: 12px;
  color: var(--pg-text-muted);
}

.shortcut-scope-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shortcut-chip {
  border: 1px solid var(--pg-border);
  background: var(--pg-surface-soft);
  color: var(--pg-text-muted);
  border-radius: 999px;
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}

.shortcut-chip--active {
  border-color: var(--primary-color, #4f7cff);
  color: var(--primary-color, #4f7cff);
  background: color-mix(in srgb, var(--primary-color, #4f7cff) 12%, var(--pg-surface));
}

.shortcut-list {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shortcut-row {
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: var(--pg-surface-soft);
}

.shortcut-row__main {
  min-width: 0;
}

.shortcut-id {
  margin: 0;
  font-size: 12px;
  color: var(--pg-text);
  font-weight: 600;
  word-break: break-all;
}

.shortcut-source {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--pg-text-muted);
}

kbd {
  font-family:
    'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  border: 1px solid var(--pg-border);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--pg-text);
  background: var(--pg-surface);
  white-space: nowrap;
}

.shortcut-editor {
  min-width: 0;
  min-height: 0;
}
</style>
