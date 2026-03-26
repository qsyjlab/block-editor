# Block Editor 模块化与主题统一 TODO（中文版）

最后更新时间：2026-03-26（持续更新，含暗黑模式任务）  
负责人：Codex + 你  
当前状态：进行中

## 0. 目标定义（本次改造要达到什么）

1. 全局视觉统一：所有非主题色收口到语义化主题变量。
2. 组件化：按钮、下拉、Tooltip、引用块等可复用组件沉淀到 `ui/components`。
3. 操作栏可配置：`toolbar` 与 `selectionToolbar` 都支持“预设 + 自定义”。
4. 模块化：评论、大纲、表格工具、块操作等功能可独立挂载/关闭/换位。
5. 自定义布局：可按区域自由编排模块，不改业务代码。
6. playground 场景化：通过路由快速切换并验证不同布局/操作栏配置。

## 1. 执行规则（每次都要遵守）

1. 每完成一个子任务，立即更新本文件勾选状态。
2. 每次代码提交后，在“执行日志”追加一条：时间、改动范围、验证结果、遗留问题。
3. 如任务拆分变化，先更新“任务清单”再执行。
4. 任何 `debugger`、硬编码颜色、新增硬编码文案，禁止入库。

## 2. 阶段计划（细颗粒）

### Phase A：基线盘点与风险清理

- [x] A1. 清理调试残留（`debugger`、临时日志、临时分支代码）。
- [x] A2. 输出硬编码颜色清单（按文件、数量、优先级）。
- [x] A3. 输出硬编码文案清单（按模块、是否已 i18n）。
- [x] A4. 输出重复实现清单（例如多份 multi-select bar）。
- [x] A5. 标注高风险改造点（交互强耦合/样式耦合/事件总线耦合）。

验收标准：
- [ ] 运行时代码无 `debugger`。
- [ ] 至少产出三份清单：颜色、文案、重复实现。
- [ ] 每份清单都有“先改/后改”优先级。

---

### Phase B：主题变量体系（Token）落地

- [ ] B1. 定义语义 Token（主色/文本/边框/背景/状态/阴影）命名规范。
- [ ] B2. 在 `styles/index.css` 建立统一 Token 根定义。
- [ ] B3. 替换核心样式硬编码：
- [ ] B3.1 `styles/index.css`
- [ ] B3.2 `styles/code-block.css`
- [ ] B3.3 `styles/tailwind.css`
- [ ] B4. 替换高频 TS 内联样式中的颜色引用（评论、大纲、块菜单、Slash、弹窗）。
- [ ] B5. 增加“主题切换冒烟验证”步骤（改一处 primary，观察全局联动）。
- [x] B6. 新增主题模式配置：`light / dark / auto`（渲染器 + URL 参数）。
- [ ] B7. 暗黑模式核心区视觉补齐（toolbar/comment/outline/table/handle）。
- [x] B8. playground 增加主题切换入口并支持场景联动验证。

验收标准：
- [ ] 核心区（toolbar/comment/outline/table/handle）颜色由 Token 驱动。
- [ ] 不再出现大面积孤岛颜色。
- [ ] 改 `--primary` 可见联动变化。

---

### Phase C：UI 基础组件抽离

- [x] C1. `BaseButton`（variant、size、danger、disabled、icon-only）。
- [x] C2. `DropdownMenu`（trigger、menu、item、divider、active、keyboard）。
- [x] C3. `Tooltip`（文本、快捷键、副标题、定位策略）。
- [x] C4. `QuotePreview`（`| 引用内容`，支持点击跳转）。
- [x] C5. `PanelCard`（评论卡片/侧边卡片统一容器）。
- [x] C6. 抽离后先迁移 2 个模块验证可复用性（评论 + block-handle）。

验收标准：
- [ ] 样式状态一致（hover/active/disabled/danger）。
- [ ] 新增 UI 时优先复用组件，不再复制一套内联样式。

---

### Phase D：i18n 组件契约与文案补齐

