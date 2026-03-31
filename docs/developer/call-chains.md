# 开发者文档：调用链路

本页是强制维护页。每次功能改动后，需补充或更新对应链路。

## 1. 顶部工具栏按钮执行链路

`ToolbarItem.click`  
-> `ToolbarItem.execute`  
-> `EditorCore.editor.chain().focus().<command>().run()`  
-> ProseMirror transaction  
-> UI 状态刷新（`selectionUpdate` / `transaction`）。

关键文件：

- `packages/editor/src/ui/toolbar/ToolbarItem.ts`
- `packages/editor/src/core/EditorCore.ts`

## 2. 选区“添加评论”链路

选区工具栏按钮 click  
-> `SelectionTooltip` 发出 `openCommentPanel` 事件  
-> `EditorUIRenderer.openCommentPanel()` 切换显示  
-> `CommentPanel.handleOpenCommentPanel()` 预填引用并 focus 输入框  
-> 用户确认输入后 `createCommentFromSelection()`

关键文件：

- `packages/editor/src/extensions/SelectionTooltip.ts`
- `packages/editor/src/ui/EditorUIRenderer.ts`
- `packages/editor/src/ui/CommentPanel.ts`

## 3. 行内评论点击定位链路

点击文中 `[data-comment-id]`  
-> `EditorUIRenderer.handleEditorCommentClick`  
-> `openCommentPanel()` + emit `focusCommentThread`  
-> `CommentPanel.focusCommentThread()` 滚动并高亮线程

关键文件：

- `packages/editor/src/ui/EditorUIRenderer.ts`
- `packages/editor/src/ui/CommentPanel.ts`

## 4. 下拉菜单链路

`ToolbarDropdown.trigger.click`  
-> `open()`  
-> `createDropdownMenu/createDropdownItem`  
-> `floating-ui computePosition`  
-> 选择项执行命令并关闭菜单。

关键文件：

- `packages/editor/src/ui/toolbar/ToolbarDropdown.ts`
- `packages/editor/src/ui/components/DropdownMenu.ts`

## 5. More 菜单链路

`Toolbar.moreBtn.click`  
-> `openMoreMenu()`  
-> 溢出项移入 `toolbar-more-menu`  
-> outside click / `Esc` 关闭  
-> `checkOverflow()` 在 resize 后重新分配项目。

关键文件：

- `packages/editor/src/ui/Toolbar.ts`
- `packages/editor/src/styles/index.css`

## 6. 评论面板无专用容器兜底链路

模块挂载 commentPanel  
-> 检测无 `commentContainer`  
-> `configureFloatingCommentHost()` 改为右侧浮层  
-> `openCommentPanel` 仍可见

补充（2026-03-27 修复）：

- 当 `layoutSchema.modules.commentPanel.region = "comment"` 且存在专用评论区时，必须直接挂载到 `commentContainer`，不能挂到中间 mountPoint。
- 否则默认布局会出现“事件触发成功，但父评论区容器仍是 `display:none`”导致评论区不可见。

关键文件：

- `packages/editor/src/ui/EditorUIRenderer.ts`

## 7. Block Handle 菜单主题继承链路

`BlockHandleView.toggleMenu()`  
-> `ensureMenuHost()` 在打开前校准宿主容器  
-> 优先挂到 `[data-be-overlay-container="true"]`  
-> 菜单继承 `data-be-theme`，暗黑样式正确生效。

关键文件：

- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/styles/index.css`

## 8. Block Handle 模块开关链路

`layoutSchema.modules.blockHandle.enabled`  
-> `EditorUIRenderer.mountModules()`  
-> `editor.commands.setBlockHandleEnabled(true/false)`  
-> `BlockHandleView.isEnabled()`  
-> 禁用时立即隐藏 handle + 菜单，不参与 hover 命中。

关键文件：

- `packages/editor/src/ui/EditorUIRenderer.ts`
- `packages/editor/src/extensions/block-handle.ts`

## 9. Dialog 默认 i18n fallback 链路

`InsertLinkDialog / InsertImageDialog / VersionHistoryDialog` 构造  
-> 未传 `i18n` 时统一走 `resolveEditorI18n("en-US").dialogs.*`  
-> 业务侧传入 `EditorCore.i18n` 时覆盖 fallback  
-> 对话框 UI 文案保持可国际化、无组件内硬编码中文默认值。

关键文件：

- `packages/editor/src/ui/toolbar/dialogs/insert-link-dialog.ts`
- `packages/editor/src/ui/toolbar/dialogs/insert-image-dialog.ts`
- `packages/editor/src/ui/toolbar/dialogs/version-history-dialog.ts`
- `packages/editor/src/i18n/index.ts`

## 10. Playground E2E 回归链路

`pnpm --filter block-editor-playground test:e2e`  
-> `vitest.e2e.config.ts` 仅加载 `tests/e2e/**/*.spec.ts`  
-> `beforeAll` 先扫描可用端口（`4174-6174`），再通过 `pnpm exec vite --host 127.0.0.1 --port <availablePort>` 启动 playground dev server + Playwright Chromium  
-> `waitForServerReady()` 探活 `http://127.0.0.1:<availablePort>/`，服务可用后再进入用例  
-> 在 `regression / drag-showcase / table-showcase` 场景执行行为链路回归  
-> 覆盖 H2.1~H2.22 + H3.1~H3.16：评论 / 链接 / 表格工具栏 / block handle / selection tooltip / 撤销重做 / 快捷键一致性 / Shift+Enter 软换行 / 删除块后焦点连续编辑 / 格式化撤销重做 / 块上移下移顺序可逆 / 中文连续输入稳定性冒烟 / 输入不中断压测 / composition 事件链路 / 斜体快捷键一致性 / 选区一致性 / 顶部-选区工具栏一致性 / 粘贴落点 / 代码块复制粘贴与光标保持 / 评论双路径一致性 / 表格工具栏快捷键一致性 / 跨块撤销重做 / 评论回复与解决重开 / 下拉键盘导航与 Esc / 暗黑 tooltip&dropdown 对比度 / 粘贴撤销 / 链接编辑撤销重做 / 块复制 / 粘贴图片链接自动转图片 / 块拖拽反馈排序 / 图片对齐与说明稳定 / 代码块语言单击切换 / 表格 handle 点击高亮 / 图片拖拽空段落防回归 / 拖拽专项反馈 / 表格场景 handle 边界 / 图片操作边界分层 / 代码块语言连续切换稳定  
-> `afterAll` 关闭浏览器与本地服务。

关键文件：

- `apps/playground/vitest.e2e.config.ts`
- `apps/playground/tests/e2e/regression.spec.ts`
- `apps/playground/src/scenes/useSceneEditor.ts`

## 11. Playground 块展示场景链路

`/scenes/block-showcase` 路由命中  
-> `BlockShowcaseScenePage.vue` 初始化 `BLOCK_SHOWCASE_CONTENT`（分栏总览 + 多块示例）  
-> `useSceneEditor("block-showcase", ...)` 注入运行时 query（`theme/lang/room/user/collab`）  
-> `EditorCore` 挂载全工具栏 + 行内工具栏，预填默认数据  
-> `EditorUIRenderer` 渲染标准布局，默认展开评论区，支持后续手动交互回归。

关键文件：

- `apps/playground/src/router.ts`
- `apps/playground/src/scenes/pages/BlockShowcaseScenePage.vue`
- `apps/playground/src/scenes/useSceneEditor.ts`

## 12. 代码块粘贴链路（SmartPaste 例外）

`paste` 事件触发  
-> `SmartPaste.handlePaste` 先判断当前是否在代码上下文（`codeBlock / code mark / parent.spec.code`）  
-> 若在代码上下文，直接 `return false`，交由 ProseMirror 默认粘贴（保持在代码块内）  
-> 若不在代码上下文，继续执行 SmartPaste 的 URL 自动链接与 HTML 清洗策略。

关键文件：

- `packages/editor/src/extensions/SmartPaste.ts`

