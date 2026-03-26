# 文案硬编码盘点（Phase A3）

更新时间：2026-03-26  
统计命令（初筛）：`rg -n "[\\u4e00-\\u9fa5]" packages/editor/src apps/playground/src --glob '!**/dist/**'`

## 总览

- 初筛命中：`405`
- 注意：该统计包含注释、`i18n/zh.ts` 正常词条，不等于“违规硬编码”。

## 需要重点迁移到 i18n 的区域

### 1. 评论面板（高优先级）

文件：`packages/editor/src/ui/CommentPanel.ts`  
现状：标题、按钮、提示、操作文案存在大量直接写死。  
建议：
- 全部改为 `i18n.comments.*` 注入（含 `aria-label`）。

### 2. 块多选栏（高优先级）

文件：
- `packages/editor/src/ui/menus/block-multi-select-bar.ts`
- `packages/editor/src/ui/menus/BlockMultiSelectBar.ts`

现状：操作文案写死中文，且存在重复实现。  
建议：
- 先合并实现，再统一接 i18n。

### 3. block-handle 菜单（高优先级）

文件：`packages/editor/src/extensions/block-handle.ts`  
现状：菜单项文案写死中文。  
建议：
- 新增 `i18n.blockHandle.*` 词条并映射。

### 4. slash command（中优先级）

文件：`packages/editor/src/extensions/SlashCommand.ts`  
现状：标题、描述、关键词直接硬编码。  
建议：
- 支持 i18n 词条 + 本地关键词 fallback。

### 5. 弹窗与辅助组件（中优先级）

文件：
- `ui/toolbar/dialogs/version-history-dialog.ts`
- `ui/toolbar/dialogs/insert-image-dialog.ts`
- `ui/toolbar/dialogs/insert-link-dialog.ts`
- `ui/Outline.ts`

现状：部分中文/英文字符串混用。  
建议：
- 统一通过 i18n 注入，组件层仅接收 props。

## 非问题区域（无需误判）

1. `packages/editor/src/i18n/zh.ts`：属于词条定义，不是硬编码问题。
2. 部分注释文本：不影响运行时 UI，可后续再治理。

## 迁移准则

1. 组件/模块禁止直接写业务文案。
2. 所有可见文案（包含 tooltip、empty text、aria）必须支持 i18n 注入。
3. 新增功能默认中英双词条，不允许只补中文。

