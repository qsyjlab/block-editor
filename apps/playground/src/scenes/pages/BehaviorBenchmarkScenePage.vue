<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";
import SceneFrame from "../SceneFrame.vue";
import { useSceneEditor } from "../useSceneEditor";

const editorContainer = ref<HTMLElement | null>(null);
const route = useRoute();
const router = useRouter();

const BEHAVIOR_CASES = [
  { id: "INP-001", title: "连续输入稳定性", anchorId: "case-inp-001" },
  { id: "INP-002", title: "输入不中断", anchorId: "case-inp-002" },
  { id: "INP-003", title: "基础输入落点", anchorId: "case-inp-003" },
  { id: "INP-004", title: "软换行", anchorId: "case-inp-004" },
  { id: "SEL-001", title: "Shift/鼠标选区一致性", anchorId: "case-sel-001" },
  { id: "SEL-002", title: "选区工具栏可见", anchorId: "case-sel-002" },
  { id: "SEL-003", title: "选区格式化后状态", anchorId: "case-sel-003" },
  { id: "PST-001", title: "代码块粘贴放行", anchorId: "case-pst-001" },
  { id: "PST-002", title: "URL 自动链接", anchorId: "case-pst-002" },
  { id: "PST-003", title: "HTML 清洗", anchorId: "case-pst-003" },
  { id: "PST-004", title: "粘贴落点连续编辑", anchorId: "case-pst-004" },
  { id: "UND-001", title: "输入撤销重做", anchorId: "case-und-001" },
  { id: "UND-002", title: "格式撤销重做", anchorId: "case-und-002" },
  { id: "BLK-001", title: "块手柄可见与菜单", anchorId: "case-blk-001" },
  { id: "BLK-002", title: "块上移下移", anchorId: "case-blk-002" },
  { id: "BLK-003", title: "删除块后焦点", anchorId: "case-blk-003" },
  { id: "CMT-001", title: "添加评论预填引用", anchorId: "case-cmt-001" },
  { id: "CMT-002", title: "评论面板展开", anchorId: "case-cmt-002" },
  { id: "CMT-003", title: "行内评论定位", anchorId: "case-cmt-003" },
  { id: "CMT-004", title: "引用块跳转", anchorId: "case-cmt-004" },
  { id: "LNK-001", title: "链接插入", anchorId: "case-lnk-001" },
  { id: "LNK-002", title: "锚点跳转", anchorId: "case-lnk-002" },
  { id: "TBL-001", title: "表格工具栏", anchorId: "case-tbl-001" },
  { id: "TBL-002", title: "表格行操作", anchorId: "case-tbl-002" },
  { id: "TOB-001", title: "顶部/选区工具栏一致", anchorId: "case-tob-001" },
  { id: "TOB-002", title: "快捷键一致性", anchorId: "case-tob-002" },
] as const;

const CASE_MAP = new Map<string, (typeof BEHAVIOR_CASES)[number]>(
  BEHAVIOR_CASES.map((item) => [item.id, item]),
);

function normalizeCaseId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

const activeCaseId = computed(() => normalizeCaseId(route.query.case));

function openCase(caseId: string) {
  const query = {
    ...route.query,
    case: caseId.toLowerCase(),
    collab: String(route.query.collab ?? "0"),
  };
  router.replace({ path: route.path, query });
}

let focusTimer: number | null = null;