## 13. 删除块后焦点回收链路（BLK-003）

`BlockHandleView.deleteBlock()`  
-> `state.tr.delete(from, to)` 删除目标块  
-> `TextSelection.near(...)` 计算删除后最近可编辑选区  
-> `editorView.dispatch(tr.setSelection(...))`  
-> `editorView.focus()` + `editor.commands.focus()`  
-> 键盘输入可继续写入正文，不出现“空焦点”状态。

关键文件：

- `packages/editor/src/extensions/block-handle.ts`

## 14. 单元测试链路（Vitest）

`pnpm test:unit`  
-> `pnpm --filter @block-editor/editor test`  
-> `vitest run --config packages/editor/vitest.config.ts`  
-> 执行 `packages/editor/src/**/*.spec.ts`。

当前覆盖：

- `packages/editor/src/extensions/__tests__/SmartPaste.spec.ts`
  - 代码块上下文粘贴放行（不触发 SmartPaste 重写）
  - 普通文本上下文 URL 粘贴转链接
  - 图片 URL 粘贴自动转图片节点（选中文本时保持链接语义）
  - HTML 清洗（危险标签/脏样式/类名移除）。
- `packages/editor/src/extensions/__tests__/InteractionState.spec.ts`
  - `idle/text-selection/block-selection/table-editing` 模式切换
  - block 菜单开关状态切换。
- `packages/editor/src/extensions/__tests__/BlockMultiSelect.spec.ts`
  - 块多选 toggle/range/clear
  - 批量删除（倒序删除）
  - 批量转换（paragraph）
  - 批量移动（up）与选区位置更新。
- `packages/editor/src/extensions/__tests__/CommentStore.spec.ts`
  - 线程新增/回复/解决/重开/删除
  - LocalStorage 加载恢复。
- `packages/editor/src/ui/__tests__/comment-panel-logic.spec.ts`
  - 选区预填引用快照（规范化/截断）
  - 当前选区与最近选区兜底策略
  - 确认保存规则（空输入不保存、无选区不保存、有引用时保存）。

## 15. 行为基准执行链路

`docs/todo/history/behavior-benchmark-todo.md` 新增/调整行为项  
-> 同步更新 `docs/usage/behavior-benchmark.md`（使用侧标准）  
-> 同步更新 `docs/developer/behavior-benchmark.md`（开发侧模型与 P0 基线）  
-> 在 playground 场景执行手工回归  
-> 执行 `pnpm test:unit` + `pnpm test:e2e`  
-> 回填评分与差异项到执行日志。

关键文件：

- `docs/todo/history/behavior-benchmark-todo.md`
- `docs/usage/behavior-benchmark.md`
- `docs/developer/behavior-benchmark.md`

## 16. 行为差异盘点链路（Phase C）

`/developer/behavior-matrix` 首版三方矩阵  
-> 拉取自动化结果（unit/e2e）+ 手工证据  
-> 输出 `/developer/behavior-gap-analysis`（P0 结论、风险、修复建议）  
-> 同步 `/usage/behavior-gap-analysis`（使用侧快照）  
-> 回写 `docs/todo/history/behavior-benchmark-todo.md`（C 阶段勾选 + 执行日志）。

关键文件：

- `docs/developer/behavior-matrix.md`
- `docs/developer/behavior-gap-analysis.md`
- `docs/usage/behavior-gap-analysis.md`
- `docs/todo/history/behavior-benchmark-todo.md`

## 17. 顶部工具栏选区保持链路（评论/链接等依赖选区命令）

`ToolbarItem.render()`  
-> 给按钮统一注册 `mousedown.preventDefault()`  
-> 点击顶部工具栏不会先把焦点切到按钮导致选区坍塌  
-> `onExecute` 阶段仍可读取到编辑区当前选区（如 `addComment`、`setLink`）。

关键文件：

- `packages/editor/src/ui/toolbar/ToolbarItem.ts`

## 18. 评论面板“最近选区”兜底链路