- [ ] D1. 组件契约统一：`title/label/placeholder/ariaLabel/emptyText` 全走 props。
- [ ] D2. 业务层统一注入 i18n，不允许组件直接写死中文/英文。
- [ ] D3. 补齐缺失词条（评论面板、块多选栏、slash、block-handle、outline 内按钮）。
- [ ] D4. 保留 fallback 机制（缺词条时可降级显示）。

验收标准：
- [ ] 中英切换后已迁移模块文案正确。
- [ ] 新增模块不出现硬编码文案。

---

### Phase E：操作栏自定义（重点）

- [x] E1. 定义 `toolbarConfig` 与 `selectionToolbarConfig` 类型。
- [x] E2. 支持预设：`full` / `basic` / `minimal`。
- [x] E3. 支持自定义项：新增、移除、重排、按 `id` 覆盖 label/tooltip/icon。
- [x] E4. 统一 item factory，确保 header toolbar 和 selection toolbar 行为一致。
- [x] E5. 支持 i18n key 与 direct label 混用（优先 direct label）。

验收标准：
- [ ] 两类操作栏可独立配置。
- [ ] 相同命令在两类操作栏行为一致。
- [ ] 配置改动无需改组件内部实现。

---

### Phase F：模块化与自定义布局

- [x] F1. 定义模块接口：`mount/unmount/update/defaultRegion/i18nKeys`。
- [ ] F2. 将以下能力模块化：
- [ ] F2.1 toolbar
- [ ] F2.2 selection toolbar
- [ ] F2.3 comment panel
- [ ] F2.4 outline
- [ ] F2.5 table bubble menu
- [ ] F2.6 block handle
- [ ] F3. 定义 `layoutSchema`（区域、顺序、可见性、宽度/权重）。
- [ ] F4. `EditorUIRenderer` 支持按 schema 挂载模块。
- [ ] F5. 保留 `layoutBuilder` 兼容层，避免现有用法断裂。

验收标准：
- [ ] 模块可在不同区域互换位置。
- [ ] 默认布局可用，自定义布局可用，旧接口可用。

---

### Phase G：Playground 路由场景改造

- [x] G1. 引入 `vue-router`。
- [x] G2. 新增场景路由页面：
- [x] G2.1 `/scenes/default`
- [x] G2.2 `/scenes/inline-toolbar`
- [x] G2.3 `/scenes/minimal`
- [x] G2.4 `/scenes/custom-layout-a`
- [x] G2.5 `/scenes/custom-layout-b`
- [x] G3. 增加导航入口（侧边栏或顶部切换）。
- [x] G4. 兼容 query 参数：`room`、`user`、`lang`。
- [x] G5. 每个场景给出“当前配置摘要”便于对比。

验收标准：
- [ ] 可以通过 URL 快速复现任一场景。
- [ ] 切换场景不破坏协作参数。

---

### Phase H：验证、回归、文档

- [x] H1. 全量构建通过（workspace + playground）。
- [ ] H2. 关键交互回归：
- [ ] H2.1 评论（创建、定位、展开、引用跳转）
- [ ] H2.2 链接（插入、预览、跳转）
- [ ] H2.3 表格工具栏（i18n、操作）
- [ ] H2.4 block handle 菜单
- [ ] H2.5 selection tooltip
- [x] H3. 清理重复实现与死代码。
- [x] H4. 输出迁移文档（配置示例、布局示例、模块注册示例）。

验收标准：
- [ ] 无阻断级回归。
- [ ] 新增文档可指导他人接入自定义布局与操作栏。

---

### Phase I：VitePress 文档站（新增）

- [x] I1. 在根目录接入 VitePress（依赖 + 脚本）。
- [x] I2. 建立 `docs/.vitepress/config.ts`（默认官方文档风格）。
- [x] I3. 补齐基础页面：首页、快速开始、配置参考。
- [x] I4. 接入现有审计文档到侧边栏导航。
- [x] I5. 增加“模块化/布局/操作栏配置”专题文档页（后续补齐）。
- [x] I6. 文档拆分为独立仓库（`docs-repo`，独立 `package.json` + Git）。

