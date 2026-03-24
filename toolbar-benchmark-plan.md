# Block Editor 全链路对标计划（飞书 / 语雀）

> 修正版说明：本计划不再只覆盖 `toolbar`，而是覆盖**整体编辑器能力**（输入、选择、块操作、菜单、导入导出、快捷键、性能与稳定性）。

---

## 0. 进度总览（最后更新：2026-03-24）

### ✅ 已完成

| 功能 | 文件 | 说明 |
|------|------|------|
| 交互状态机（InteractionState） | `extensions/InteractionState.ts` | 定义 idle / text-selection / block-selection / table-editing 四态，EditorCore 已接入 `syncInteractionMode`，SelectionTooltip 已判断 mode 互斥显示 |
| 缩进体系（Indent） | `extensions/Indent.ts` | Tab / Shift-Tab / ⌘] / ⌘[ 快捷键，paragraph / heading 属性式缩进，列表嵌套走 sinkListItem |
| 链接 Dialog 统一 | `ui/toolbar/dialogs/insert-link-dialog.ts` | 去掉 prompt 风格，改为自定义 Dialog，toolbar 与选区浮层均使用同一入口 |
| 清除格式 | `ui/toolbar/defaultToolbarItems.ts` + `SelectionTooltip.ts` | `unsetAllMarks().clearNodes()`，toolbar 快捷键 ⌥⌘0，浮层也有入口 |
| Slash 命令菜单 | `extensions/SlashCommand.ts` | 输入 `/` 触发，支持键盘导航（↑↓ Enter Esc），支持中英文关键词过滤，含正文/标题/列表/引用/代码/分割线/表格/Callout |
| 粘贴策略（SmartPaste） | `extensions/SmartPaste.ts` | 纯 URL 粘贴转链接；富文本粘贴清洗危险样式（保留 color / font-weight / font-size 等），移除 script/style/meta 噪声标签 |
| Callout 信息块 | `extensions/Callout.ts` | info / success / warning / danger 四种类型，toolbar 和 Slash 菜单均有入口 |
| 分割线 | `defaultToolbarItems.ts` + Slash | toolbar 按钮 + Slash `/分割线` |
| 块手柄菜单样式修复 | `extensions/block-handle.ts` | 改为 inline style，不依赖 Tailwind purge，菜单、按钮、分割线均正确渲染 |
| Dialog / Input 组件样式修复 | `ui/components/dialog.ts` + `input.ts` | Tailwind `be-` 类在开发环境正常生效（vite postcss 配置修正） |
| 图片 Dialog 样式修复 | `ui/toolbar/dialogs/insert-image-dialog.ts` | 同上 |
| Blockquote 偏移修复 | `styles/index.css` | 去掉 `padding-left:1rem` 与 `padding:8px 16px` 冲突，统一为单个 padding 声明 |
| 开发环境 Tailwind 修复 | `apps/playground/vite.config.ts` | CSS alias 指向 `tailwind.css`，postcss 显式传入 `packages/editor/tailwind.config.js`，`be-` 前缀类开发环境生效 |
| 基础富文本 | `defaultToolbarItems.ts` | 标题/字体/字号/粗体/斜体/下划线/删除线/颜色/高亮/代码/列表/引用/对齐/行高 |
| 表格 | `EditorCore.ts` + `TableBubbleMenu.ts` | 插入、行列增删、合并拆分、删除，带浮层菜单 |
| 导入导出 | `import/DocxImporter.ts` + `export/Exporter.ts` | DOCX 导入、DOCX 导出、PDF 导出 |
| 状态机完整接入 | `extensions/block-handle.ts` | `toggleMenu/hideMenu` 均调用 `setBlockMenuOpen(true/false)`，`TableBubbleMenu` 检查 `blockMenuOpen` 互斥显示 |
| Callout 类型切换 UI | `extensions/Callout.ts` | NodeView 实现；点击图标弹出 4 类型面板，`setCalloutType` 命令原地更新无需重新插入 |
| EditorCore.exec() 命令分发 | `core/EditorCore.ts` | 通过字符串命令名调用 Tiptap commands，不存在时 warn 并返回 false |
| DocxSerializer 扩展序列化 | `export/DocxSerializer.ts` | 新增 Callout / 分割线 序列化；parseParagraph 支持 Indent 属性；删除遗留 debugger |
| 图片增强（ImageEnhanced） | `extensions/ImageEnhanced.ts` | 替换裸 Image：NodeView 实现对齐（左/居中/右/铺满）、拖拽调整尺寸、caption 说明文字 |
| ToolbarDropdown 互斥关闭 + 动画 | `ui/toolbar/ToolbarDropdown.ts` | DropdownManager 单例，open 时自动关闭其他；展开/收起动画；键盘导航；触摸优化 |
| 性能节流 | `extensions/block-handle.ts` + `ui/menus/TableBubbleMenu.ts` | mousemove throttle 16ms（60fps）；TableBubbleMenu 事件用 rAF 节流 |
| 块多选（BlockMultiSelect） | `extensions/BlockMultiSelect.ts` + `ui/menus/BlockMultiSelectBar.ts` | Shift+点击块手柄多选；批量删除/转换；蓝色 overlay 高亮；顶部浮动操作栏；ESC 取消 |
| DOCX 导入一致性 | `import/DocxImporter.ts` | Callout（6 种 Word 样式名）+ Indent（margin-left 转 data-indent）反序列化；图片 base64 导入 |
| 评论闭环 | `extensions/Comment.ts` + `ui/CommentPanel.ts` | CommentStore 内存线程存储；评论面板：回复、解决、删除、跳转定位；toolbar 添加评论入口（⌥⌘M） |
| 可访问性（ARIA） | 各组件 | Dialog: role=dialog/aria-modal/aria-labelledby；Toolbar: role=toolbar；SlashMenu: role=listbox/option；BlockHandle: role=button/menu/menuitem；ToolbarItem: aria-label/aria-pressed；DropdownItem: aria-selected |

---

---

## 1. 对标目标（整体编辑器，不仅工具栏）

### 1.1 对标维度
1. 文本输入与光标行为
2. 选区行为（跨段、跨块、表格单元格）
3. 块级交互（块手柄、块菜单、多块选择）
4. 菜单系统（顶部工具栏 / 选区浮层 / 表格浮层 / Slash）
5. 粘贴与导入导出（Docx/PDF/图片/链接）
6. 快捷键与命令体系
7. 视觉与动效一致性
8. 稳定性与性能

### 1.2 成果定义
- 达到“日常写作可替代飞书/语雀基础编辑体验”
- 交互不冲突（文本选区态与块多选态明确）
- 功能入口统一（顶部、浮层、快捷键行为一致）

---

## 2. 当前代码结构总览（按能力域）

## 2.1 编辑器核心与扩展装配
- `packages/editor/src/core/EditorCore.ts`
  - Tiptap 实例初始化、extensions 注册、事件总线

## 2.2 菜单与工具栏体系
- `packages/editor/src/ui/Toolbar.ts`
- `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`
- `packages/editor/src/ui/toolbar/ToolbarRegistry.ts`
- `packages/editor/src/ui/toolbar/ToolbarItem.ts`
- `packages/editor/src/ui/toolbar/ToolbarDropdown.ts`
- `packages/editor/src/ui/toolbar/color-picker/*`

## 2.3 选区与上下文菜单
- `packages/editor/src/extensions/SelectionTooltip.ts`（文本选区浮层）
- `packages/editor/src/ui/menus/TableBubbleMenu.ts`（表格浮层）
- `packages/editor/src/ui/menus/tableMenuItems.ts`

## 2.4 块级操作
- `packages/editor/src/extensions/block-handle.ts`

## 2.5 文档结构与辅助 UI
- `packages/editor/src/ui/Outline.ts`
- `packages/editor/src/ui/EditorUIRenderer.ts`
- `packages/editor/src/styles/index.css`

## 2.6 导入导出
- `packages/editor/src/import/DocxImporter.ts`
- `packages/editor/src/export/Exporter.ts`
- `packages/editor/src/export/DocxSerializer.ts`

## 2.7 现有扩展能力
- `packages/editor/src/extensions/Comment.ts`
- `packages/editor/src/extensions/CodeBlock.ts`
- `packages/editor/src/extensions/CurrentLineHighlight.ts`
- `packages/editor/src/extensions/FontSize.ts`
- `packages/editor/src/extensions/LineHeight.ts`

---

## 3. 现状 vs 对标（全链路 Gap）

## 3.1 已具备
- 基础富文本：标题、字体、字号、颜色、高亮、代码、列表、引用
- 表格：插入、行列增删、合并拆分、删除
- 选区浮层：基础文本样式
- 块手柄：删除/复制/转标题/转列表
- 导入导出：DOCX 导入、DOCX/PDF 导出

## 3.2 关键缺口（按优先级）

### P0（必须先做）
1. **状态机缺失**：文本选区态 / 块多选态 / 表格态没有统一互斥管理
2. **块多选能力缺失**：Shift 选块、批量操作不完整
3. **链接交互不统一**：选区中仍有 prompt 风格交互
4. **清除格式、缩进体系缺失或不完整**
5. **快捷键覆盖不足**：入口存在但操作方式未完全对齐

### P1（重要）
6. **Slash 菜单缺失**（虽然有 placeholder 提示）
7. **高级块类型不足**：Callout/分割线/信息块
8. **粘贴策略不足**：URL 卡片化、富文本粘贴清洗策略
9. **图片体验弱**：对齐、尺寸、标题、环绕

### P2（增强）
10. 评论闭环（评论面板、回复、跳转）
11. 大文档性能（渲染/事件节流/菜单重算）
12. 可访问性（键盘可达、ARIA）

---

## 4. 分模块详细计划（含文件落点）

## 模块 A：编辑器交互状态机（最高优先）

### 目标
统一管理以下状态，避免菜单冲突：
- `text-selection`
- `block-selection`
- `table-editing`
- `idle`

### 改动文件
- `packages/editor/src/core/EditorCore.ts`（新增状态事件）
- `packages/editor/src/extensions/SelectionTooltip.ts`
- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/ui/menus/TableBubbleMenu.ts`

### 交付标准
- 任一时刻只出现一种主上下文菜单
- 跨块选区与文本选区行为明确

---

## 模块 B：文本编辑体验对标

### B1. 清除格式 / 缩进体系
- 文件：
  - `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`
  - `packages/editor/src/extensions/SelectionTooltip.ts`
  - `packages/editor/src/core/EditorCore.ts`
  - `packages/editor/src/extensions/*`（必要时新增 `Indent.ts`）

### B2. 链接交互统一
- 文件：
  - `packages/editor/src/extensions/SelectionTooltip.ts`
  - `packages/editor/src/ui/toolbar/dialogs/insert-link-dialog.ts`
  - `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`

### B3. 输入与选区行为校准
- 文件：
  - `packages/editor/src/core/EditorCore.ts`
  - `packages/editor/src/extensions/CurrentLineHighlight.ts`
  - `packages/editor/src/styles/index.css`

### 交付标准
- 顶部工具栏、选区浮层、快捷键三入口一致
- 无 prompt 弹窗风格

---

## 模块 C：块级编辑体验（飞书核心）

### C1. 多块选择与批量操作
- 新增建议：
  - `packages/editor/src/extensions/BlockMultiSelect.ts`
- 改动：
  - `packages/editor/src/extensions/block-handle.ts`
  - `packages/editor/src/core/EditorCore.ts`
  - `packages/editor/src/styles/index.css`

### C2. 块菜单能力增强
- 方向：上移/下移、转类型、复制链接、批量删除
- 文件：
  - `packages/editor/src/extensions/block-handle.ts`

### 交付标准
- `Shift + 点击块手柄` 可连续选块
- 批量操作稳定（删除/转换/复制）

---

## 模块 D：菜单体系统一（Toolbar + Bubble + Slash）

### D1. 顶部与浮层功能对齐
- 文件：
  - `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`
  - `packages/editor/src/extensions/SelectionTooltip.ts`

### D2. Slash 命令菜单
- 新增建议：
  - `packages/editor/src/extensions/SlashCommand.ts`
  - `packages/editor/src/ui/menus/SlashMenu.ts`
- 改动：
  - `packages/editor/src/core/EditorCore.ts`
  - `packages/editor/src/styles/index.css`

### D3. 表格浮层行为微调
- 文件：
  - `packages/editor/src/ui/menus/TableBubbleMenu.ts`
  - `packages/editor/src/ui/menus/tableMenuItems.ts`

### 交付标准
- 三类菜单交互风格、关闭时机、焦点恢复一致

---

## 模块 E：导入导出与粘贴链路

### E1. 粘贴策略
- 目标：保留常见格式，清洗危险样式，URL 卡片化策略可配置
- 文件：
  - `packages/editor/src/core/EditorCore.ts`
  - `packages/editor/src/extensions/*`（新增 PasteRule / LinkCard 扩展）

### E2. 导入导出一致性
- 文件：
  - `packages/editor/src/import/DocxImporter.ts`
  - `packages/editor/src/export/Exporter.ts`
  - `packages/editor/src/export/DocxSerializer.ts`

### 交付标准
- 同一文档导入后可编辑，再导出结构稳定

---

## 模块 F：性能、稳定性、可维护性

### F1. 性能
- 事件节流、防抖：hover/mousemove/selectionUpdate
- 菜单定位更新降频
- 文件：
  - `packages/editor/src/extensions/block-handle.ts`
  - `packages/editor/src/ui/menus/TableBubbleMenu.ts`
  - `packages/editor/src/extensions/SelectionTooltip.ts`

### F2. 稳定性
- 边界：空文档、超长文档、嵌套列表、跨表格选区
- 文件：全链路涉及模块

### F3. 扩展规范
- 统一命令命名、toolbar item schema、扩展 lifecycle
- 文件：
  - `packages/editor/src/ui/toolbar/ToolbarRegistry.ts`
  - `packages/editor/src/core/EditorCore.ts`

---

## 5. 对标矩阵（整体编辑器）

| 维度 | 当前 | 对标目标 | 优先级 | 关键文件 |
|---|---|---|---|---|
| 文本格式能力 | 高 | 高 | 维持 | `defaultToolbarItems.ts` |
| 选区浮层 | 中 | 高 | P0 | `SelectionTooltip.ts` |
| 块多选批量 | 低 | 高 | P0 | `block-handle.ts` + 新扩展 |
| 状态互斥 | 低 | 高 | P0 | `EditorCore.ts` + 各菜单 |
| Slash 菜单 | 低 | 高 | P1 | 新增 `SlashCommand.ts` |
| 表格体验 | 中高 | 高 | P1 | `TableBubbleMenu.ts` |
| 粘贴链路 | 中 | 高 | P1 | `EditorCore.ts` + 新扩展 |
| 导入导出一致性 | 中 | 高 | P1 | `DocxImporter.ts`/`Exporter.ts` |
| 评论闭环 | 低 | 中高 | P2 | `Comment.ts` + UI |
| 性能稳定性 | 中 | 高 | P1/P2 | 全链路 |

---

## 6. 里程碑（建议 4 周）

### 第 1 周（P0）
- 状态机雏形（菜单互斥）
- 清除格式 + 缩进
- 链接交互统一

### 第 2 周（P0）
- 块多选与批量操作
- 选区态/块态冲突收敛

### 第 3 周（P1）
- Slash 菜单
- Callout/分割线
- 表格浮层行为统一

### 第 4 周（P1/P2）
- 粘贴策略与导入导出一致性
- 性能与稳定性收口

---

## 7. 验收标准（整体编辑器）

1. **一致性**：同功能在工具栏/浮层/快捷键行为一致
2. **可预期**：状态切换清晰，不出现双菜单打架
3. **稳定性**：大文档、复杂表格、跨块操作不崩
4. **可扩展**：新增命令可快速挂到三类入口
5. **回归安全**：不破坏现有 DOCX/PDF 能力

---

## 8. 下一步可直接执行（你现在就能开做）

1. 在 `EditorCore.ts` 建立交互状态事件（`modeChange`）
2. 在 `SelectionTooltip.ts` / `block-handle.ts` / `TableBubbleMenu.ts` 接入互斥显示
3. 把链接交互统一为 dialog（去掉 prompt）
4. 补齐清除格式与缩进按钮，并绑定快捷键

> 做完这 4 项，你的项目就从“工具栏可用”升级到“编辑器交互体系可用”。