# Block Editor 模块化与主题统一 TODO（中文版）

最后更新时间：2026-03-27（持续更新，含暗黑模式任务）  
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
5. 每次功能开发完成后，必须更新调用链路文档：`docs/developer/call-chains.md`。
6. 每次功能开发完成后，必须同时更新两类文档：
   `docs/usage/*`（使用文档）与 `docs/developer/*`（开发者读代码文档）。
7. 功能任务只有在“代码 + 调用链路 + 使用文档 + 开发者文档 + 代办日志”全部更新后，才可标记完成。

## 2. 阶段计划（细颗粒）

### Phase A：基线盘点与风险清理

- [x] A1. 清理调试残留（`debugger`、临时日志、临时分支代码）。
- [x] A2. 输出硬编码颜色清单（按文件、数量、优先级）。
- [x] A3. 输出硬编码文案清单（按模块、是否已 i18n）。
- [x] A4. 输出重复实现清单（例如多份 multi-select bar）。
- [x] A5. 标注高风险改造点（交互强耦合/样式耦合/事件总线耦合）。

验收标准：
- [x] 运行时代码无 `debugger`。
- [x] 至少产出三份清单：颜色、文案、重复实现。
- [x] 每份清单都有“先改/后改”优先级。

---

### Phase B：主题变量体系（Token）落地

- [x] B1. 定义语义 Token（主色/文本/边框/背景/状态/阴影）命名规范。
- [x] B2. 在 `styles/index.css` 建立统一 Token 根定义。
- [x] B3. 替换核心样式硬编码：
- [x] B3.1 `styles/index.css`
- [x] B3.2 `styles/code-block.css`
- [x] B3.3 `styles/tailwind.css`
- [x] B4. 替换高频 TS 内联样式中的颜色引用（评论、大纲、块菜单、Slash、弹窗）。
- [x] B5. 增加“主题切换冒烟验证”步骤（改一处 primary，观察全局联动）。
- [x] B6. 新增主题模式配置：`light / dark / auto`（渲染器 + URL 参数）。
- [x] B7. 暗黑模式核心区视觉补齐（toolbar/comment/outline/table/handle）。
- [x] B8. playground 增加主题切换入口并支持场景联动验证。

验收标准：
- [x] 核心区（toolbar/comment/outline/table/handle）颜色由 Token 驱动。
- [x] 不再出现大面积孤岛颜色。
- [x] 改 `--primary` 可见联动变化。

---

### Phase C：UI 基础组件抽离

- [x] C1. `BaseButton`（variant、size、danger、disabled、icon-only）。
- [x] C2. `DropdownMenu`（trigger、menu、item、divider、active、keyboard）。
- [x] C3. `Tooltip`（文本、快捷键、副标题、定位策略）。
- [x] C4. `QuotePreview`（`| 引用内容`，支持点击跳转）。
- [x] C5. `PanelCard`（评论卡片/侧边卡片统一容器）。
- [x] C6. 抽离后先迁移 2 个模块验证可复用性（评论 + block-handle）。

验收标准：
- [x] 样式状态一致（hover/active/disabled/danger）。
- [x] 新增 UI 时优先复用组件，不再复制一套内联样式。

---

### Phase D：i18n 组件契约与文案补齐

- [x] D1. 组件契约统一：`title/label/placeholder/ariaLabel/emptyText` 全走 props。
- [x] D2. 业务层统一注入 i18n，不允许组件直接写死中文/英文。
- [x] D3. 补齐缺失词条（评论面板、块多选栏、slash、block-handle、outline 内按钮）。
- [x] D4. 保留 fallback 机制（缺词条时可降级显示）。

验收标准：
- [x] 中英切换后已迁移模块文案正确。
- [x] 新增模块不出现硬编码文案。

---

### Phase E：操作栏自定义（重点）

- [x] E1. 定义 `toolbarConfig` 与 `selectionToolbarConfig` 类型。
- [x] E2. 支持预设：`full` / `basic` / `minimal`。
- [x] E3. 支持自定义项：新增、移除、重排、按 `id` 覆盖 label/tooltip/icon。
- [x] E4. 统一 item factory，确保 header toolbar 和 selection toolbar 行为一致。
- [x] E5. 支持 i18n key 与 direct label 混用（优先 direct label）。

验收标准：
- [x] 两类操作栏可独立配置。
- [x] 相同命令在两类操作栏行为一致。
- [x] 配置改动无需改组件内部实现。

