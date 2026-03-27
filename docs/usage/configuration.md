# 使用文档：核心配置

## EditorCore

`EditorCore` 负责编辑能力与扩展能力初始化，常用配置：

- `element`：编辑器 DOM。
- `content`：初始内容。
- `i18n`：语言配置（`zh-CN` / `en-US` 或词条对象）。
- `uiConfig`：操作栏配置。
- `collaboration`：协作配置（room/user/ws）。

## EditorUIRenderer

`EditorUIRenderer` 负责 UI 布局、模块挂载与主题：

- `toolbarMode`: `"top" | "inline"`
- `theme`: `"light" | "dark" | "auto"`
- `commentPanelDefaultVisible`: `boolean`
- `layoutBuilder`: 自定义布局构造函数
- `layoutSchema`: 模块区域与可见性配置

示例：

```ts
new EditorUIRenderer(core, container, {
  toolbarMode: "top",
  theme: "dark",
  commentPanelDefaultVisible: true,
});
```

## 主题建议

推荐所有业务样式只使用主题 token，不直接硬编码颜色。  
如果你新增弹层，优先挂到 `overlayContainer`，避免暗黑模式变量失效。

## i18n fallback 约定

工具栏对话框（插入链接/插入图片/版本历史）在未显式传入词条时，统一使用 `en-US` 作为组件级 fallback。  
业务侧只要给 `EditorCore` 传 `i18n: "zh-CN" | "en-US" | Partial<EditorI18n>`，对话框会自动覆盖为业务语言。
