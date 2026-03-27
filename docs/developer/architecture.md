# 开发者文档：架构总览

## 核心分层

1. `EditorCore`：编辑器核心能力、命令、扩展、事件总线。
2. `EditorUIRenderer`：布局构建、模块挂载、主题应用、UI 事件桥接。
3. `extensions/*`：评论、选区工具栏、块操作、slash、表格等扩展能力。
4. `ui/*`：工具栏、评论面板、菜单、对话框、基础组件。
5. `styles/*`：主题 token 与组件样式。

## 关键入口

- 编辑能力入口：`packages/editor/src/core/EditorCore.ts`
- UI 入口：`packages/editor/src/ui/EditorUIRenderer.ts`
- 选区工具栏：`packages/editor/src/extensions/SelectionTooltip.ts`
- 文档场景：`apps/playground/src/scenes/pages/*.vue`

## 当前设计原则

1. 布局优先普通代码写法（按场景页面直接写）。
2. 模块能力可按 `layoutSchema.modules` 迁移区域或关闭。
3. 暗黑模式必须依赖主题 token，不允许孤岛硬编码颜色。
4. 每个功能改动必须同步更新调用链与文档（见“文档更新规范”）。
