# 使用文档：布局与模块

## 1. layoutBuilder（普通代码方式）

适合你现在的诉求：每个场景直接写 Vue 页面，不走集中配置表。

```ts
new EditorUIRenderer(core, root, {
  layoutBuilder: ({ container }) => {
    const toolbar = document.createElement("div");
    const main = document.createElement("div");
    const editor = document.createElement("div");
    const outline = document.createElement("aside");
    const comment = document.createElement("aside");

    main.style.display = "grid";
    main.style.gridTemplateColumns = "260px 1fr 320px";
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

## 2. layoutSchema（模块区域控制）

适合做“同一页面多种可切换布局”：

```ts
new EditorUIRenderer(core, root, {
  layoutSchema: {
    regions: {
      outline: { visible: true, width: 260, order: 2 },
      comment: { visible: true, width: 320, order: 3 },
    },
    modules: {
      selectionToolbar: { enabled: true, region: "overlay" },
      commentPanel: { enabled: true, region: "comment" },
      blockHandle: { enabled: true, region: "editor" },
    },
  },
});
```

## 3. 当前已支持模块

- `toolbar`
- `selectionToolbar`
- `outline`
- `commentPanel`
- `blockHandle`
- `tableBubbleMenu`
- `blockMultiSelectBar`

## 4. 注意事项

1. `overlayContainer` 必须在主题根容器内，避免暗黑弹层变白。
2. 若没有 `commentContainer`，评论面板会自动降级为右侧浮层。
3. 自定义布局后，建议用 `regression` 场景跑一次回归清单。