`CommentPanel.handleSelectionUpdate()`  
-> 在每次非空选区变更时缓存 `{ from, to, preview }`  
-> `openCommentPanel` 触发时：优先当前非空选区，否则回退到最近缓存选区  
-> 顶部工具栏路径与选区工具栏路径的引用预填行为保持一致。

关键文件：

- `packages/editor/src/ui/CommentPanel.ts`

## 19. 快捷键统一分发链路（2026-03-31）

`document.keydown(capture)`  
-> `ShortcutManager.handleKeydown`（限定编辑区焦点）  
-> `ShortcutRegistry.dispatch`（平台映射、input 安全、when 条件、priority 仲裁）  
-> `EditorCore.registerDefaultShortcuts()` / 各 UI 模块注册的 `run`  
-> `core.exec(...)` 或 `events.emit(...)` 执行具体行为。

关键文件：

- `packages/editor/src/core/ShortcutManager.ts`
- `packages/editor/src/core/ShortcutRegistry.ts`
- `packages/editor/src/core/EditorCore.ts`
- `packages/editor/src/ui/menus/find-replace-panel.ts`
- `packages/editor/src/ui/menus/block-multi-select-bar.ts`

## 20. 版本历史 diff 基线解析链路（2026-03-31 修复）

版本列表行展开  
-> `VersionHistoryDialog.resolveBaseSnapshotForDiff()` 选择真实对比基线（跳过无变化快照）  
-> `renderDetail/openFullDiffDialog` 统一使用该基线  
-> `VersionHistoryManager.getSnapshotDiff(currentId, baseId)` 输出一致的统计与详情。

关键文件：

- `packages/editor/src/ui/toolbar/dialogs/version-history-dialog.ts`
- `packages/editor/src/core/VersionHistory.ts`

## 19. 快捷键统一分发链路（P0-SK2~SK5）

`EditorUIRenderer` 初始化  
-> `editorCore.shortcuts.setEditorRoot(...)` + `shortcuts.start()`  
-> `ShortcutManager` 捕获 `document keydown(capture)`  
-> 仅处理当前编辑器作用域事件（target 或 activeElement 在 editorRoot 内）  
-> `ShortcutRegistry.dispatch()` 根据平台映射、优先级、`when` 条件决策  
-> 命中后执行对应命令（如 `find.open` / `find.close` / `multiselect.clear`）。

补充：

- 冲突检测：注册时按 `scope + combo` 计算冲突并输出告警。
- 输入框保护：默认输入控件不触发全局快捷键，个别能力（`find.open`）可显式 `allowInInput`。

关键文件：

- `packages/editor/src/core/ShortcutManager.ts`
- `packages/editor/src/core/ShortcutRegistry.ts`
- `packages/editor/src/ui/EditorUIRenderer.ts`
- `packages/editor/src/ui/menus/find-replace-panel.ts`
- `packages/editor/src/ui/menus/block-multi-select-bar.ts`

## 19. 表格 Handle 选中态链路

鼠标进入表格区域  
-> `TableHandleView.handleMouseMove()` 命中 table 节点并显示左上角专属 handle  
-> 点击 `be-table-handle`  
-> `focusFirstCell()` 将焦点落回表格首单元格，模式切换为 `table-editing`  
-> 当前 table 节点添加 `be-table-selected` 高亮类  
-> 点击表格外区域自动清除整表高亮。

补充：

- `block-handle` 在表格区域命中时会主动让位（隐藏/不抢占），降低“块 handle vs 表格 handle”混淆。

关键文件：

