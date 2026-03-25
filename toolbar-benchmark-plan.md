# Block Editor 全链路对标计划（飞书 / 语雀）

> 修正版说明：本计划不再只覆盖 `toolbar`，而是覆盖**整体编辑器能力**（输入、选择、块操作、菜单、导入导出、快捷键、性能与稳定性）。

---

## 0. 进度总览（最后更新：2026-03-25）

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
| 评论产品化（本地持久化） | `extensions/Comment.ts` + `ui/CommentPanel.ts` | 去掉 prompt，面板内创建评论，支持回复/解决/筛选（全部/未解决/已解决），localStorage 持久化 |
| 块链接与锚点跳转 | `extensions/BlockAnchor.ts` + `extensions/block-handle.ts` + `ui/EditorUIRenderer.ts` | 支持“复制块链接”、hash 定位、同页链接点击跳转 |
| 版本历史（最小闭环） | `core/VersionHistory.ts` + `ui/toolbar/dialogs/version-history-dialog.ts` | 自动快照 + 手动快照 + 本地回滚入口 |
| 协作一期（多人+在线光标） | `core/EditorCore.ts` + `styles/index.css` + `apps/playground/src/App.vue` | Yjs + websocket provider，在线光标显示，playground 支持 room 联调 |
| Markdown 导入导出 | `import/MarkdownImporter.ts` + `export/Exporter.ts` | 新增 md 导入导出，兼容 callout；并补齐任务列表与缩进标记的导入还原 |
| 可配置布局渲染（LayoutBuilder） | `ui/EditorUIRenderer.ts` + `ui/Outline.ts` | 新增 `layoutBuilder`/`toolbarMode`/`scrollContainer` 槽位能力，支持将编辑器嵌入任意页面布局 |
| 行内完整工具栏模式（Inline Toolbar） | `extensions/SelectionTooltip.ts` + `styles/index.css` + `core/EditorCore.ts` | 当无独立 toolbar 时，选区浮层可渲染完整工具栏项（button/dropdown/color），保持与常规 toolbar 同一命令逻辑 |
| 自定义布局示例工程 | `apps/custom-layout-demo/*` | 基于 playground 复制改造：左侧大纲+自定义区块，右侧评论 Hub，中间编辑区，无顶部 toolbar，验证行内模式 |
| 菜单/浮层容器适配 | `extensions/block-handle.ts` + `ui/menus/TableBubbleMenu.ts` + `ui/EditorUIRenderer.ts` | 通过 `data-be-*` 布局槽位标识适配 overlay / editor / scroll 容器，减少对固定 class 结构依赖 |
| 块引用体系（预览+反向链接） | `ui/EditorUIRenderer.ts` + `ui/Outline.ts` | 内链 hover 预览目标块摘要；Outline 增加 Backlinks 区展示当前块反向链接并可跳转 |
| Markdown 深兼容回归矩阵 | `utils/markdownRegression.ts` + `core/EditorCore.ts` + `ui/toolbar/defaultToolbarItems.ts` | 内置回归用例集与执行入口（Toolbar: Markdown 回归），可批量验证导入导出关键能力 |
| 大文档压测与性能基线 | `utils/performanceBenchmark.ts` + `core/EditorCore.ts` + `ui/toolbar/defaultToolbarItems.ts` | 支持生成大文档并输出 setContent/selection/insert 基线指标，结果本地持久化 |

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

## 3.2 当前剩余缺口（按优先级）

### P0（收口）
1. **构建清零**：需持续保证 `pnpm -r build` 通过（不引入新的 TS 错误）
2. **类型生态稳定**：第三方包类型声明与版本需持续对齐（尤其 Markdown / 协作相关依赖）

### P1（产品化）
3. **评论/协作服务端化**：当前评论与版本历史为本地持久化，协作使用公共 demo 服务，缺正式后端与权限体系
4. **版本历史增强**：目前是最小快照回滚，缺对比视图、命名版本、冲突处理
5. **块链接体系增强**：已支持 hash 跳转，待补“块引用预览/反向引用”等知识管理能力

