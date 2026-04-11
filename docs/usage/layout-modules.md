# 使用文档：布局与模块

## 1. 推荐用法：`layout` 单入口

`layout` 把原来的 `layoutBuilder + layoutSchema + plugins` 收敛到一个入口，适合日常业务。

```ts
new EditorUIRenderer(core, root, {
  layout: {
    preset: 'editor-outline-comment',
    regions: {
      outline: { width: 240 },
      comment: { width: 320 },
    },
    modules: {
      selectionToolbar: { enabled: true, region: 'editor' },
      blockMultiSelectBar: { enabled: true, region: 'toolbar' },
    },
  },
})
```

可用预设：

- `default`
- `minimal`
- `editor-outline`
- `editor-comment`
- `editor-outline-comment`

## 2. 自定义布局（builder）

如果预设不够，直接用 `layout.builder`：

```ts
new EditorUIRenderer(core, root, {
  layout: {
    builder: ({ container }) => {
      const toolbar = document.createElement('div')
      const main = document.createElement('div')
      const editor = document.createElement('div')
      const outline = document.createElement('aside')
      const comment = document.createElement('aside')

      main.style.display = 'grid'
      main.style.gridTemplateColumns = '260px 1fr 320px'
      main.append(outline, editor, comment)
      container.append(toolbar, main)

      return {
        toolbarContainer: toolbar,
        editorContainer: editor,
        scrollContainer: editor,
        overlayContainer: container,
        outlineContainer: outline,
        commentContainer: comment,
      }
    },
  },
})
```

## 3. 可插拔模块（评论/大纲）

`layout.plugins` 支持把评论与大纲外置为业务实现：

```ts
new EditorUIRenderer(core, root, {
  layout: {
    preset: 'editor-outline-comment',
    plugins: {
      outline: { mount: mountOutlinePlugin },
      commentPanel: { mount: mountCommentPlugin },
    },
  },
})
```

完整示例见：`/usage/pluginized-modules`

## 4. 当前已支持模块

- `toolbar`
- `selectionToolbar`
- `outline`
- `commentPanel`
- `blockHandle`
- `tableBubbleMenu`
- `blockMultiSelectBar`

## 5. 注意事项

1. `overlayContainer` 必须在主题根容器内，避免暗黑弹层变白。
2. 若没有 `commentContainer`，评论面板会自动降级为右侧浮层。
3. 自定义布局后，建议用 `regression` 场景跑一次回归清单。
4. 如果你希望评论/大纲完全由业务层渲染（抽屉/侧栏/浮层），请使用 `plugins`，参考 `/usage/pluginized-modules`。
