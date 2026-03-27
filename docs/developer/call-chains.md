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
-> `beforeAll` 先扫描可用端口（`4174-4274`），再通过 `pnpm exec vite --host 127.0.0.1 --port <availablePort>` 启动 playground dev server + Playwright Chromium  
-> `waitForServerReady()` 探活 `http://127.0.0.1:<availablePort>/`，服务可用后再进入用例  
-> 进入 `/scenes/regression?lang=zh-CN&theme=dark&collab=0`  
-> 执行 H2.1~H2.17（通过）+ H2.18（暂时 skip）：评论 / 链接 / 表格工具栏 / block handle / selection tooltip / 撤销重做 / 快捷键一致性 / Shift+Enter 软换行 / 删除块后焦点连续编辑 / 格式化撤销重做 / 块上移下移顺序可逆 / 中文连续输入稳定性冒烟 / 输入不中断压测 / composition 事件链路 / 斜体快捷键一致性 / 选区一致性 / 顶部-选区工具栏一致性 / 粘贴落点  
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
  - 普通文本上下文 URL 粘贴转链接。

## 15. 行为基准执行链路

`behavior-benchmark-todo.md` 新增/调整行为项  
-> 同步更新 `docs/usage/behavior-benchmark.md`（使用侧标准）  
-> 同步更新 `docs/developer/behavior-benchmark.md`（开发侧模型与 P0 基线）  
-> 在 playground 场景执行手工回归  
-> 执行 `pnpm test:unit` + `pnpm test:e2e`  
-> 回填评分与差异项到执行日志。

关键文件：

- `behavior-benchmark-todo.md`
- `docs/usage/behavior-benchmark.md`
- `docs/developer/behavior-benchmark.md`

## 16. 行为差异盘点链路（Phase C）

`/developer/behavior-matrix` 首版三方矩阵  
-> 拉取自动化结果（unit/e2e）+ 手工证据  
-> 输出 `/developer/behavior-gap-analysis`（P0 结论、风险、修复建议）  
-> 同步 `/usage/behavior-gap-analysis`（使用侧快照）  
-> 回写 `behavior-benchmark-todo.md`（C 阶段勾选 + 执行日志）。

关键文件：

- `docs/developer/behavior-matrix.md`
- `docs/developer/behavior-gap-analysis.md`
- `docs/usage/behavior-gap-analysis.md`
- `behavior-benchmark-todo.md`