### P2（体验增强）
6. **Markdown 深度兼容**：继续完善图片 caption、复杂嵌套块、更多自定义扩展的双向映射
7. **性能压测与大文档优化**：需要在高节点数场景进行系统性压测与优化

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

## 5. 对齐矩阵（飞书 / 语雀）

| 能力域 | 当前状态 | 对齐结论 | 仍未对齐点 |
|---|---|---|---|
| 基础富文本（标题/列表/引用/表格/快捷键） | 已完成 | **基本对齐** | 表格高级体验（复杂选区与批处理细节）仍有打磨空间 |
| 菜单体系（Toolbar/Selection/Table/Slash） | 已完成 | **基本对齐** | 复杂冲突场景（多菜单并发边缘态）需持续回归 |
| 块级交互（handle/块多选/批量操作/块链接） | 已完成 | **中高对齐** | 块引用预览、反向引用、跨文档块引用未实现 |
| 大纲联动（点击跳转 + active 跟随） | 已完成 | **中高对齐** | 极端长文档/超密标题下阈值仍需压测调参 |
| 评论系统 | 已完成（本地持久化） | **部分对齐** | @提及、通知、权限、服务端线程与审计未实现 |
| 版本历史 | 已完成（本地快照/回滚） | **部分对齐** | diff 对比、命名版本、多人冲突策略未实现 |
| 协作编辑 + 在线光标 | 已完成（Yjs） | **部分对齐** | 生产级协作后端、鉴权、房间隔离、断线恢复策略未实现 |
| 导入导出（DOCX/PDF/Markdown） | 已完成 | **中高对齐** | Markdown 深度兼容（复杂嵌套与自定义扩展映射）未完全对齐 |
| 性能与工程稳定性 | 构建/lint 已清零 | **中等对齐** | 大文档压测体系、分包策略、首屏体积优化待完成 |

---

## 6. 已完成 vs 未完成（仅保留差距项）

### 已完成（本轮确认）
- 交互状态机与多菜单互斥
- 块多选与批量转换/移动
- 块链接复制与锚点跳转
- 评论面板化与本地持久化
- 版本历史（本地快照/回滚）
- 协作一期（多人编辑 + 在线光标）
- Markdown 导入导出（含 callout、任务列表、缩进标记）
- 大纲联动与 handle 定位增强
- 构建与 lint 清零（`pnpm -r build` 通过）

### 仍未对齐（下一阶段）
1. **协作生产化**：当前默认 `wss://demos.yjs.dev`，缺自有服务与鉴权、权限、租户隔离
2. **评论生产化**：当前 `CommentStore` 基于 localStorage，缺服务端线程、@mention、通知、已读/未读
3. **版本历史增强**：当前 `VersionHistory` 基于 localStorage 快照回滚，缺 diff、命名版本、多人冲突可视化
4. **知识网络能力**：当前仅块 hash 跳转，缺块引用预览、反向链接、跨文档引用
5. **Markdown 深兼容**：当前依赖 `[indent:N]` 与 callout 映射，复杂表格/深层嵌套/自定义扩展仍需保真回归
6. **性能专项**：缺大文档压测基线与稳定性指标（输入延迟、菜单定位、滚动跟随）

---

## 7. 差异分析结论（对标飞书 / 语雀）

### 7.1 当前已达到“可日常写作”
- 文本编辑、块操作、菜单体系、导入导出主链路可用
- 交互冲突（多菜单并发）已基本收敛
- 对标结论：**基础编辑体验基本对齐**

### 7.2 仍阻塞“生产替代”的核心差距（按优先级）