- `packages/editor/src/extensions/TableHandle.ts`
- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/styles/index.css`

## 20. 代码高亮按需懒加载链路

## 21. 查找替换链路（Find / Replace）

`Toolbar` 查找按钮点击 或 `Cmd/Ctrl+F`
-> `EditorCore.events.emit("openFindReplace")`
-> `FindReplacePanel.open()` 打开面板并同步输入框
-> `collectMatches(doc, query)` 生成命中区间
-> `editor.commands.setFindReplaceState({ query, matches, activeIndex })`
-> `FindReplace` 扩展触发 `findReplaceUpdate` transaction meta
-> ProseMirror decorations 渲染 `.be-find-match / .be-find-match-active` 高亮
-> `next/prev` 切换时 `setTextSelection + scrollIntoView` 定位到对应命中。

替换链路：

`replace current`
-> `tr.insertText(replacement, from, to)`
-> `dispatch(tr)`
-> `refreshMatches()` 重新计算命中并定位当前项。

`replace all`
-> 倒序遍历 matches 执行 `tr.insertText(...)`
-> `dispatch(tr)`（单事务保留撤销链）
-> `refreshMatches()` 更新命中计数与高亮。

关键文件：

- `packages/editor/src/extensions/FindReplace.ts`
- `packages/editor/src/ui/menus/find-replace-panel.ts`
- `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`

代码块初始化/语言切换  
-> `CodeBlockView.ensureLanguageLoaded()`  
-> `ensureCodeLanguageRegistered(language)` 动态 import 对应 `highlight.js` 语言模块  
-> 语言注册到 lowlight（单例）  
-> `CustomCodeBlock`（`code-block-lowlight`）读取 lowlight 进行语法高亮  
-> 首次加载新语言后触发一次轻量 refresh transaction，立即生效。

关键文件：

- `packages/editor/src/extensions/code-highlighting.ts`
- `packages/editor/src/extensions/CodeBlock.ts`
- `packages/editor/src/extensions/CodeBlockView.ts`
- `packages/editor/src/styles/code-block.css`

## 21. 代码块语言单击切换链路

代码块语言下拉项单击  
-> `CodeBlockView.switchLanguage()` 立即更新 `language` attrs（不等待异步加载）  
-> 下拉立即关闭，避免“需要点两次”的交互延迟  
-> 异步执行 `ensureCodeLanguageRegistered()` 加载语言包  
-> 完成后触发无历史污染的 refresh transaction，语法高亮即时刷新。

关键文件：

- `packages/editor/src/extensions/CodeBlockView.ts`
- `packages/editor/src/extensions/code-highlighting.ts`

## 22. 图片点击预览链路

图片节点点击  
-> 第一次点击：设置 `NodeSelection` + 展示图片专属工具栏（不自动开预览）  
-> 再次单击图片 / 双击图片 / 点击图片工具栏“预览”按钮：`openImagePreviewFromImage()` 打开预览浮层  
-> `ImagePreviewModal` 组件收口预览状态（图集索引/缩放比例/旋转角度/拖拽平移）  
-> 预览层支持滚轮缩放（`wheel`）与指针拖拽平移（`pointerdown/move/up`）  
-> 底部工具栏统一支持：上一张、下一张、比例（百分比）、旋转、放大、缩小、下载  
-> 预览层支持黑色半透明遮罩、右上角关闭按钮、`Esc`/遮罩点击关闭，并锁定页面滚动（关闭后恢复）。

关键文件：

- `packages/editor/src/extensions/ImageEnhanced.ts`
- `packages/editor/src/ui/components/ImagePreviewModal.ts`
- `packages/editor/src/styles/image.css`

## 23. 图片选中态与选区工具栏互斥链路

图片被 `NodeSelection` 选中  
-> `SelectionTooltip.shouldShow` 检测 `selection instanceof NodeSelection` 直接返回 `false`  
-> 同时对 `editor.isActive("image")` 返回 `false`  
-> 仅保留图片工具栏，避免“文本选区工具栏 + 图片工具栏”重复显示。

关键文件：

- `packages/editor/src/extensions/SelectionTooltip.ts`
- `packages/editor/src/extensions/ImageEnhanced.ts`

## 19. E2E 稳定性策略链路（F6）

`regression.spec.ts`  
-> 动态端口：`findAvailablePort(4174-6174)` + `waitForServerReady()`，避免固定端口冲突  
-> 双语断言：关键文案用 `中文|English` 正则（如 `表格工具栏|table toolbar`）  
-> 弱时序断言：优先 `expect.poll` / `waitForVisible`，减少硬编码 sleep 依赖  
-> 行为 ID 命名：每个测试标题统一 `H2.x`，失败可直接回溯到行为矩阵与 TODO。

关键文件：

- `apps/playground/tests/e2e/regression.spec.ts`
- `apps/playground/vitest.e2e.config.ts`
- `docs/todo/history/behavior-benchmark-todo.md`

## 20. 评论面板纯逻辑链路（E4）

`CommentPanel` 在 `selectionUpdate/openCommentPanel/createCommentFromSelection` 中  
-> 调用 `comment-panel-logic` 纯函数（`buildSelectionSnapshot / resolvePendingSelection / buildCreateCommentDraft`）  
-> 统一预填引用、选区兜底、确认保存判定  
-> UI 层只负责渲染与命令下发，核心判定可由 Vitest 在 Node 环境稳定回归。

关键文件：

- `packages/editor/src/ui/comment-panel-logic.ts`
- `packages/editor/src/ui/CommentPanel.ts`
- `packages/editor/src/ui/__tests__/comment-panel-logic.spec.ts`

## 21. 行为基准场景 case 定位链路（Phase D）

访问 `/scenes/behavior-benchmark?...&case=<behavior-id>`  
-> `BehaviorBenchmarkScenePage` 解析 `route.query.case` 并标准化为大写行为 ID  
-> `openCase` 写回 URL（保持 `theme/lang/collab/room/user`）  
-> `scheduleFocusCase` 在编辑器渲染后滚动到对应锚点并高亮  
-> 实现“每个 P0 行为项都有 URL 复现入口”的回放能力。

关键文件：

- `apps/playground/src/scenes/pages/BehaviorBenchmarkScenePage.vue`
- `apps/playground/src/scenes/useSceneEditor.ts`
- `apps/playground/src/router.ts`

## 22. 行为评分与发布门禁链路（Phase G）

执行 `pnpm release:gate`  
-> 先跑 `pnpm test:unit`（editor 纯逻辑与状态机）  
-> 再跑 `pnpm test:e2e`（行为链路回归）  
-> 最后跑 `pnpm --dir docs docs:build`（文档可发布性）  
-> 任一环节失败即阻断发布。

关键文件：

- `package.json`
- `docs/developer/behavior-scorecard.md`
- `docs/usage/behavior-scorecard.md`
- `.github/workflows/behavior-gate.yml`

## 23. 顶部工具栏链接编辑预填链路（LNK-003）

顶部工具栏执行 `addLink`  
-> 读取 `editor.getAttributes("link").href` 作为 `InsertLinkDialog` 初始 URL  
-> 在已选中链接文本时可直接编辑地址与显示文本  
-> 提交后通过 `insertContent + link mark` 更新，支持撤销重做回放。

关键文件：

- `packages/editor/src/ui/toolbar/defaultToolbarItems.ts`
- `packages/editor/src/ui/toolbar/dialogs/insert-link-dialog.ts`
- `apps/playground/tests/e2e/regression.spec.ts`

## 24. 下拉键盘焦点链路（TOB-003）

键盘触发 `ToolbarDropdown.trigger.keydown`  
-> `ArrowDown/ArrowUp/Enter/Space` 打开下拉并设置 `keyboard-focus`  
-> 菜单容器获得焦点（`tabindex=-1`）  
-> `Arrow/Home/End/Enter/Escape/Tab` 统一走 `handleMenuKeydown`  
-> 满足键盘导航与 Esc 关闭一致性。

关键文件：

- `packages/editor/src/ui/toolbar/ToolbarDropdown.ts`
- `packages/editor/src/ui/components/DropdownMenu.ts`
- `apps/playground/tests/e2e/regression.spec.ts`

## 25. Block Handle 拖放排序链路（BLK-009）

`block-handle` 设置 `draggable=true`  
-> `dragstart` 记录 `draggingBlockPos` + 标记源块样式  
-> `dragover` 根据鼠标位置计算目标块与 `before/after` 落点，渲染高亮反馈  
-> `drop` 触发 `reorderBlockByDrop`（delete + insert）完成重排并回收焦点  
-> `dragend` 清理拖放态与高亮类。

关键文件：

- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/styles/index.css`
- `apps/playground/tests/e2e/regression.spec.ts`

