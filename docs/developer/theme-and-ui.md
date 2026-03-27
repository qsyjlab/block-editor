# 开发者文档：主题与 UI 规范

## 主题规则

1. 不新增硬编码色值，统一走 `styles/index.css` 语义 token。
2. 新增弹层组件时，默认挂载到主题根（`overlayContainer` 或 UI root）。
3. 暗黑模式必须校验：默认态、hover、active、disabled、focus。
4. 按钮/标签激活态统一使用品牌 token：`--brand-solid-*` 与 `--brand-soft-*`，避免暗黑模式出现“亮蓝孤岛”。
5. 语义状态色统一：`--success-*`、`--warning-*`、`--danger-*`，禁止在业务样式中直接写 `#22c55e/#f59e0b`。

## 基础组件优先级

新增 UI 时优先复用：

- `BaseButton`
- `BaseInput`
- `BaseTag`
- `QuotePreview`
- `DropdownMenu`
- `Tooltip`
- `PanelCard`

路径：`packages/editor/src/ui/components/*`

## 暗黑模式注意事项（新增）

1. `block-handle` 菜单初始化后要在打开时再次校准挂载点，确保挂到 `overlayContainer`，避免落到 `document.body` 丢失主题上下文。
2. `dropdown` 与 `comment` 的激活态优先复用统一 token，不要再用 `white` 参与混色。

## 样式改动清单（提交前）

1. Light/Dark 视觉是否一致。
2. 图标是否跟随 `currentColor`。
3. hover/active 对比度是否足够。
4. 弹层是否被容器裁切。