| 优先级 | 差距项 | 当前现状 | 对标目标 |
|---|---|---|---|
| P0 | 协作后端与鉴权 | 使用 demo websocket，无权限模型 | 自有协作服务、鉴权、房间隔离、断线恢复 |
| P0 | 评论/版本服务端化 | 评论与版本历史本地存储 | 服务端持久化、可审计、可跨端同步 |
| P1 | 知识网络能力 | 仅支持块链接跳转 | 块引用预览、反向链接、跨文档引用 |
| P1 | Markdown 深兼容 | 基础映射可用，复杂结构存在风险 | 导入/编辑/导出双向高保真 |
| P2 | 性能工程化 | 仅有局部节流，无系统压测基线 | 万级节点稳定 + 可追踪性能指标 |

---

## 8. 启动任务（本轮已开始）

### P0（进行中）
- [ ] **任务 1：协作后端接入与鉴权方案落地**
  - 交付：替换 demo 服务；支持 token 鉴权、房间隔离、基础重连策略
- [ ] **任务 2：评论与版本历史服务端化最小闭环**
  - 交付：评论线程与版本快照写入服务端，保留前端回滚入口

### P1（本轮新增进展）
- [x] **任务 3：布局适配层基础版（layoutBuilder + scrollContainer）**
  - 交付：`EditorUIRenderer` 支持自定义布局槽位，`Outline` 支持注入滚动容器
- [x] **任务 4：工具栏行内模式基础版（inline full toolbar）**
  - 交付：无顶部 toolbar 时，选区浮层支持完整 toolbar 项能力
- [x] **任务 5：自定义布局示例工程（custom-layout-demo）**
  - 交付：与 playground 功能相似但布局不同，用于验证自定义布局方案
- [x] **任务 6：菜单与浮层容器适配（block-handle / table menu）**
  - 交付：支持 `data-be-overlay-container`、`data-be-editor-container`、`data-be-scroll-container` 槽位识别
- [x] **任务 7：块引用体系（预览 / 反向链接）**
  - 交付：链接 hover 预览 + Outline 反向链接列表跳转
- [x] **任务 8：Markdown 深兼容回归矩阵（导入 / 导出双向）**
  - 交付：回归样例集 + Toolbar 执行入口 + 控制台结果汇总

### P2（持续优化）
- [x] **任务 9：大文档压测与性能基线**
  - 交付：可生成大文档并输出 setContent/getJSON/selection/insert 指标
- [~] **任务 10：分包与首屏体积优化（进行中）**
  - 已完成：
    1. `Exporter` 的 `pdf/docx/markdown` 能力改为运行时动态加载依赖
    2. `DocxImporter` 的 `mammoth` 改为运行时动态加载
    3. `playground` / `custom-layout-demo` 增加 `manualChunks`：`vendor-editor` / `vendor-collab` / `vendor-docx` / `vendor-pdf`
  - 当前构建观测（custom-layout-demo）：
    - 入口 `index-*.js` ≈ 3.56kB（gzip 1.74kB）
    - `editor-runtime` ≈ 163.68kB（gzip 43.14kB）
    - `vendor-editor` ≈ 374.94kB（gzip 113.03kB）
    - `vendor-docx` ≈ 462.07kB（gzip 136.45kB）
    - `vendor-pdf` ≈ 982.47kB（gzip 285.53kB）
    - `vendor-misc` ≈ 614.58kB（gzip 174.34kB）
  - 下一步细化优化点：
    1. 将 `vendor-misc` 再拆分（`turndown`、`file-saver`、UI utilities）
    2. 协作能力改为“显式启用时才加载 extension/provider”
    3. 工具栏导入导出相关 Dialog 改为点击时动态 import
    4. 增加 `bundle report`（每次构建自动输出首屏关键 chunk 阈值告警）
    5. 对 `@block-editor/editor` 建立“核心包 + 可选能力包”拆分路线（下一阶段）

---

## 9. 验收口径（下一轮）

1. **生产可用**：协作/评论/历史不依赖本地存储与 demo 服务
2. **保真度**：Markdown 与 DOCX 导入导出结构稳定、可逆性可验证
3. **性能**：万级节点文档下交互不卡顿，关键操作响应稳定
4. **一致性**：块级、菜单、目录、快捷键行为与飞书/语雀体验差异可控