验收标准：
- [ ] `pnpm docs:dev` 可启动。
- [x] `pnpm docs:build` 可构建。
- [x] 文档结构可覆盖接入、配置、场景化验证与迁移说明。
- [x] 文档可独立于主仓运行和构建。

## 3. 当前优先顺序（执行顺序）

1. Phase A（清理与盘点）
2. Phase E（操作栏可配置）并行打基础类型
3. Phase G（playground 路由场景）用于可视化验证
4. Phase B/C/D（主题与组件）分模块迭代替换
5. Phase F/H（模块化收口 + 回归文档）

## 4. 执行日志（每次执行后更新）

- 2026-03-26：初始化中文版细粒度 TODO，建立阶段与验收模板。
- 2026-03-26：完成 Playground 路由场景化改造（新增 5 个场景示例、场景导航、query 透传），并修复 `EditorUIRenderer` 残留 `debugger`。验证：`apps/playground` 构建通过。遗留：操作栏“配置级自定义（item 重排/裁剪）”待 Phase E 落地。
- 2026-03-26：完成 Phase A 盘点文档：颜色硬编码清单、文案硬编码清单、重复实现清单、重构风险图。产物目录：`docs/ui-audit/`。遗留：进入 Phase E（操作栏配置化）与 Phase B（Token 替换）执行阶段。
- 2026-03-26：启动 Phase E。已新增操作栏配置模型 `EditorUIConfig`，并打通 `EditorCore -> Toolbar -> SelectionTooltip` 接线；Playground 场景已可配置 `toolbar` preset（full/basic/minimal）和 `selectionToolbar` items。验证：`packages/editor` 与 `apps/playground` 构建通过。遗留：E2-E5（预设完善、item 覆盖、排序与可见性配置）未完成。
- 2026-03-26：完成 playground 演示布局收敛（修复 100vh/100vw 导致的溢出挤压，统一场景容器自适应），并增强操作栏配置能力（`hiddenCommands`、`labelOverrides`）。在场景中加入“隐藏命令/覆盖文案”示例用于可视化验证。验证：`packages/editor` 与 `apps/playground` 构建通过。遗留：E3 尚缺 `icon/tooltip/order` 级别覆盖。
- 2026-03-26：继续推进 Phase E，新增 `hiddenItems`、`itemOrder`、`itemOverrides`、`i18nLabelOverrides` 配置；支持按 `id` 覆盖 `label/tooltip/icon`，并在 `ToolbarItem/ToolbarDropdown` 接入可配置 tooltip。Playground 场景新增“重排/覆盖提示文案”示例。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：E4（header/selection item factory 完全统一）待完成。
- 2026-03-26：完成 E4，抽离 `toolbar/item-factory` 并让 `Toolbar` 与 `SelectionTooltip` 复用同一套 item 渲染逻辑（button/dropdown/color/divider），确保行为一致。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：启动 Phase C，新增 `ui/components/BaseButton`（支持 variant/size/pill/iconOnly），并在 `CommentPanel` 迁移筛选按钮、创建按钮、回复按钮、动作按钮（作为 C6 的第一个模块验证样本）。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：`DropdownMenu`/`Tooltip`/`QuotePreview` 及 block-handle 迁移待完成。
- 2026-03-26：继续推进 Phase C，新增 `BaseTag`（评论筛选标签组件）、`QuotePreview`（引用块组件）、`BaseInput`（统一输入组件）；`input.ts` 已改为基于 `BaseInput`，插入链接/插入图片对话框自动复用。`CommentPanel` 已迁移到 `BaseTag + QuotePreview + BaseInput`。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：`DropdownMenu`、`Tooltip`、`PanelCard` 及 block-handle 模块迁移待完成。
- 2026-03-26：新增暗黑模式任务并开始执行。`EditorUIRenderer` 新增 `theme`（`light/dark/auto`）配置，容器挂载 `data-be-theme`；playground 新增主题切换（浅色/暗黑/跟随系统）并支持 `?theme=` 路由联动；`ScenarioPage` 与布局构造器改为主题变量色值。验证：构建通过。遗留：Phase B 的全量暗黑视觉收口（B7）继续执行。
- 2026-03-26：继续推进 B7（暗黑模式核心区视觉补齐）。已将 `Outline`、`block-handle`、`selection tooltip`、`table bubble menu`、`toolbar dropdown` 等核心区域改为主题变量（`--paper-bg/--border-color/--text-color/--surface-soft/--primary-color`），并清理对应 TS 内联硬编码色值。验证：`@block-editor/editor`、`block-editor-playground` 构建通过。遗留：Phase B 全量硬编码颜色清理仍需继续（color picker/全局 tooltip/少量 legacy 区域）。
- 2026-03-26：新增 Phase I（VitePress 文档站）。已在根目录接入 `vitepress`、添加 `docs:dev/docs:build/docs:preview` 脚本，创建 `docs/.vitepress/config.mts`，并补齐首页、快速开始、配置参考页面；同时将 `docs/ui-audit` 文档接入导航。验证：`pnpm docs:build` 通过。
- 2026-03-26：按新要求将文档拆分为独立仓库 `docs-repo/`（已 `git init`、独立 `package.json` 和 VitePress 配置）。主仓已移除 docs 脚本与 `vitepress` 依赖，避免主仓与文档站耦合。验证：`docs-repo` 独立构建待本轮执行。
- 2026-03-26：完成 `docs-repo` 独立构建验证：`pnpm install --ignore-workspace` 与 `pnpm docs:build` 在 `docs-repo/` 执行通过。当前文档站已可作为独立仓库维护与发布。
- 2026-03-26：调整文档仓库结构为“根目录直出”（不再套 `docs/` 一层）：`docs-repo/.vitepress`、`docs-repo/index.md`、`docs-repo/guide`、`docs-repo/reference`、`docs-repo/ui-audit`。验证：`docs-repo` 的 `pnpm docs:build` 通过。
- 2026-03-26：继续推进 B7，补齐 `color-picker`、`global-tooltip`、`text-btn`、`doc-title-input` 等样式的主题变量化（含暗黑变量联动）。验证：`@block-editor/editor` 构建通过。
- 2026-03-26：继续推进 B7 收尾：将评论面板内联色、评论标记（`comment-mark`）、danger 态、tooltip 阴影/文本、block handle 菜单危险态、color-picker hover 等统一到主题变量；暗黑模式下避免绿色/浅色硬编码跳色。验证：`@block-editor/editor` 构建通过。
- 2026-03-26：完成 C2/C3 基础抽离。新增 `ui/components/DropdownMenu.ts` 与 `ui/components/Tooltip.ts`，并迁移 `ToolbarDropdown`、`block-handle` 菜单项、`TooltipManager` 到组件化实现，减少重复逻辑。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：完成 C5/C6。新增 `ui/components/PanelCard.ts`，并迁移评论线程卡片（`CommentPanel`）与 block-handle 菜单容器到统一卡片容器语义；确认“评论 + block-handle”两模块完成复用验证。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进 Phase D。新增 `commentPanel` 与 `blockHandle` i18n 词条契约（`types.ts` + `zh/en.ts` + `resolveEditorI18n` 合并），`CommentPanel` 全量替换硬编码文案并由 `EditorUIRenderer` 注入，`BlockHandle` 菜单/aria/复制提示改为 i18n 注入（`EditorCore` 配置扩展词条）。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：D3 仍需覆盖 slash、多选栏、版本历史等剩余硬编码文案。
- 2026-03-26：继续推进 Phase D（第二批）。新增 `blockMultiSelectBar` i18n 契约并完成 `ui/menus/block-multi-select-bar.ts` 全量文案替换（aria、按钮 tooltip、计数字段函数化），实现中英文切换联动。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：Slash 命令、`version-history-dialog`、`color-picker` 仍有硬编码文案待迁移。
- 2026-03-26：继续推进 Phase D（第三批）。补齐 `versionHistoryDialog` 词条（详情空态、diff/blame 标签、基线摘要、完整 Diff 头部与副标题），并替换 `version-history-dialog.ts` 内部残留硬编码文案。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：Slash 命令和 `color-picker` 仍待 i18n 收口。
- 2026-03-26：继续推进 Phase D（第四批）。新增 `slashCommand` 与 `colorPicker` i18n 契约，`SlashCommand` 改为可配置词条并由 `EditorCore` 注入；`color-picker` 的“预设颜色/自定义颜色”改为读取 i18n。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：仍有少量 legacy 硬编码文案（如 `VersionHistory` 核心类默认文案、部分扩展 placeholder）待下一轮收口。
- 2026-03-26：继续推进 Phase D（第五批）。新增 `commentExtension` 与 `versionHistoryCore` i18n 契约，清理 `Comment` 扩展和 `VersionHistoryManager` 的核心默认文案硬编码（默认作者、快速评论默认文本、初始/自动/手动/回滚快照标签、未知作者、空文档占位）；`EditorCore` 已完成注入接线。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：`ImageEnhanced` / `Callout` / `dialog` 组件仍有少量未国际化文案，后续继续。
- 2026-03-26：继续推进 Phase D（第六批）。完成 `ImageEnhanced`、`Callout`、`Dialog` 国际化收口：新增 `imageEnhanced/callout` 词条契约并在 `EditorCore` 注入扩展配置；图片标题栏按钮与 caption placeholder、Callout 类型标签与切换提示改为 i18n；弹窗组件新增 `closeAriaLabel` 并由插入链接/图片/版本历史弹窗透传。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。遗留：`upload-zone` 等少量组件仍有默认中文 fallback，可继续收口到统一词条。
- 2026-03-26：继续推进 Phase D（第七批）。清理 `upload-zone` 组件默认中文 fallback，改为中立英文文案（仍优先使用外部 i18n 传入）。验证：`@block-editor/editor` 构建通过。遗留：仍有部分历史/重复文件中的硬编码文案（如旧版 `BlockMultiSelectBar.ts`）可在后续清理或下线。
- 2026-03-26：继续推进 Phase H3（重复实现清理）。下线未被引用的旧版多选工具栏实现 `ui/menus/BlockMultiSelectBar.ts`，保留并统一使用 `ui/menus/block-multi-select-bar.ts`，减少重复维护面。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进 Phase B7（暗黑模式下拉一致性）。修复弹层主题继承：`ToolbarDropdown`、`ColorPicker`、`SlashMenu` 改为挂载到 overlay 容器（不再直接挂 `document.body`），避免脱离 `data-be-theme` 导致暗黑下拉发白；同时将 `code-block` 语言下拉改为主题变量色值，`TableBubbleMenu` 移除浅色强绑类。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进 Phase I/H4 文档收口。新增专题文档页：`reference/operation-bars.md`、`reference/layout-modules.md`、`reference/migration.md` 与 `guide/regression-checklist.md`，并更新 VitePress 导航与侧边栏；补充 docs-repo 启动/构建说明。验证：`docs-repo` 执行 `pnpm docs:build` 通过。状态更新：勾选 I5、H4、H1、H3 及“文档结构覆盖”验收项。
- 2026-03-26：继续推进 Phase H2 回归支撑。Playground 新增 `regression` 场景（`/scenes/regression`），预置评论/链接锚点/表格/块手柄验证内容，集中用于关键交互回归（H2.1-H2.5）手工检查；`ScenarioPage` 支持场景级 `initialContent`。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进 Phase F（模块化骨架）。新增 `ui/modules/contracts.ts`，定义 `EditorUIModuleDefinition`、`EditorUILayoutSchema`、`EditorUIRegion`、`EditorUIModuleId` 契约；`EditorUIRenderer` 接入模块挂载管线（toolbar/outline/commentPanel/tableBubbleMenu/blockMultiSelectBar 默认模块）与 `layoutSchema` 区域可见性/宽度/order 兼容层，并保留 `layoutBuilder` 旧用法。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
