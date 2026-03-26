# 操作栏配置

操作栏支持 `toolbar` 与 `selectionToolbar` 两套配置，均支持预设、隐藏、重排和按 `id` 覆盖文案/图标/tooltip。

## 基础用法

```ts
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";

const core = new EditorCore({
  element: document.querySelector("#editor")!,
  uiConfig: {
    toolbar: {
      preset: "full",
    },
    selectionToolbar: {
      preset: "basic",
    },
  },
});

new EditorUIRenderer(core, document.querySelector("#app")!, {
  toolbarMode: "top",
});
```

## 常用字段

- `preset`: `full | basic | minimal`
- `hiddenItems`: 按 item id 隐藏
- `itemOrder`: 按 id 重排
- `itemOverrides`: 覆盖 `label / tooltip / icon`
- `i18nLabelOverrides`: 覆盖 i18n 文案 key

## 示例：隐藏 + 重排 + 覆盖

```ts
uiConfig: {
  toolbar: {
    preset: "full",
    hiddenItems: ["export-pdf", "insert-image"],
    itemOrder: ["undo", "redo", "heading", "font-size", "bold", "italic"],
    itemOverrides: {
      heading: { label: "段落样式", tooltip: "切换段落/标题" },
    },
  },
}
```