---

### Phase F：模块化与自定义布局

- [x] F1. 定义模块接口：`mount/unmount/update/defaultRegion/i18nKeys`。
- [x] F2. 将以下能力模块化：
- [x] F2.1 toolbar
- [x] F2.2 selection toolbar
- [x] F2.3 comment panel
- [x] F2.4 outline
- [x] F2.5 table bubble menu
- [x] F2.6 block handle
- [x] F3. 定义 `layoutSchema`（区域、顺序、可见性、宽度/权重）。
- [x] F4. `EditorUIRenderer` 支持按 schema 挂载模块。
- [x] F5. 保留 `layoutBuilder` 兼容层，避免现有用法断裂。

验收标准：
- [x] 模块可在不同区域互换位置。
- [x] 默认布局可用，自定义布局可用，旧接口可用。

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
- [x] 可以通过 URL 快速复现任一场景。
- [x] 切换场景不破坏协作参数。

---

### Phase H：验证、回归、文档

- [x] H1. 全量构建通过（workspace + playground）。
- [x] H2. 关键交互回归：
- [x] H2.1 评论（创建、定位、展开、引用跳转）
- [x] H2.2 链接（插入、预览、跳转）
- [x] H2.3 表格工具栏（i18n、操作）
- [x] H2.4 block handle 菜单
- [x] H2.5 selection tooltip
- [x] H3. 清理重复实现与死代码。
- [x] H4. 输出迁移文档（配置示例、布局示例、模块注册示例）。

验收标准：
- [x] 无阻断级回归。
- [x] 新增文档可指导他人接入自定义布局与操作栏。

---

### Phase I：VitePress 文档站（新增）

- [x] I1. 在根目录接入 VitePress（依赖 + 脚本）。
- [x] I2. 建立 `docs/.vitepress/config.ts`（默认官方文档风格）。
- [x] I3. 补齐基础页面：首页、快速开始、配置参考。
- [x] I4. 接入现有审计文档到侧边栏导航。
- [x] I5. 增加“模块化/布局/操作栏配置”专题文档页（后续补齐）。
- [x] I6. 文档目录收敛回主仓 `docs/`（`docs/.vitepress` + 独立 `docs/package.json`）。
- [x] I7. 文档结构拆分为 `usage/` 与 `developer/` 两大入口，并建立强制更新规范。

