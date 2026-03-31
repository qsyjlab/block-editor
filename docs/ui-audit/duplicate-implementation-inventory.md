# 重复实现盘点（Phase A4）

更新时间：2026-03-26

## 已确认重复

### Block Multi Select Bar 有两份实现

文件：

1. `packages/editor/src/ui/menus/block-multi-select-bar.ts`
2. `packages/editor/src/ui/menus/BlockMultiSelectBar.ts`

现状：

- 两者类名一致：`BlockMultiSelectBar`
- 功能高度重叠：多选块操作栏
- 当前 `EditorUIRenderer` 实际引用的是小写文件名版本：
  - `import { BlockMultiSelectBar } from "./menus/block-multi-select-bar";`

风险：

1. 维护时容易只改一份，造成“看起来改了但实际没生效”。
2. i18n 和样式统一会出现双轨漂移。

处理建议：

1. 保留一份（建议保留当前被引用的 `block-multi-select-bar.ts`）。
2. 将另一份并入并删除。
3. 给该模块增加最小回归用例（显示/隐藏/按钮操作）。

## 可能的结构重叠（非重复文件但重复逻辑）

1. 下拉菜单能力分散在：
   - `ToolbarDropdown`
   - `block-handle` 菜单
   - `SlashCommand` 菜单
2. 按钮样式逻辑分散在多个文件内联样式中。

处理建议：

1. 进入 Phase C 时统一抽 `DropdownMenu` + `BaseButton`，逐步替换。
