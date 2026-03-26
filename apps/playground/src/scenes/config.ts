import type {
  EditorUILayoutBuilderParams,
  EditorUIRendererOptions,
} from "@block-editor/editor";
import type { SceneKey } from "../router";

type ToolbarItemTypeLike = any;
type EditorUIConfigLike = any;

export interface SceneConfig {
  key: SceneKey;
  title: string;
  description: string;
  uiOptions: EditorUIRendererOptions;
  coreUIConfig?: EditorUIConfigLike;
  initialContent?: string;
}

const SELECTION_COMPACT_ITEMS: ToolbarItemTypeLike[] = [
  { type: "button", id: "sel-bold", label: "Bold", icon: "bold", command: "toggleBold", activeName: "bold", shortcut: "⌘B" },
  { type: "button", id: "sel-italic", label: "Italic", icon: "italic", command: "toggleItalic", activeName: "italic", shortcut: "⌘I" },
  { type: "button", id: "sel-comment", label: "Comment", icon: "comment", command: "addComment", shortcut: "⌥⌘M" },
  { type: "button", id: "sel-link", label: "Link", icon: "link", command: "setLink", activeName: "link" },
];

function buildMinimalLayout({ container }: EditorUILayoutBuilderParams) {
  container.innerHTML = "";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.width = "100%";
  container.style.minWidth = "0";
  container.style.minHeight = "0";

  const scrollArea = document.createElement("div");
  scrollArea.className = "editor-scroll-area";
  scrollArea.style.flex = "1";
  scrollArea.style.overflow = "auto";
  scrollArea.style.minWidth = "0";
  scrollArea.style.minHeight = "0";
  container.appendChild(scrollArea);

  const editorPaper = document.createElement("div");
  editorPaper.className = "editor-container";
  scrollArea.appendChild(editorPaper);

  return {
    editorContainer: editorPaper,
    scrollContainer: scrollArea,
    overlayContainer: container,
  };
}

function buildLayoutA({ container }: EditorUILayoutBuilderParams) {
  container.innerHTML = "";
  container.classList.add("layout");
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.width = "100%";
  container.style.minWidth = "0";
  container.style.minHeight = "0";

  const toolbarContainer = document.createElement("div");
  container.appendChild(toolbarContainer);

  const workspace = document.createElement("div");
  workspace.style.display = "flex";
  workspace.style.flex = "1";
  workspace.style.width = "100%";
  workspace.style.overflow = "hidden";
  workspace.style.minWidth = "0";
  workspace.style.minHeight = "0";
  container.appendChild(workspace);

  const comment = document.createElement("div");
  comment.style.width = "320px";
  comment.style.flexShrink = "0";
  comment.style.borderRight = "1px solid var(--border-color)";
  workspace.appendChild(comment);

  const main = document.createElement("div");
  main.className = "main-content";
  main.style.minWidth = "0";
  main.style.minHeight = "0";
  workspace.appendChild(main);

  const scrollArea = document.createElement("div");
  scrollArea.className = "editor-scroll-area";
  scrollArea.style.minWidth = "0";
  scrollArea.style.minHeight = "0";
  main.appendChild(scrollArea);

  const editorPaper = document.createElement("div");
  editorPaper.className = "editor-container";
  scrollArea.appendChild(editorPaper);

  const outline = document.createElement("div");
  outline.className = "outline-sidebar";
  outline.style.width = "260px";
  outline.style.padding = "16px 14px";
  outline.style.borderLeft = "1px solid var(--border-color)";
  outline.style.backgroundColor = "var(--paper-bg)";
  workspace.appendChild(outline);

  return {
    toolbarContainer,
    editorContainer: editorPaper,
    scrollContainer: scrollArea,
    overlayContainer: container,
    outlineContainer: outline,
    commentContainer: comment,
  };
}

function buildLayoutB({ container }: EditorUILayoutBuilderParams) {
  container.innerHTML = "";
  container.style.display = "flex";
  container.style.height = "100%";
  container.style.width = "100%";
  container.style.minWidth = "0";
  container.style.minHeight = "0";

  const leftRail = document.createElement("div");
  leftRail.style.width = "260px";
  leftRail.style.minWidth = "260px";
  leftRail.style.borderRight = "1px solid var(--border-color)";
  leftRail.style.background = "var(--paper-bg)";
  leftRail.style.padding = "12px";
  leftRail.style.boxSizing = "border-box";
  leftRail.style.overflow = "hidden";
  leftRail.style.display = "flex";
  leftRail.style.flexDirection = "column";
  container.appendChild(leftRail);

  const toolbarContainer = document.createElement("div");
  leftRail.appendChild(toolbarContainer);

  const outline = document.createElement("div");
  outline.style.marginTop = "12px";
  outline.style.height = "calc(100% - 56px)";
  outline.style.overflow = "auto";
  outline.style.minHeight = "0";
  leftRail.appendChild(outline);

  const main = document.createElement("div");
  main.style.display = "flex";
  main.style.flex = "1";
  main.style.overflow = "hidden";
  main.style.minWidth = "0";
  main.style.minHeight = "0";
  container.appendChild(main);

  const scrollArea = document.createElement("div");
  scrollArea.className = "editor-scroll-area";
  scrollArea.style.flex = "1";
  scrollArea.style.minWidth = "0";
  scrollArea.style.minHeight = "0";
  main.appendChild(scrollArea);

  const editorPaper = document.createElement("div");
  editorPaper.className = "editor-container";
  scrollArea.appendChild(editorPaper);

  const comment = document.createElement("div");
  comment.style.width = "280px";
  comment.style.minWidth = "280px";
  comment.style.flexShrink = "0";
  comment.style.borderLeft = "1px solid var(--border-color)";
  main.appendChild(comment);

  return {
    toolbarContainer,
    editorContainer: editorPaper,
    scrollContainer: scrollArea,
    overlayContainer: container,
    outlineContainer: outline,
    commentContainer: comment,
  };
}

