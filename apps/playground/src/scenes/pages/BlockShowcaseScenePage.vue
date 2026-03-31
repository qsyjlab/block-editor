<script setup lang="ts">
import { ref } from 'vue'
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'
import SceneFrame from '../SceneFrame.vue'
import { useSceneEditor } from '../useSceneEditor'

const editorContainer = ref<HTMLElement | null>(null)

const BLOCK_SHOWCASE_CONTENT = `
  <h2>块类型展示分栏（全覆盖）</h2>
  <p>该场景用于快速浏览各类块能力与默认样式，适合视觉验收与基础交互回归。</p>

  <h3>能力分栏总览</h3>
  <table>
    <tr>
      <th>文本类</th>
      <th>结构类</th>
      <th>富媒体与协作类</th>
    </tr>
    <tr>
      <td>标题、正文、行内格式、缩进</td>
      <td>引用、Callout、代码块、表格、分割线</td>
      <td>链接、图片、评论、大纲、块操作</td>
    </tr>
  </table>

  <h3>1. 标题与正文</h3>
  <h4>这是一个四级标题示例</h4>
  <p>正文支持 <strong>加粗</strong>、<em>斜体</em>、<u>下划线</u>、<s>删除线</s> 与 <code>行内代码</code>。</p>
  <p data-indent="1">这是一级缩进段落，用于测试缩进表现与导入导出兼容。</p>
  <p data-indent="2">这是二级缩进段落，便于观察暗黑模式下层级可读性。</p>

  <h3>2. 列表示例</h3>
  <ul>
    <li>无序列表项 A</li>
    <li>无序列表项 B</li>
    <li>无序列表项 C</li>
  </ul>
  <ol>
    <li>有序列表步骤 1</li>
    <li>有序列表步骤 2</li>
    <li>有序列表步骤 3</li>
  </ol>
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="true"><p>任务列表：已完成项</p></li>
    <li data-type="taskItem" data-checked="false"><p>任务列表：待处理项</p></li>
  </ul>

  <h3>3. 引用与 Callout</h3>
  <blockquote>
    <p>这是引用块示例：用于强调背景信息或会议结论。</p>
  </blockquote>
  <div data-callout-type="info"><p>Info：展示提示性信息与上下文。</p></div>
  <div data-callout-type="success"><p>Success：展示成功结果或通过状态。</p></div>
  <div data-callout-type="warning"><p>Warning：展示潜在风险与注意事项。</p></div>
  <div data-callout-type="danger"><p>Danger：展示阻断风险与错误状态。</p></div>

  <h3>4. 代码块</h3>
  <pre><code class="language-ts">type ReviewResult = { passed: boolean; notes: string[] };

function runReview(): ReviewResult {
  return { passed: true, notes: ["block showcase loaded"] };
}</code></pre>

  <h3>5. 表格</h3>
  <table>
    <tr><th>模块</th><th>状态</th><th>负责人</th><th>备注</th></tr>
    <tr><td>Toolbar</td><td>Done</td><td>UI Team</td><td>支持暗黑主题</td></tr>
    <tr><td>Comment Panel</td><td>Done</td><td>Collab Team</td><td>支持引用跳转</td></tr>
    <tr><td>Block Handle</td><td>Done</td><td>Editor Team</td><td>菜单支持 i18n</td></tr>
  </table>

  <h3>6. 链接</h3>
  <p>
    外部链接：<a href="https://vitejs.dev/" target="_blank">Vite 官方网站</a>；
    内部锚点：<a href="#showcase-anchor">跳转到页面锚点</a>。
  </p>

  <h3>7. 图片</h3>
  <p>以下图片用于验证图片块渲染、尺寸与说明文案：</p>
  <p><img src="https://picsum.photos/960/320" alt="showcase-image" title="showcase-image" /></p>

  <h3 id="showcase-anchor">8. 分割线与结尾锚点</h3>
  <hr />
  <p>到这里为止，已覆盖大部分常用块能力。你可以直接在此场景继续编辑做回归验证。</p>
`

useSceneEditor(
  'block-showcase',
  editorContainer,
  (container, context) => {
    const core = new EditorCore({
      element: document.createElement('div'),
      content: BLOCK_SHOWCASE_CONTENT,
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
    title="块类型展示分栏（全覆盖）"
    description="分栏总览 + 默认示例数据，覆盖常见块类型，便于做样式与交互验收。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
