# 迁移与接入

本文用于 Phase H4：给已有项目迁移到当前“主题化 + 组件化 + 可配置操作栏”版本。

## 1. 最小接入

1. 初始化 `EditorCore` 并传入 `i18n`、`uiConfig`
2. 使用 `EditorUIRenderer` 挂载 UI
3. playground 场景验证 `theme/lang/toolbar` 组合

```ts
const core = new EditorCore({
  element: el,
  i18n: "zh-CN",
  uiConfig: {
    toolbar: { preset: "full" },
    selectionToolbar: { preset: "basic" },
  },
});

new EditorUIRenderer(core, root, {
  theme: "auto",
  toolbarMode: "top",
  commentPanelDefaultVisible: false,
});
```

## 2. 从旧样式迁移

1. 清理硬编码颜色，改为主题 token。
2. 下拉/弹层挂载到 `overlayContainer`（避免暗黑下白底弹层）。
3. 新增输入/按钮优先复用 `BaseInput`、`BaseButton`、`BaseTag`、`DropdownMenu`。

## 3. 常见问题

### 暗黑下拉仍是白底

- 检查弹层是否挂在 `document.body`
- 改挂到 `data-be-overlay-container` 所在容器

### 文案不跟随语言切换

- 检查是否走 `EditorCore.i18n`
- 避免组件内部硬编码文本，改走 i18n 注入
