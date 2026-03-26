# 颜色硬编码盘点（Phase A2）

更新时间：2026-03-26  
统计命令：`rg -n "#...|rgba(|rgb(" packages/editor/src apps/playground/src --glob '!**/dist/**'`

## 总览

- 命中总数：`345`
- 结论：颜色硬编码主要集中在样式主文件和几个 TS 组件内联样式。

## 高优先级文件（Top）

1. `packages/editor/src/styles/index.css`：118
2. `packages/editor/src/ui/toolbar/dialogs/version-history-dialog.ts`：64
3. `packages/editor/src/ui/CommentPanel.ts`：32
4. `packages/editor/src/styles/code-block.css`：23
5. `packages/editor/src/ui/Outline.ts`：19
6. `packages/editor/src/extensions/Callout.ts`：12
7. `packages/editor/src/ui/toolbar/dialogs/insert-link-dialog.ts`：9
8. `packages/editor/src/ui/toolbar/color-picker/color-picker.ts`：9
9. `packages/editor/src/ui/toolbar/dialogs/insert-image-dialog.ts`：7

## 分层优先级建议

### P0（先改，影响面最大）

- `styles/index.css`
- `styles/code-block.css`
- `ui/CommentPanel.ts`
- `ui/Outline.ts`

目标：
- 先完成主题 Token 收口，保证核心编辑、评论、大纲、表格视觉一致。

### P1（第二批）

- `ui/toolbar/dialogs/version-history-dialog.ts`
- `ui/toolbar/dialogs/insert-link-dialog.ts`
- `ui/toolbar/dialogs/insert-image-dialog.ts`
- `extensions/Callout.ts`

目标：
- 收敛弹窗/高级功能面板颜色，减少“局部风格漂移”。

### P2（第三批）

- `apps/playground/src/**`（示例页）
- 其他零散文件（Exporter、ImageEnhanced、block-handle、input/dialog 组件）

目标：
- 补全示例站与边角组件，保证演示与实际一致。

## 迁移规则（执行时遵循）

1. 禁止新增十六进制颜色到 TS 业务逻辑内。
2. 状态色（danger/success/warning/info）统一走语义变量。
3. 阴影也纳入 Token（`--be-shadow-*`），不再散落写。

