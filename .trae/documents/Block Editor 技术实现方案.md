# Block Editor 实现方案 (基于 Tiptap)

## 1. 项目架构 (Monorepo)

采用 `pnpm` workspace 管理 Monorepo，结构如下：

```text
block-editor/
├── package.json          # Root configuration
├── pnpm-workspace.yaml   # Workspace definitions
├── packages/
│   └── editor/           # [核心包] 编辑器核心逻辑
│       ├── src/
│       │   ├── extensions/   # 自定义 Tiptap 扩展
│       │   ├── core/         # 编辑器实例封装
│       │   ├── export/       # 导出逻辑 (PDF/DOCX)
│       │   └── index.ts      # 入口
│       └── package.json
└── apps/
    └── playground/       # [演示包] 前端演示应用
        ├── src/          # UI 渲染层 (React/Vue)
        └── package.json
```

### 核心包设计 (`packages/editor`)
*   **技术栈**: TypeScript, @tiptap/core, prosemirror-*
*   **设计原则**: 框架无关 (Framework Agnostic)。核心逻辑不依赖 React/Vue，仅通过 standard DOM APIs 或 Tiptap 的 renderless 机制暴露接口。
*   **职责**:
    *   配置 Editor Schema (节点与标记的定义)。
    *   封装常用 Command (如插入卡片、格式化)。
    *   实现文档导出功能 (PDF/DOCX)。
    *   管理插件系统。

### 演示包设计 (`apps/playground`)
*   **技术栈**: Vite + React (或 Vue，视偏好而定，建议 React 生态更丰富)。
*   **职责**:
    *   提供 UI 界面 (Toolbar, Sidebar, Comment Panel)。
    *   实现 NodeViews (对于复杂的 React 组件渲染到编辑器内)。

## 2. 功能实现方案 (对标语雀/飞书)

### 2.1 基础编辑能力 (Tiptap 扩展)
基于 Tiptap 二次开发，封装为 Block 概念：
*   **Slash Command (/)**: 唤起菜单插入块 (标题、列表、表格、代码块等)。
*   **Floating Menu**: 选中文本后的悬浮菜单 (加粗、高亮、评论)。
*   **Drag & Drop**: 块级拖拽 (类似 Notion/飞书的六点悬浮拖拽柄)。

### 2.2 标注与评论系统 (重点)
语雀/飞书的评论通常是基于“文本选区”的。
*   **实现原理**: 使用 ProseMirror 的 **Marks** (标记) 或 **Decorations** (装饰器)。
*   **数据结构**:
    *   在选中文本上应用 `comment` mark，存储 `commentId`。
    *   `commentId` 对应侧边栏的评论数据对象。
*   **交互**:
    *   点击评论按钮 -> 获取当前 Selection -> 插入 Comment Mark (带唯一 ID)。
    *   侧边栏根据 ID 渲染评论列表。
    *   支持“划线评论”和“全文评论”。

### 2.3 导出功能
*   **DOCX 导出**:
    *   方案: 使用 `docx` 库 + 自定义 Serializer。
    *   流程: Tiptap JSON -> 遍历 Node Tree -> 映射为 `docx` 库的对象 (Paragraph, TextRun, Table) -> 生成 Blob 下载。
*   **PDF 导出**:
    *   方案 A (客户端): 使用浏览器原生 `window.print()` 配合 `@media print` 样式。最简单且还原度高。
    *   方案 B (纯前端生成): `html2canvas` + `jspdf`。适合生成长图或特定格式，但文本不可选中。
    *   推荐: 优先实现 **打印样式优化 (Print CSS)**，用户调用浏览器打印即可存为 PDF。

## 3. 下一步实施计划 (Phase 1)

1.  **初始化环境**: 配置 pnpm workspace, typescript, eslint, prettier。
2.  **搭建 Core**: 安装 `@tiptap/core`, `@tiptap/starter-kit`，封装基础 `Editor` 类。
3.  **搭建 Playground**: 初始化 Vite 项目，引入 Core 包并渲染最简单的编辑器。
4.  **验证**: 确保 Playground 能运行并加载 Core 中的逻辑。

请确认是否按照此方案开始初始化项目？如有偏好的 UI 框架 (React/Vue) 请告知，默认推荐 **React** 以获得更好的 Tiptap 社区支持。