function focusCaseTarget(caseId: string) {
  const item = CASE_MAP.get(caseId);
  const host = editorContainer.value;
  if (!item || !host) return;
  const target = host.querySelector<HTMLElement>(`#${item.anchorId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("scene-case-target--active");
  window.setTimeout(() => {
    target.classList.remove("scene-case-target--active");
  }, 1300);
}

function scheduleFocusCase() {
  if (focusTimer) window.clearTimeout(focusTimer);
  const targetCaseId = activeCaseId.value;
  if (!targetCaseId) return;
  focusTimer = window.setTimeout(() => {
    focusCaseTarget(targetCaseId);
  }, 140);
}

watch(
  () => [route.query.case, route.query.theme, route.query.lang],
  () => {
    scheduleFocusCase();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (focusTimer) window.clearTimeout(focusTimer);
});

const BEHAVIOR_BENCHMARK_CONTENT = `
  <h1>行为基准回放场景（P0）</h1>
  <p>本页面用于对标飞书/语雀核心编辑行为，请按左上角行为入口逐条回放。</p>

  <h2>输入与选区</h2>
  <p id="case-inp-001"><strong>[INP-001]</strong> 连续输入稳定性：请在本段落快速连续输入中英文与数字。</p>
  <p id="case-inp-002"><strong>[INP-002]</strong> 输入不中断：输入中触发工具栏点击后继续输入，不应丢字。</p>
  <p id="case-inp-003"><strong>[INP-003]</strong> 基础输入落点：在句中与句首句尾输入，光标行为应符合预期。</p>
  <p id="case-inp-004"><strong>[INP-004]</strong> 软换行：按 Shift+Enter 插入软换行，保持同一段落。</p>
  <p id="case-sel-001"><strong>[SEL-001]</strong> 选区一致性：请对同一段落做 Shift 扩选与鼠标拖选。</p>
  <p id="case-sel-002"><strong>[SEL-002]</strong> 选中文本后应出现选区工具栏。</p>
  <p id="case-sel-003"><strong>[SEL-003]</strong> 对选区执行加粗/斜体后，选区与光标状态应连续。</p>

  <h2>粘贴与撤销</h2>
  <p id="case-pst-002"><strong>[PST-002]</strong> URL 自动链接：粘贴 https://example.com 到正文文本中。</p>
  <p id="case-pst-003"><strong>[PST-003]</strong> HTML 清洗：从网页复制样式复杂文本粘贴，观察是否去除脏样式。</p>
  <p id="case-pst-004"><strong>[PST-004]</strong> 粘贴落点：在当前段落中粘贴后继续输入，光标不得跳块。</p>
  <p id="case-und-001"><strong>[UND-001]</strong> 输入撤销重做：输入文本后执行 Cmd/Ctrl+Z 与 Shift+Cmd/Ctrl+Z。</p>
  <p id="case-und-002"><strong>[UND-002]</strong> 格式撤销重做：对文本加粗后撤销再重做。</p>

  <h2>块操作</h2>
  <p id="case-blk-001"><strong>[BLK-001]</strong> 将鼠标移到块左侧，验证 block handle 与菜单可用。</p>
  <p id="case-blk-002"><strong>[BLK-002]</strong> 使用 block handle 菜单执行上移/下移，检查顺序可逆。</p>
  <p id="case-blk-003"><strong>[BLK-003]</strong> 删除当前块后应立即可继续输入。</p>
  <ul>
    <li>无序列表示例 A</li>
    <li>无序列表示例 B</li>
  </ul>
  <ol>
    <li>有序步骤 1</li>
    <li>有序步骤 2</li>
  </ol>
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="true"><p>任务项：已完成</p></li>
    <li data-type="taskItem" data-checked="false"><p>任务项：待处理</p></li>
  </ul>

  <h2>评论与链接</h2>
  <p id="case-cmt-001"><strong>[CMT-001]</strong> 请选中这句文本后点击“添加评论”，应预填引用并等待确认保存。</p>
  <p id="case-cmt-002"><strong>[CMT-002]</strong> 评论面板未展开时触发添加评论，应自动展开。</p>
  <p id="case-cmt-003"><strong>[CMT-003]</strong> 行内评论标注点击后应定位到右侧对应线程。</p>
  <p id="case-cmt-004"><strong>[CMT-004]</strong> 评论线程中的引用块应可点击跳转回正文位置。</p>
  <p id="case-lnk-001"><strong>[LNK-001]</strong> 链接插入：选中文本后点击插入链接按钮。</p>
  <p id="case-lnk-002">
    <strong>[LNK-002]</strong> 锚点跳转：<a href="#benchmark-anchor">点击跳到锚点块</a>。
  </p>
  <blockquote>引用块：用于验证引用与选区工具栏、评论引用样式联动。</blockquote>
  <p id="benchmark-anchor">锚点块（benchmark-anchor）</p>

  <h2>表格与工具栏一致性</h2>
  <p id="case-tbl-001"><strong>[TBL-001]</strong> 光标进入表格单元格后，表格工具栏应可见且文案正确。</p>
  <p id="case-tbl-002"><strong>[TBL-002]</strong> 使用行操作菜单新增/删除行验证行为。</p>
  <table>
    <tr><th>模块</th><th>负责人</th><th>状态</th></tr>
    <tr><td>Comment</td><td>Collab</td><td>In Progress</td></tr>
    <tr><td>Toolbar</td><td>UI</td><td>Done</td></tr>
  </table>
  <p id="case-tob-001"><strong>[TOB-001]</strong> 顶部工具栏与选区工具栏执行相同命令应得到一致结果。</p>
  <p id="case-tob-002"><strong>[TOB-002]</strong> Cmd/Ctrl+B、Cmd/Ctrl+I 与按钮行为一致。</p>

  <h2>代码块与富媒体</h2>
  <p id="case-pst-001"><strong>[PST-001]</strong> 在代码块内粘贴内容，应保持代码块上下文，不跳出块外。</p>
  <pre><code class="language-ts">type BenchmarkResult = { passed: boolean; notes: string[] };

function runBenchmark(): BenchmarkResult {
  return { passed: true, notes: ["benchmark scene loaded"] };
}</code></pre>
  <p>图片示例（用于插图相关交互回放）：</p>
  <p><img src="https://picsum.photos/900/280" alt="benchmark-image" title="benchmark-image" /></p>
`;

useSceneEditor(
  "behavior-benchmark",
  editorContainer,
  (container, context) => {
    const core = new EditorCore({
      element: document.createElement("div"),
      content: BEHAVIOR_BENCHMARK_CONTENT,
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

    queueMicrotask(() => {
      scheduleFocusCase();
    });

    return core;
  },
  { defaultCollaborationEnabled: false },
);
</script>

<template>
  <SceneFrame
    title="行为基准场景（P0）"
    description="支持 case/theme/lang/collab/room/user 查询参数；点击入口可定位到对应行为复现点。"
  >
    <div class="benchmark-case-grid">
      <button
        v-for="item in BEHAVIOR_CASES"
        :key="item.id"
        class="benchmark-case-btn"
        :class="{ 'benchmark-case-btn--active': activeCaseId === item.id }"
        type="button"
        @click="openCase(item.id)"
      >
        {{ item.id }}
      </button>
    </div>
    <div ref="editorContainer" style="height: calc(100% - 52px)" />
  </SceneFrame>
</template>

<style scoped>
.benchmark-case-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--pg-border);
  background: var(--pg-surface);
}

.benchmark-case-btn {
  border: 1px solid var(--pg-border);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pg-text-muted);
  background: var(--pg-surface-soft);
  cursor: pointer;
}

.benchmark-case-btn:hover {
  border-color: var(--primary-color, #4f7cff);
  color: var(--pg-text);
}

.benchmark-case-btn--active {
  color: var(--primary-color, #4f7cff);
  border-color: var(--primary-color, #4f7cff);
  background: color-mix(
    in srgb,
    var(--primary-color, #4f7cff) 14%,
    var(--pg-surface)
  );
}

:deep(.scene-case-target--active) {
  animation: scene-case-flash 1.2s ease;
  outline: 2px solid color-mix(in srgb, var(--primary-color, #4f7cff) 70%, white);
  outline-offset: 2px;
  border-radius: 4px;
}

@keyframes scene-case-flash {
  0% {
    background: color-mix(
      in srgb,
      var(--primary-color, #4f7cff) 24%,
      transparent
    );
  }
  100% {
    background: transparent;
  }
}
</style>