## 26. 图片对齐与说明稳定链路（IMG-002）

图片 nodeView 交互  
-> 点击图片时设置 `NodeSelection` 并显示对齐栏  
-> 对齐按钮写入 `data-align` 并通过 `setNodeMarkup` 持久化 attrs  
-> 说明文本 `input` 时写入 caption attrs，更新阶段避免无谓清空已编辑内容  
-> 回归验证 H3.9 覆盖对齐切换 + 说明编辑稳定性。

关键文件：

- `packages/editor/src/extensions/ImageEnhanced.ts`
- `apps/playground/src/scenes/pages/RegressionScenePage.vue`
- `apps/playground/tests/e2e/regression.spec.ts`

## 27. 拖拽专项场景链路（J8）

`/scenes/drag-showcase` 路由命中  
-> `DragShowcaseScenePage.vue` 载入段落/引用/代码块/图片混合内容  
-> `useSceneEditor("drag-showcase", ...)` 保留 `theme/lang/collab/room/user` 透传  
-> 用于回放拖拽反馈、图片块拖拽空段落问题与排序稳定性。

关键文件：

- `apps/playground/src/router.ts`
- `apps/playground/src/scenes/pages/DragShowcaseScenePage.vue`
- `apps/playground/src/scenes/useSceneEditor.ts`

