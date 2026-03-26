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

## Playground 路由参数

- `room`
- `user`
- `lang`
- `theme`：`light | dark | auto`
