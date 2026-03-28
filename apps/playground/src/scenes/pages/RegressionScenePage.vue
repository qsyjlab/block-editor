<script setup lang="ts">
import { ref } from "vue";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);

useSceneEditor("regression", editorContainer, (container, context) => {
  const core = new EditorCore({
    element: document.createElement("div"),
    content: `
      <h2>回归验证工作台</h2>
      <p>请选中这一段文本后点击工具栏 <strong>添加评论</strong>，验证评论侧栏是否自动展开并预填引用。</p>
      <p>这是一个内部锚点链接：<a href="#be-regression-anchor">跳转到锚点块</a>，请验证点击与悬浮预览。</p>
      <h3 id="be-regression-anchor">锚点块（用于链接跳转）</h3>
      <p>在这里继续测试行内评论点击是否可定位到评论线程。</p>
      <table>
        <tr><th>姓名</th><th>部门</th><th>状态</th></tr>
        <tr><td>张三</td><td>研发</td><td>进行中</td></tr>
        <tr><td>李四</td><td>设计</td><td>待评审</td></tr>
      </table>
      <pre><code class="language-ts">type RegressionResult = { ok: boolean };

function buildRegressionResult(): RegressionResult {
  return { ok: true };
}</code></pre>
      <p id="be-regression-image-block"><img src="https://picsum.photos/720/240?random=98" alt="regression-image" title="regression-image" /></p>
      <p id="be-code-after-paragraph">代码块后续段落：用于验证粘贴不会跳出代码块。</p>
      <blockquote>请把光标移入表格，验证表格工具栏文案和操作是否正确。</blockquote>
      <p>请将鼠标移到左侧块手柄，验证菜单项样式和暗黑模式下拉是否一致。</p>
    `,
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
});
</script>

<template>
  <SceneFrame
    title="回归验证场景"
    description="集中验证评论、链接、表格工具栏、代码块复制粘贴、block handle、selection tooltip 与暗黑弹层一致性。"
  >
    <div ref="editorContainer" style="height: 100%" />
  </SceneFrame>
</template>