## 28. 表格专项场景链路（J9）

`/scenes/table-showcase` 路由命中  
-> `TableShowcaseScenePage.vue` 载入双表格 + 中间段落  
-> 用于验证表格 handle、整表高亮、表格工具栏与 block handle 边界  
-> 覆盖“表格区优先表格 handle，离开表格后 block handle 恢复”的交互规则。

关键文件：

- `apps/playground/src/router.ts`
- `apps/playground/src/scenes/pages/TableShowcaseScenePage.vue`
- `packages/editor/src/extensions/TableHandle.ts`
- `packages/editor/src/extensions/block-handle.ts`

## 29. H3.12~H3.14 回归链路（J11）

`regression.spec.ts` 新增三条回归：  
-> `H3.12` 图片块拖拽后不新增空段落  
-> `H3.13` 拖拽专项中引用块与代码块均有落点高亮反馈  
-> `H3.14` 表格专项中表格 handle 与 block handle 边界区分正确。

关键文件：

- `apps/playground/tests/e2e/regression.spec.ts`
- `apps/playground/src/scenes/pages/DragShowcaseScenePage.vue`
- `apps/playground/src/scenes/pages/TableShowcaseScenePage.vue`

## 30. 图片原子块 Block Handle 定位回退链路（J1）

鼠标移动到图片（atom/nodeView）区域  
-> `block-handle.handleMouseMove` 先尝试 `posAtCoords + resolvedPos`  
-> 若坐标解析深度不足（如图片原子块场景），回退到 `getVisualBlockFromDomTarget`（按 DOM 层级反推顶层块）  
-> 成功定位后统一执行 `showHandle`  
-> 保证图片块也能稳定显示 block handle 并参与拖拽排序，避免“图片拖拽前手柄消失/不可见”。

关键文件：

- `packages/editor/src/extensions/block-handle.ts`
- `apps/playground/tests/e2e/regression.spec.ts`

## 31. 图片操作优先级与代码块连续切换链路（J2/J4）

图片边界分层：  
-> `ImageEnhanced` 在对齐工具条展开时为 figure 添加 `be-image-controls-active` 标记  
-> `block-handle.shouldHideForImageInteraction` 在图片中部、对齐栏、resize、caption 区域隐藏块手柄  
-> 仅在图片左侧边缘保留块手柄入口，降低“图片操作”和“块操作”混淆。

代码块连续切换稳定：  
-> `CodeBlockView.switchLanguage` 增加并发序号守卫 + `aria-busy`/loading 清理兜底  
-> 连续切换多次时只保留最后一次结果，不残留 `is-loading` 态。

