# 模块化布局

`EditorUIRenderer` 支持 `layoutBuilder`，可把工具栏、编辑区、评论区、大纲区放到不同容器。

## 布局插槽

- `toolbarContainer`
- `editorContainer`
- `scrollContainer`
- `overlayContainer`
- `outlineContainer`
- `commentContainer`

## 自定义布局示例

```ts
new EditorUIRenderer(core, root, {
  layoutBuilder: ({ container }) => {
    const toolbar = document.createElement("div");
    const main = document.createElement("div");
    const editor = document.createElement("div");
    const outline = document.createElement("aside");
    const comment = document.createElement("aside");

    main.style.display = "grid";
    main.style.gridTemplateColumns = "220px 1fr 320px";
    main.append(outline, editor, comment);
    container.append(toolbar, main);

    return {
      toolbarContainer: toolbar,
      editorContainer: editor,
      scrollContainer: editor,
      overlayContainer: container,
      outlineContainer: outline,
      commentContainer: comment,
    };
  },
});
```

## 建议

1. `overlayContainer` 尽量放在带主题属性的根容器，避免弹层丢失暗黑变量。
2. `scrollContainer` 与 `editorContainer` 保持一致可减少定位偏差。
3. comment/outline 宽度固定后，主编辑区优先使用自适应宽度。
