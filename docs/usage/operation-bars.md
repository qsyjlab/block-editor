# 使用文档：操作栏配置

支持两套操作栏：

- 顶部工具栏 `toolbar`
- 选区工具栏 `selectionToolbar`

## 常用字段

- `preset`: `full | basic | minimal`
- `hiddenCommands`: 按命令隐藏
- `hiddenItems`: 按 item id 隐藏
- `itemOrder`: 按 id 重排
- `itemOverrides`: 覆盖 `label / tooltip / icon`
- `i18nLabelOverrides`: 通过 i18n key 覆盖文案

## 示例

```ts
uiConfig: {
  toolbar: {
    preset: "full",
    hiddenItems: ["insert-image", "export-pdf"],
    itemOrder: ["undo", "redo", "heading", "bold", "italic"],
    itemOverrides: {
      heading: {
        label: "段落样式",
        tooltip: "切换标题与正文",
      },
    },
  },
  selectionToolbar: {
    preset: "basic",
    itemOverrides: {
      addComment: { label: "批注" },
    },
  },
}
```

## 使用建议

1. 页面窄宽场景优先用 `basic`，降低 `more` 溢出复杂度。
2. 演示页建议保留评论入口，方便验证“选区 -> 评论联动”。
3. 只在业务层配 `uiConfig`，避免直接改工具栏组件内部逻辑。
4. 暗黑模式下优先检查三类颜色一致性：工具栏激活按钮、评论区主按钮、下拉激活项（应同属主题主色体系）。