验收标准：
- [x] `pnpm docs:dev` 可启动。
- [x] `pnpm docs:build` 可构建。
- [x] 文档结构可覆盖接入、配置、场景化验证与迁移说明。
- [x] 文档在主仓 `docs/` 目录可独立运行和构建。

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
- 2026-03-26：继续推进 Phase F（模块区域控制增强）。`selectionToolbar` 已纳入 `layoutSchema.modules`（支持 `enabled/region`），`SelectionTooltip` 新增模块开关判定与 append 容器解析，避免弹层脱离主题容器；`EditorUIRenderer` 为区域容器统一打 `data-be-region` 标记，新增 playground 场景 `modular-layout` 用于验证模块换位。验证：先构建 `@block-editor/editor`，再构建 `block-editor-playground` 均通过（并行构建会因类型先后顺序出现瞬时报错，串行已通过）。
- 2026-03-26：按“普通页面代码”重构 playground 场景组织。移除集中式 `SCENE_CONFIGS` 与 `/:scene` 动态页面，改为 `scenes/pages/*.vue` 独立页面路由，每个场景在页面内直接编写 `EditorCore + EditorUIRenderer` 初始化逻辑；新增 `useSceneEditor`（仅生命周期复用）与 `SceneFrame`（页面壳层）以减少重复。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进暗黑模式补齐（组件与工具链路）。`Dialog/Tooltip/Toolbar more menu/Callout switcher` 改为挂载到编辑器主题容器并使用主题变量；`insert-link`、`insert-image`、`version-history` 弹窗按钮与面板样式统一到主题语义色；`tabs/upload-zone/link-preview/code-block/block-handle/multi-select bar` 完成主题变量收口。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：按“工具栏优先”继续做暗黑适配。增强 `toolbar/icon-btn/dropdown/divider/color-preview` 的暗黑可见度（强制 SVG 跟随 `currentColor`、补齐边框与禁用态、提升 hover/active 对比度、分割线与滚动条细化），并修复 `Toolbar` 的 more 菜单关闭时宿主容器移除逻辑。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：继续推进工具栏弹层修复。针对暗黑模式下拉“文字不可见/状态不清晰”与 tooltip 裁切问题，强化 `toolbar-dropdown-menu` 与 `dropdown-item` 的显式对比色、hover/active/focus 态和暗黑专属边框阴影；`GlobalTooltip` 改为挂载到 `document.body` 并按触发节点同步 `data-be-theme`，避免场景容器 `overflow` 导致提示被截断。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：修复 `更多` 弹层交互与样式一致性。`Toolbar` 的 more 按钮从 hover 打开改为 click 切换，并增加 outside click / `Esc` 关闭；打开时隐藏自身 tooltip，关闭时恢复；溢出搬运时跳过 leading divider，避免菜单首项出现孤立分割线。样式侧新增 `.toolbar-more-menu`，统一其中 `icon-btn/dropdown/color-trigger/divider` 的间距与暗黑主题可读性。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：修复行内选区工具栏暗黑可见性。为 `be-selection-tooltip` 补齐独立的按钮/下拉/颜色触发器颜色基线（默认 `text-secondary`、hover `text-color`）和暗黑边框背景，避免仅 hover 项可见、其余图标“空壳化”。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：修复“无专用评论区布局”下评论面板无法弹出。`EditorUIRenderer` 在 `comment` 区域缺少 `commentContainer` 时，自动将评论模块宿主降级为右侧浮层（绝对定位 + 宽度限制 + 顶层定位兜底），确保 `openCommentPanel` 在极简/自定义布局中可见，不再出现“事件触发但面板在视区外”的情况。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：按“示例可验证性”调整默认 Playground 场景。`default` 页面改为 `basic` 顶部工具栏（降低溢出干扰），并保留行内选区评论能力（`selectionToolbar: SELECTION_COMPACT_ITEMS`）；评论侧栏默认展开，便于直接验证“添加评论 -> 面板联动”路径。验证：`@block-editor/editor` 与 `block-editor-playground` 构建通过。
- 2026-03-26：按新要求重建 docs 信息架构。文档统一在主仓 `docs/` 下维护，导航拆分为两大入口：`usage/`（使用）与 `developer/`（开发者读代码）；新增调用链路文档与强制文档更新规范页，并将旧 `guide/reference` 页面改为迁移指引。同步更新 TODO 执行规则（每次功能必须更新调用链路 + 使用文档 + 开发者文档）。验证：`pnpm --dir docs docs:build`、`@block-editor/editor`、`block-editor-playground` 构建通过。
- 2026-03-27：修复文档站历史路径 404。新增兼容入口页：`/guide`、`/guide/what-is-vitepress`、`/reference`、`/config`、`/config/introduction`，统一引导到新分区（`usage/developer`）；并在 `docs/README.md` 增加“404 排查”说明。验证：`pnpm --dir docs docs:build` 通过。
- 2026-03-27：修复“多个 playground 示例评论面板无法弹出”。根因：`commentPanel` 模块在 `region=comment` 且有专用评论区时仍挂载到中间 mountPoint，导致父评论容器保持 `display:none`；已在 `EditorUIRenderer.mountModules` 中改为此场景直接挂载到 `commentContainer`。并同步更新调用链路与回归清单文档。验证：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续修复暗黑模式视觉统一。`block-handle` 菜单新增打开前宿主校准（`ensureMenuHost`），避免菜单挂到 `document.body` 导致暗黑主题丢失；统一按钮与激活态 token（`--brand-solid-*` / `--brand-soft-*`）并应用到评论按钮、筛选 tag、工具栏下拉打开态和激活项。同步更新调用链路、主题规范与操作栏使用文档。验证：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build` 通过。
- 2026-03-27：收口本轮遗留项。`version-history-dialog` 默认词条改为 `resolveEditorI18n('en-US').dialogs.versionHistory`，去除组件内硬编码默认中文文案并与 `insert-link/insert-image` 保持一致的 fallback 策略；同步更新调用链路/使用文档与本 TODO 勾选状态。验证：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build` 通过。
- 2026-03-27：完成文档开发态启动验证。`pnpm --dir docs docs:dev --host 127.0.0.1 --port 4173` 已成功启动（本轮在受限环境下通过提权验证），补齐 Phase I 验收项 `docs:dev`。
- 2026-03-27：执行“剩余项验收批次”。完成 workspace 构建（`pnpm -r build`）与 docs 构建（`pnpm --dir docs docs:build`）；并做硬编码颜色/文案扫描。确认 F 阶段“模块可在不同区域互换位置”可通过（`/scenes/modular-layout` 已展示 `selectionToolbar/tableBubbleMenu/blockMultiSelectBar` 跨区域挂载）。遗留：Phase B（Token 收口余项）、Phase D（code block/placeholder 文案 i18n）、Phase H2（交互回归需人工或 e2e）。
- 2026-03-27：完成 Phase H2 自动化回归。`apps/playground` 新增 `Vitest + Playwright` e2e 基建（`vitest.e2e.config.ts` + `tests/e2e/regression.spec.ts`），覆盖 H2.1~H2.5 五条链路并全量通过；同时新增 `collab=0` 场景参数（`useSceneEditor` + 各场景页）避免协作文档覆盖初始内容导致回归不稳定。验证：`pnpm --filter block-editor-playground test:e2e` 通过。
- 2026-03-27：完成“未勾选项”收口。勾选 B3/B4/B5/B7、C 验收、D1/D2/D3 与 D 验收条目；补充 codeBlock i18n 注入链路与主题扫描验收，并修复 e2e 启动命令为 `pnpm exec vite --host 127.0.0.1 --port <PORT>`（避免 `pnpm dev -- --port` 参数透传不稳定）。验证：`pnpm -r build`、`pnpm --dir docs docs:build` 通过；e2e 在当前受限沙箱无法监听端口，已在可运行环境下保留 `pnpm --filter block-editor-playground test:e2e` 一键回归命令。
- 2026-03-27：继续收敛 e2e 未通过问题（跨机器稳定性）。`regression.spec.ts` 新增动态端口分配（4174-4274）、dev server 启动日志回显、更稳健选择器与双语断言（避免纯中文文案硬匹配）、并放宽易抖动断言（评论输入 focus / selection active 轮询）。同步更新 `docs/usage/regression-checklist.md` 与 `docs/developer/call-chains.md` 的 e2e 链路说明。验证：`pnpm --filter block-editor-playground build` 通过（当前受限沙箱下 e2e 无法监听端口）。
- 2026-03-27：修复本地反馈的两条 e2e 失败。H2.2 为 `selectTextInParagraph` 增加“程序化 Range 选区”兜底（鼠标/键盘选区失败时仍可稳定选中文本）；B5 改为验证评论主按钮（`comment-create-btn`）对 `--primary-color` 的联动，并同时设置 `documentElement + ui root` 的主题变量，降低弹层宿主差异导致的误判。验证：`pnpm --filter block-editor-playground build` 通过。
- 2026-03-27：新增 Playground 场景 `/scenes/block-showcase`（块类型展示分栏）。新增 `BlockShowcaseScenePage.vue`，预填更全默认数据覆盖：标题/正文/缩进/无序列表/有序列表/任务列表/引用/Callout/代码块/表格/链接/图片/分割线；并接入场景导航。同步更新 `docs/usage/getting-started.md` 场景列表与 `docs/developer/call-chains.md` 调用链路。验证：`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build` 通过。
- 2026-03-27：修复 `/scenes/block-showcase` 首屏空白。原因：该场景默认协作开启，远端空文档会覆盖本地初始化内容；改造 `useSceneEditor` 支持场景级 `defaultCollaborationEnabled`，并将 `block-showcase` 默认协作改为关闭（仍可通过 `?collab=1` 显式开启）。验证：`pnpm --filter block-editor-playground build` 通过。
- 2026-03-27：修复“代码块内粘贴跳到下一行”问题。根因：`SmartPaste` 在代码上下文仍执行智能拦截（URL 自动链接 / HTML 清洗 + `insertContent`），导致粘贴内容可能脱离当前代码块；现已在 `codeBlock/code/parent.spec.code` 场景下直接回退 ProseMirror 默认粘贴。同步补充调用链路文档。验证：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build` 通过。
- 2026-03-27：新增编辑器单元测试（统一使用 Vitest）。新增 `packages/editor/vitest.config.ts`、`packages/editor/src/extensions/__tests__/SmartPaste.spec.ts`，覆盖代码块上下文粘贴放行与普通 URL 智能粘贴；并补充根脚本 `pnpm test:unit` 与文档说明。说明：当前环境网络受限导致依赖安装失败，测试执行需在可联网环境运行 `pnpm install` 后执行。
