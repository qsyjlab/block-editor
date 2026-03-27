# 开发者文档：代码地图

## 目录速查

- `packages/editor/src/core`
  - `EditorCore.ts`：核心初始化与扩展注入。
- `packages/editor/src/ui`
  - `EditorUIRenderer.ts`：模块挂载、布局、评论面板联动。
  - `Toolbar.ts`：顶部工具栏与 more 溢出逻辑。
  - `CommentPanel.ts`：评论 UI 与线程交互。
  - `components/*`：`BaseButton`、`DropdownMenu`、`Tooltip` 等。
- `packages/editor/src/extensions`
  - `SelectionTooltip.ts`：选区工具栏逻辑。
  - `block-handle.ts`：块手柄菜单。
  - `Comment.ts`：评论 mark 与 store。
- `packages/editor/src/styles`
  - `index.css`：全局 token 与主要样式。
  - `code-block.css`：代码块扩展样式。
- `apps/playground/src/scenes/pages`
  - 场景页面，普通代码组织，不再走集中配置表。

## 排查建议

1. 先看场景页是否正确传入 `uiConfig/theme/layout`。
2. 再看 `EditorUIRenderer` 是否按预期挂载模块。
3. 最后看组件和样式是否覆盖了对应状态。
