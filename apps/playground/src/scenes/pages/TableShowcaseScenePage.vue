<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'

const editorContainer = ref<HTMLElement | null>(null)

const TABLE_SHOWCASE_CONTENT = `
  <h2>表格专项回归场景</h2>
  <p id="table-showcase-intro">该场景用于验证表格 handle、整表高亮、表格工具栏与块 handle 共存边界。</p>

  <table id="table-showcase-main">
    <tr><th>字段</th><th>值</th><th>说明</th><th>状态</th></tr>
    <tr><td>项目</td><td>Block Editor</td><td>交互编辑器</td><td>进行中</td></tr>
    <tr><td>版本</td><td>0.0.1</td><td>回归专项</td><td>稳定</td></tr>
    <tr><td>负责人</td><td>Editor Team</td><td>可配置布局</td><td>验证中</td></tr>
    <tr><td>备注</td><td>Table Handle</td><td>点击后整表高亮</td><td>已接入</td></tr>
  </table>

  <p id="table-showcase-mid">中间段落：用于验证离开表格区域后块级 handle 的回归展示。</p>

  <table id="table-showcase-secondary">
    <tr><th>模块</th><th>通过率</th><th>结论</th></tr>
    <tr><td>评论</td><td>100%</td><td>通过</td></tr>
    <tr><td>工具栏</td><td>100%</td><td>通过</td></tr>
    <tr><td>拖拽</td><td>进行中</td><td>待收口</td></tr>
  </table>

  <p id="table-showcase-footer">尾段落：用于验证表格 handle 与 block handle 的视觉边界。</p>
`

useSceneEditor(
  'table-showcase',
  editorContainer,
  (container, context) => {
    const core = new EditorCore({
      element: document.createElement('div'),
      content: TABLE_SHOWCASE_CONTENT,
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

    return core
  },
  { defaultCollaborationEnabled: false },
)
</script>

<template>
  <SceneFrame
    title="表格专项场景"
    description="专门回放表格 handle、整表高亮、行列操作与边界交互。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