export const SCENE_CONFIGS: Record<SceneKey, SceneConfig> = {
  default: {
    key: "default",
    title: "默认布局（顶部工具栏）",
    description: "标准编辑器布局：顶部工具栏 + 大纲侧栏 + 评论侧栏。",
    uiOptions: {
      toolbarMode: "top",
      commentPanelDefaultVisible: false,
    },
    coreUIConfig: {
      toolbar: {
        preset: "full",
        labelOverrides: {
          insertTable: "插入表格(示例)",
          addComment: "评论面板",
        },
        itemOverrides: {
          insertTable: {
            tooltip: "插入 3x3 表格",
          },
        },
      },
    },
  },
  "inline-toolbar": {
    key: "inline-toolbar",
    title: "行内工具栏模式",
    description: "隐藏顶部工具栏，选中文本后显示行内工具栏。",
    uiOptions: {
      toolbarMode: "inline",
      commentPanelDefaultVisible: false,
    },
    coreUIConfig: {
      toolbar: {
        preset: "full",
        hiddenCommands: ["setHorizontalRule", "insertTable"],
      },
      selectionToolbar: {
        items: SELECTION_COMPACT_ITEMS,
        itemOrder: ["sel-comment", "sel-bold", "sel-italic", "sel-link"],
        labelOverrides: {
          addComment: "批注",
        },
        itemOverrides: {
          "sel-comment": {
            tooltip: "打开评论区并预填选中内容",
            icon: "comment",
          },
        },
      },
    },
  },
  minimal: {
    key: "minimal",
    title: "极简模式",
    description: "仅保留编辑区，适合沉浸式编辑场景。",
    uiOptions: {
      toolbarMode: "inline",
      layoutBuilder: buildMinimalLayout,
      commentPanelDefaultVisible: false,
    },
    coreUIConfig: {
      toolbar: { preset: "minimal" },
      selectionToolbar: {
        items: SELECTION_COMPACT_ITEMS,
        hiddenCommands: ["setLink"],
      },
    },
  },
  "custom-layout-a": {
    key: "custom-layout-a",
    title: "自定义布局 A（评论左侧）",
    description: "评论区在左、编辑区在中、大纲在右，顶部工具栏保留。",
    uiOptions: {
      toolbarMode: "top",
      layoutBuilder: buildLayoutA,
      commentPanelDefaultVisible: true,
    },
    coreUIConfig: {
      toolbar: {
        preset: "basic",
        hiddenCommands: ["toggleTaskList", "toggleOrderedList"],
      },
      selectionToolbar: { items: SELECTION_COMPACT_ITEMS },
    },
  },
  "custom-layout-b": {
    key: "custom-layout-b",
    title: "自定义布局 B（左导轨）",
    description: "左侧导轨放工具栏+大纲，中间编辑区，右侧评论区。",
    uiOptions: {
      toolbarMode: "top",
      layoutBuilder: buildLayoutB,
      commentPanelDefaultVisible: true,
    },
    coreUIConfig: {
      toolbar: {
        preset: "minimal",
        itemOrder: ["redo", "undo"],
        labelOverrides: {
          undo: "撤销(左导轨)",
          redo: "重做(左导轨)",
        },
        i18nLabelOverrides: {
          toggleBold: "toolbar.bold",
        },
      },
      selectionToolbar: { items: SELECTION_COMPACT_ITEMS },
    },
  },
  regression: {
    key: "regression",
    title: "回归验证场景",
    description:
      "集中验证评论、链接、表格工具栏、block handle、selection tooltip 与暗黑弹层一致性。",
    uiOptions: {
      toolbarMode: "top",
      commentPanelDefaultVisible: true,
    },
    coreUIConfig: {
      toolbar: { preset: "full" },
      selectionToolbar: { preset: "full" },
    },
    initialContent: `
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
      <blockquote>请把光标移入表格，验证表格工具栏文案和操作是否正确。</blockquote>
      <p>请将鼠标移到左侧块手柄，验证菜单项样式和暗黑模式下拉是否一致。</p>
    `,
  },
};
