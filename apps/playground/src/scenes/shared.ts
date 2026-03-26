import type { EditorUILayoutBuilderParams } from "@block-editor/editor";

export const SELECTION_COMPACT_ITEMS: any[] = [
  {
    type: "button",
    id: "sel-bold",
    label: "Bold",
    icon: "bold",
    command: "toggleBold",
    activeName: "bold",
    shortcut: "⌘B",
  },
  {
    type: "button",
    id: "sel-italic",
    label: "Italic",
    icon: "italic",
    command: "toggleItalic",
    activeName: "italic",
    shortcut: "⌘I",
  },
  {
    type: "button",
    id: "sel-comment",
    label: "Comment",
    icon: "comment",
    command: "addComment",
    shortcut: "⌥⌘M",
  },
  {
    type: "button",
    id: "sel-link",
    label: "Link",
    icon: "link",
    command: "setLink",
    activeName: "link",
  },
];

export function buildSceneIntroContent(title: string) {
  return `
    <h2>${title}</h2>
    <p>这是 Playground 场景页。你可以通过左侧导航快速切换不同布局和操作栏模式。</p>
    <p>试试以下交互：选中文本、插入评论、打开表格工具栏、点击块操作菜单。</p>
    <blockquote>场景切换不会改变你的 room/user/lang 查询参数。</blockquote>
  `;
}

export function buildMinimalLayout({ container }: EditorUILayoutBuilderParams) {
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

export function buildLayoutA({ container }: EditorUILayoutBuilderParams) {
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

export function buildLayoutB({ container }: EditorUILayoutBuilderParams) {
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
