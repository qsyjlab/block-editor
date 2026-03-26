# 配置说明

## EditorUIRenderer 主题模式

`EditorUIRenderer` 目前支持：

- `theme: "light"`
- `theme: "dark"`
- `theme: "auto"`（跟随系统）

示例：

```ts
new EditorUIRenderer(core, container, {
  toolbarMode: "top",
  theme: "auto",
});
```

## 模块化配置（实验）

已支持 `layoutSchema` 与 `modules` 契约，可在不改业务层代码的前提下控制模块启用与区域参数。

```ts
new EditorUIRenderer(core, container, {
  layoutSchema: {
    regions: {
      comment: { visible: true, width: 320, order: 3 },
      outline: { visible: true, width: 260, order: 2 },
    },
    modules: {
      commentPanel: { enabled: true, region: "comment" },
      tableBubbleMenu: { enabled: true, region: "overlay" },
    },
  },
});
```

## Playground 路由参数

- `room`
- `user`
- `lang`
- `theme`：`light | dark | auto`