关键文件：

- `packages/editor/src/extensions/ImageEnhanced.ts`
- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/extensions/CodeBlockView.ts`
- `apps/playground/tests/e2e/regression.spec.ts`

## 32. 图片交互状态机链路（P0-3）

状态机定义：`idle -> selected -> toolbar-open -> preview-open`

- `idle`：无图片节点选中。
- `selected`：首次点击图片，设置 `NodeSelection(image)`。
- `toolbar-open`：图片工具条显示（对齐/预览），文本选区工具栏互斥隐藏。
- `preview-open`：再次单击图片、双击图片或点击预览按钮进入弹层预览。

核心流转：

`ImageEnhanced.img.click`  
-> `selectCurrentImageNode()`  
-> `setControlsVisible(true)`  
-> 若此前已 `toolbar-open`，触发 `openImagePreviewFromImage()` 进入 `preview-open`  
-> 关闭预览后返回 `toolbar-open/selected` 上下文。

关键文件：

- `packages/editor/src/extensions/ImageEnhanced.ts`
- `packages/editor/src/extensions/SelectionTooltip.ts`
- `packages/editor/src/ui/components/ImagePreviewModal.ts`

## 33. caption 编辑与 block-handle 避让链路（P0-4）

`EditorCore` 按场景传入 `imageCaptionEnabled`  
-> `ImageEnhanced` 动态启用 caption（默认关闭）  
-> caption `focus/mousedown` 时给 figure 打标 `be-image-caption-editing` 并收起图片工具条  
-> `block-handle.shouldHideForImageInteraction` 识别该标记并立即隐藏 handle  
-> 避免 caption 输入阶段的焦点抢占与 hover 抢占。

关键文件：

- `packages/editor/src/core/EditorCore.ts`
- `packages/editor/src/extensions/ImageEnhanced.ts`
- `packages/editor/src/extensions/block-handle.ts`
- `apps/playground/src/scenes/pages/DragShowcaseScenePage.vue`

## 34. 长按拖拽阈值与清理链路（P0-5 / P0-7 / P0-8）

`block-handle.mousedown`  
-> 记录按下时间与起始坐标（`pointerDownAt/x/y`）  
-> `mousemove` 追踪最大位移  
-> `dragstart`（真实用户事件）仅在满足 `longPressMs(180ms) + dragDistancePx(6px)` 时放行  
-> `dragover/drop` 走 capture 监听优先 `preventDefault`（防止 ProseMirror/浏览器默认 drop 造成重复插入）  
-> `finishDrag` 统一清理 `is-dragging / be-block-drag-source / be-block-drop-target / pointerTracking`。

补充：

- 自动化合成 DragEvent（`event.isTrusted=false`）不受长按阈值限制，保证 e2e 可稳定回放。
- `application/x-be-block-drag` 自定义类型用于识别本编辑器内部块拖拽链路并拦截默认 drop。

关键文件：

- `packages/editor/src/extensions/block-handle.ts`
- `packages/editor/src/styles/index.css`

## 35. 框选多块 + handle 组拖拽链路

左侧 gutter `mousedown`（在编辑区左边距）  
-> `BlockMultiSelectOverlayView` 进入 marquee 模式并绘制框选框  
-> `mousemove` 实时计算框与顶层块 DOM 交集，更新 `selectedPositions`  
-> `mouseup` 结束框选，保留多选覆盖层和多选操作栏。

组拖拽：

在任一已选块 handle 上 `dragstart`  
-> `block-handle` 识别当前块属于 `selectedPositions` 且数量 > 1  
-> 将 `draggingBlockGroup` 设为整组选中块  
-> `drop` 时调用 `moveSelectedBlocksToTarget(targetPos, placement)`  
-> 选中组整体移动并保持组内顺序。

关键文件：

- `packages/editor/src/extensions/BlockMultiSelect.ts`
- `packages/editor/src/extensions/block-handle.ts`
- `apps/playground/tests/e2e/regression.spec.ts`
