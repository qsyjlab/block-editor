# 当前代办清单（唯一执行入口）

最后更新：2026-04-03  
状态：进行中  
维护规则：后续所有代办更新统一写在本页面。

## P0 图片交互与拖拽一致性收口（进行中）

来源：`docs/todo/history/image-interaction-dnd-todo.md`（历史来源，不再继续维护）

- [x] P0-1 固化复现脚本（3类问题：图片点击异常、预览样式异常、非图片块长按拖拽失败）。
- [x] P0-2 建立块类型拖拽矩阵（段落/标题/引用/代码块/列表/Callout/表格/图片）。
- [x] P0-3 输出并确认图片交互状态机（`idle -> selected -> toolbar-open -> preview-open`）。
- [x] P0-4 处理 caption 编辑与 block-handle 抢焦点/抢 hover 冲突。
- [x] P0-5 完成“长按拖拽阈值”规则（时间阈值 + 位移阈值）。
- [x] P0-6 统一拖拽落点反馈样式（段落/引用/代码块/表格等一致高亮）。
- [x] P0-7 统一拖拽结束清理（handle/drop-target/selection/ghost）。
- [x] P0-8 修复“拖拽后重复插入图片/文本”回归问题并稳定复现验证。
- [x] P0-9 补齐 e2e：图片点击状态机、预览弹层、长按拖拽矩阵、原生拖拽干扰防回归。
- [ ] P0-10 更新行为基准与评分卡（新增 H4 系列项）并完成一轮验收报告。

## P0 多选框选与工具栏一致性收口（进行中）

来源：2026-03-30 连续交互回归反馈（框选卡顿、选中态不一致、工具栏定位异常）

- [x] P0-M1 修复框选 `mouseup` 卡死主链路（降载：拖动仅画框、松手一次提交、全量重渲染剪枝）。
- [x] P0-M2 框选触发阈值化（单击不触发，拖动超过阈值才进入 marquee）。
- [x] P0-M3 框选高亮改为独立 overlay 层（不直接改正文块 class，减少重排风险）。
- [x] P0-M4 多选工具栏视觉统一（按钮风格与主工具栏一致，图标体系一致，保留“已选 N 块”）。
- [x] P0-M5 多选工具栏定位限制在编辑写入区（不漂到 header 顶部工具栏区域）。
- [x] P0-M6 框选坐标系改为容器局部坐标并补滚动/缩放重排（起始点一致，不随视口漂移）。
- [x] P0-M7 点击选中与框选选中样式统一为“竖线 + 浅底色”视觉语言。
- [x] P0-M8 回归验收补齐（playground 手工回放 + e2e 稳定性补强）。

## P0 查找替换能力（新增）

来源：2026-03-30 新需求

- [x] P0-FR1 实现“查找”面板（关键词输入、上一条/下一条、命中计数）。
- [x] P0-FR2 实现“替换”能力（替换当前、全部替换、保留撤销链）。
- [x] P0-FR3 支持命中定位与滚动跟随（跳转到命中文本并高亮当前命中）。
- [x] P0-FR4 补齐快捷键（`Cmd/Ctrl+F`、`Enter/Shift+Enter`、`Cmd/Ctrl+H` 可选）与 i18n 文案。
- [x] P0-FR5 补齐测试与文档（unit/e2e、usage/developer/call-chains）。
- [x] P0-FR6 修复交互回归（滚动贴顶定位稳定、输入时不抢焦点跳回编辑区）。

## P0 快捷键统一治理与演示页（新增）

来源：2026-03-30 新增需求（快捷键统一管理 + 文档体现 + 演示页面）

- [x] P0-SK1 盘点现有快捷键入口（Toolbar/Selection/Table/Comment/FindReplace/全局监听）并输出映射表。
- [x] P0-SK2 设计并落地快捷键注册中心（统一 schema：`id/scope/combo/when/action/priority/i18nKey`）。
- [x] P0-SK3 建立平台映射层（Mac `⌘` / Win `Ctrl`）并统一展示文案。
- [x] P0-SK4 建立冲突检测机制（注册冲突告警 + 文档化冲突白名单）。
- [x] P0-SK5 抽离统一快捷键执行分发（避免散落在各模块 `keydown` 里）。
- [x] P0-SK6 接入核心能力（撤销/重做/粗体/斜体/下划线/查找/替换）。
- [x] P0-SK7 接入块与选区能力（多选工具栏、删除、移动；块转换快捷键待下一轮补齐）。
- [x] P0-SK8 接入表格与评论能力（表格增行增列、评论面板快捷入口）。
- [x] P0-SK9 统一 tooltip 与菜单快捷键提示来源（Toolbar/Selection/Table 统一由 registry 回填）。
- [x] P0-SK10 新增 playground 快捷键演示页（路由独立，支持分类过滤、触发日志、平台切换）。
- [x] P0-SK11 为演示页补示例脚本（覆盖编辑/选区/表格/评论/查找替换）。
- [x] P0-SK12 补齐单测（注册/冲突/解析/焦点优先级）。
- [x] P0-SK13 补齐 e2e（输入框不抢焦点、弹层优先、按钮与快捷键一致性；已新增 H3.18，并在全量回归中通过）。
- [x] P0-SK14 更新使用文档（快捷键总览、场景示例、常见冲突处理）。
- [x] P0-SK15 更新开发文档（架构、调用链路、扩展方式、维护约束）。

## P0 列表选中与 Handle / Slash 视觉一致性（新增）

来源：2026-03-31 新反馈（列表包裹不完整、handle 僵硬、slash 菜单风格不一致）

- [x] P0-H1 修复有序/无序列表在节点选中时的完整包裹高亮（与普通块选中视觉对齐）。
- [x] P0-H2 重做 `block-handle` 视觉结构为“双段式”（块类型图标 + 九点拖拽 grip），并同步优化菜单观感。
- [x] P0-H3 统一 slash 菜单样式体系（卡片、选中态、图标容器、描述层级）到当前主题组件语言。
- [x] P0-H4 下拉菜单挂载与碰撞收口（`handle/slash` 挂载 `body`，增加视口边界避让，避免被容器裁切）。

## P0 布局系统收敛与场景菜单重构（新增）

来源：2026-04-02 新需求（完整预设布局 + 区域自由组合 + 自定义 layout + 场景菜单二级化）

- [x] P0-LY1 设计并落地 `layout` 单入口（兼容 `layoutBuilder/layoutSchema/plugins`）。
- [x] P0-LY2 新增布局预设（`default/minimal/editor-outline/editor-comment/editor-outline-comment`）。
- [x] P0-LY3 playground 菜单改为二级分组（布局预设 / 布局自定义 / 专项回归）。
- [x] P0-LY4 场景示例简化：默认、极简、模块化、插件化改用 `layout` 单入口。
- [x] P0-LY5 更新使用文档布局章节（配置说明 + 三段示例代码同步）。

## P0 Overlay/Tooltip 分组容器治理（新增）

来源：2026-04-02 追加需求（避免弹层直接散落挂载到 body）

- [x] P0-OV1 新增 `ui-layer-root` 基础设施，支持按类型分组挂载（tooltip/dropdown/modal/overlay）。
- [x] P0-OV2 接入主链路：`Tooltip`、`SlashCommand`、`BlockHandle`、`Dialog`。
- [x] P0-OV3 扫描剩余 `document.body` 挂载点并逐步迁移（FindReplace/TableBubble/ImagePreview/ColorPicker 等）。

## P1 全链路对标未收口项（未开始）

来源：`docs/todo/history/toolbar-benchmark-plan.md`（3.2 当前剩余缺口）

- [ ] P1-1 构建清零守护：持续保证 `pnpm -r build` 全绿（不引入新 TS 错误）。
- [ ] P1-2 类型生态稳定：第三方类型声明与版本持续对齐（Markdown/协作相关依赖重点关注）。
- [ ] P1-3 版本历史增强（diff 对比准确性、命名版本、冲突处理）。
- [ ] P1-4 评论与版本历史服务端化最小闭环（写入、查询、回放、失败兜底）。
- [ ] P1-5 协作后端接入与鉴权方案落地（基础架构、会话鉴权、最小可运行链路，低优先级）。
- [ ] P1-6 块链接体系增强（块引用预览、反向引用）。
- [ ] P1-7 Markdown 深度兼容与大文档性能优化（复杂嵌套映射 + 压测基线 + 优化项收口）。
- [ ] P1-8 UI 模块插件化收口（评论/大纲彻底外置插件，内核仅保留数据结构与事件）。
  - [x] P1-8.1 playground 新增“可插拔模块示例”场景（外部注入 outline/commentPanel）。
  - [x] P1-8.2 暴露外部控制与数据 API（评论控制器 + 评论数据订阅 + 大纲数据订阅）。
  - [x] P1-8.3 使用文档补齐（插件接入、外部抽屉评论、大纲订阅、控制器示例代码）。
  - [x] P1-8.4 新增“自定义评论区（完整功能）”场景（创建/筛选/回复/解决/重开/删除/定位）。
  - [x] P1-8.5 自定义评论区提炼为可复用插件工厂（场景页仅做装配，便于业务二次封装）。

## 执行顺序

1. 先完成 `P0-1 ~ P0-4`（明确行为边界和状态机）。
2. 再完成 `P0-5 ~ P0-8`（拖拽核心链路收口）。
3. 然后完成 `P0-9 ~ P0-10`（自动化与评分补齐）。
4. 再完成 `P0-M8`（多选链路回归补齐）。
5. 接着完成 `P0-SK1 ~ P0-SK5`（快捷键统一治理基建）。
6. 再推进 `P0-SK6 ~ P0-SK11`（模块接入 + 演示页落地）。
7. 然后完成 `P0-SK12 ~ P0-SK15`（测试与文档闭环）。
8. 再推进 `P1-1 ~ P1-2`（工程稳定性守护）。
9. 先推进 `P1-3 ~ P1-4`（版本历史准确性 + 服务端闭环预研）。
10. 最后推进 `P1-5 ~ P1-7`（协作后端与体验增强收口）。

## 执行规范入口

- [执行工作流标准](/developer/execution-workflow-standard)

## 执行日志

### 2026-03-28 16:30

- 任务ID：流程治理初始化
- 状态变更：todo -> done
- 代码改动：创建主 TODO，汇总未完成项目，定义执行工作流标准。
- 验证命令：结构整理类改动，无需构建验证。
- 验证结果：目录与文档创建完成。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮从 `P0-1` 开始推进。

### 2026-03-28 16:55

- 任务ID：流程标准文档重构
- 状态变更：doing -> done
- 代码改动：将执行标准重写为维护流程模板文档（目标定义/执行规则/阶段拆分/验收标准/执行顺序/行为项模板/执行日志模板）。
- 验证命令：`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/developer/execution-workflow-standard.md`
- 风险与待办：后续新需求统一按模板先产出 TODO 再开发。

### 2026-03-28 17:30

- 任务ID：P0 图片交互与预览体验收口（第一批）
- 状态变更：doing -> review
- 代码改动：修复图片点击选中链路与激活框范围；caption 临时关闭；预览弹层补滚轮缩放与拖拽平移；列表样式修正；样式拆分为 `styles/image.css` 与 `styles/list.css`。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter block-editor-playground build`、`pnpm --filter block-editor-playground test:e2e`
- 验证结果：通过（22/22、build 通过、e2e 39/39）。
- 文档更新：`docs/developer/call-chains.md`、`docs/usage/regression-checklist.md`、`docs/developer/theme-and-ui.md`
- 风险与待办：caption 为临时关闭策略，后续恢复需补回 e2e 与使用说明。

### 2026-03-28 18:05

- 任务ID：代办文档迁移到 docs
- 状态变更：doing -> done
- 代码改动：新增 docs 代办管理菜单；新增“当前代办清单”和“已执行代办清单”页面；补充两份已执行归档页；将执行流程标准和文档更新规范中的主清单路径切换到 docs。
- 验证命令：`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/.vitepress/config.mts`、`docs/todo/current.md`、`docs/todo/executed.md`、`docs/todo/history/*`、`docs/developer/execution-workflow-standard.md`、`docs/developer/doc-update-policy.md`
- 风险与待办：根目录旧 TODO 文件后续统一迁移并删除，仅保留 docs 入口。

### 2026-03-28 18:20

- 任务ID：历史待办整合与入口收口
- 状态变更：doing -> done
- 代码改动：将历史待办引用全部切换到 `docs/todo/history/*`；把 `toolbar-benchmark-plan` 剩余 7 项并入当前主清单 `P1`；删除根目录 `history-todo/` 与 `todo/` 遗留目录。
- 验证命令：`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`、`docs/todo/executed.md`、`docs/todo/history/*`、`docs/usage/behavior-benchmark.md`、`docs/usage/behavior-gap-analysis.md`、`docs/developer/call-chains.md`、`docs/developer/behavior-scorecard.md`
- 风险与待办：后续所有新需求与执行日志只更新 `docs/todo/current.md`，执行完成后同步到 `docs/todo/executed.md` 与对应 history 页。

### 2026-03-30 11:20

- 任务ID：P0-1~P0-4 首批执行
- 状态变更：doing -> done
- 代码改动：新增 P0 复现脚本与拖拽矩阵文档；补充图片交互状态机调用链路；将图片 caption 改为可配置开关（默认关闭），并在 caption 编辑态增加 block-handle 避让逻辑；拖拽专项场景扩展为 8 类块覆盖并开启 caption 专项回归。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter block-editor-playground test:e2e`、`pnpm --dir docs docs:build`
- 验证结果：通过（22/22、39/39、docs build 通过）。
- 文档更新：`docs/usage/regression-checklist.md`、`docs/developer/call-chains.md`、`docs/todo/current.md`
- 风险与待办：下一轮推进 `P0-5 ~ P0-8`（长按阈值、落点样式、拖拽结束清理、重复插入回归）。

### 2026-03-30 11:45

- 任务ID：P0-5~P0-8 拖拽链路收口
- 状态变更：doing -> done
- 代码改动：`block-handle` 增加长按拖拽阈值（180ms + 6px）；拖拽事件改 capture 监听并使用 `application/x-be-block-drag` 拦截默认 drop；补齐拖拽结束统一清理；统一落点高亮样式（背景/边框/高亮线）；拖拽专项场景覆盖保持 8 类块回放。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter block-editor-playground test:e2e`、`pnpm --dir docs docs:build`
- 验证结果：通过（22/22、39/39、docs build 通过）。
- 文档更新：`docs/usage/regression-checklist.md`、`docs/developer/call-chains.md`、`docs/todo/current.md`
- 风险与待办：下一轮推进 `P0-9 ~ P0-10`（e2e 增补 + 行为基准评分收口）。

### 2026-03-30 12:05

- 任务ID：多选框选与组拖拽能力增强
- 状态变更：doing -> done
- 代码改动：`BlockMultiSelect` 新增框选（gutter marquee）交互、`setBlockSelectionPositions` 与 `moveSelectedBlocksToTarget` 命令；`block-handle` 支持识别多选集合并拖拽整组选中块；补齐对应单测与 e2e（H3.17）。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter block-editor-playground test:e2e`、`pnpm --dir docs docs:build`
- 验证结果：通过（23/23、40/40、docs build 通过）。
- 文档更新：`docs/usage/regression-checklist.md`、`docs/developer/call-chains.md`、`docs/todo/current.md`
- 风险与待办：框选（marquee）目前先以手工回归为主，后续可补充更稳定的自动化断言。

### 2026-03-30 16:30

- 任务ID：P0-M1~P0-M3 框选稳定性止血
- 状态变更：doing -> done
- 代码改动：连续收敛 `BlockMultiSelect` 性能路径，修复“按住/松手卡死”；将框选激活改为阈值触发；框选高亮迁移为独立 overlay 层绘制，避免正文节点频繁改类。
- 验证命令：`pnpm --filter @block-editor/editor test`
- 验证结果：通过（23/23）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：`P0-M8` 需补 e2e 稳定性断言，当前以手工回归为主。

### 2026-03-30 16:40

- 任务ID：P0-M4~P0-M7 多选工具栏与选中态统一
- 状态变更：doing -> done
- 代码改动：多选工具栏按钮样式切换到主工具栏 `icon-btn` 体系并统一图标；工具栏定位限制在编辑区可视区域；框选坐标改为容器局部坐标并补滚动/resize 重排；点击选中与框选选中统一为“竖线 + 浅底色”视觉语言。
- 验证命令：`pnpm --filter @block-editor/editor test`
- 验证结果：通过（23/23）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：仍需一轮 playground 回归确认“长文档滚动 + 多选工具栏遮挡”边界场景。

### 2026-03-30 16:45

- 任务ID：新增查找替换需求入列（P0-FR）
- 状态变更：todo -> doing
- 代码改动：无（本次先更新代办与执行日志）。
- 验证命令：无（文档变更）。
- 验证结果：通过（`@block-editor/editor`、`block-editor-playground` 构建通过）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮按 `P0-FR1 -> P0-FR5` 顺序实现查找、替换与定位能力。

### 2026-03-30 17:10

- 任务ID：P0-FR1~P0-FR5 查找替换与定位能力落地
- 状态变更：doing -> done
- 代码改动：新增 `FindReplace` 扩展（匹配状态存储 + decorations 高亮）；新增 `FindReplacePanel`（查找/替换 UI、上一条/下一条、替换当前/全部替换、`Cmd/Ctrl+F` & `Cmd/Ctrl+H` & `Enter/Shift+Enter` & `Esc`）；工具栏新增“查找替换”按钮；补齐中英文 i18n 与样式。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter block-editor-playground build`
- 验证结果：通过（23/23，playground build 通过）。
- 文档更新：`docs/usage/regression-checklist.md`、`docs/developer/call-chains.md`、`docs/todo/current.md`
- 风险与待办：后续可补 e2e 用例覆盖“跨节点匹配/超长文档替换性能”边界。

### 2026-03-30 17:35

- 任务ID：P0-FR6 查找替换面板定位与焦点回归修复
- 状态变更：doing -> done
- 代码改动：`FindReplacePanel` 增加滚动容器锚点定位（随 scroll/resize 重算 top-right，稳定贴顶）；查找输入改为仅刷新匹配不抢焦点；面板事件拦截避免冒泡干扰编辑区输入；替换后仍保留命中定位能力。
- 验证命令：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过（editor build 通过，playground build 通过）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮补 e2e 场景（滚动贴顶 + 输入连续键入焦点稳定）避免回归。

### 2026-03-30 18:10

- 任务ID：快捷键统一治理计划建档
- 状态变更：todo -> doing
- 代码改动：新增快捷键专项计划，细化为 15 个执行项（统一注册、冲突检测、平台映射、演示页、测试与文档）；更新执行顺序。
- 验证命令：`pnpm --dir docs docs:build`
- 验证结果：通过（`@block-editor/editor`、`block-editor-playground` 构建通过）。
- 文档更新：`docs/todo/current.md`、`docs/developer/shortcut-governance-plan.md`
- 风险与待办：下一轮从 `P0-SK1` 开始执行并同步调用链路文档。

### 2026-03-31 10:15

- 任务ID：P0-SK1~P0-SK5 快捷键治理第一批落地
- 状态变更：doing -> done
- 代码改动：新增 `ShortcutRegistry` 与 `ShortcutManager`（统一注册、平台映射、冲突检测、统一分发）；`EditorUIRenderer` 接入快捷键分发根；迁移 `FindReplacePanel` 与 `BlockMultiSelectBar` 的全局键盘监听到注册中心；新增快捷键入口盘点文档。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter @block-editor/editor build`、`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/developer/shortcut-inventory.md`、`docs/developer/call-chains.md`、`docs/usage/regression-checklist.md`、`docs/todo/current.md`
- 风险与待办：`Toolbar/Dropdown/ImagePreview` 仍有局部 `keydown` 待迁移，下一轮推进 `P0-SK6~P0-SK9`。

### 2026-03-31 11:05

- 任务ID：oxlint 接入与代码修复
- 状态变更：doing -> done
- 代码改动：在 `@block-editor/editor` 安装 `oxlint`；新增根脚本与 editor 包脚本（`lint:oxlint` / `lint:oxlint:fix`）；执行 `oxlint --fix` 后手工修复 5 条告警（`async.ts` this-alias、`VersionHistory.ts` unused vars、`ToolbarItem.ts` catch unused）。
- 验证命令：`pnpm lint:oxlint:fix`、`pnpm --filter @block-editor/editor test`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过（oxlint 0 warnings / 0 errors，unit/build 全绿）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：目前 oxlint 仅覆盖 `packages/editor/src` 与 `apps/playground/src`；后续可扩展到其他 app 包。

### 2026-03-31 11:45

- 任务ID：根目录 ESLint + Prettier 迁移
- 状态变更：doing -> done
- 代码改动：根目录新增 `eslint.config.mjs`（flat config）与 `.prettierrc.json`、`.prettierignore`；根 `package.json` 替换 lint/format 脚本为 ESLint + Prettier；将 ESLint 相关依赖归并到根 `devDependencies`；移除 editor 包内 `oxlint` 脚本。
- 验证命令：`pnpm lint`
- 验证结果：通过（当前 0 error，15 warnings）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：当前 `pnpm` store 环境限制导致未补装 `vue-eslint-parser`，因此根 lint 先覆盖 `js/ts` 文件；待环境允许后补齐 `.vue` 文件 lint。

### 2026-03-31 15:20

- 任务ID：P0-SK6~P0-SK11 + 版本历史 diff 基线修复
- 状态变更：doing -> done
- 代码改动：`EditorCore` 新增默认快捷键统一注册（核心格式、列表、评论入口、多选删除/移动、表格增行增列）；新增 `/scenes/shortcuts` 场景页展示注册中心快捷键清单并支持按 scope 过滤；`VersionHistoryDialog` 统一详情/预览的 diff 基线解析，避免快照对比基线不一致。
- 验证命令：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build`
- 验证结果：通过（editor build、playground build、docs build 全绿；unit 26/26 通过）。
- 文档更新：`docs/usage/shortcuts.md`、`docs/developer/shortcut-inventory.md`、`docs/developer/call-chains.md`、`docs/usage/regression-checklist.md`、`docs/todo/current.md`
- 风险与待办：`P0-SK9/SK12/SK13` 仍未完成（tooltip/menu 提示单一来源、快捷键单测与 e2e）。

### 2026-03-31 20:35

- 任务ID：P0-SK9/SK12 收口 + P0-SK13 用例补充
- 状态变更：doing -> done（SK9/SK12） / doing -> review（SK13）
- 代码改动：新增快捷键提示回填层 `shortcut-hints`，顶部工具栏/选区工具栏/表格工具栏的按钮 shortcut 展示统一从 `ShortcutRegistry` 按 `command` 解析；补齐 `ShortcutManager` 命令映射能力与对应单测；新增 e2e 用例 `H3.18`（快捷键总览页清单展示 + `Cmd/Ctrl+B` 行为校验）。
- 验证命令：`pnpm --filter @block-editor/editor test`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build`、`pnpm --filter block-editor-playground exec vitest run --config vitest.e2e.config.ts -t "H3.18"`
- 验证结果：unit/build/docs 通过；e2e 在当前环境触发 `No available port found in range 4174-6174`（端口监听受限），待在可监听本地端口环境复跑。
- 文档更新：`docs/todo/current.md`
- 风险与待办：`P0-SK13` 保持进行中，待端口可用环境跑通并回填结果。

### 2026-03-31 22:30

- 任务ID：P0-H1~P0-H3 列表选中与 Handle / Slash 一致性改造
- 状态变更：doing -> done
- 代码改动：补齐 `li/ol/ul` 的选中包裹高亮样式；`block-handle` 改为“块类型图标 + 九点拖拽 grip”双段结构并按当前块类型动态切换图标；slash 菜单改为统一类样式（卡片化容器、选中态、图标槽位、标题/描述分层）。
- 验证命令：`pnpm exec prettier packages/editor/src/extensions/block-handle.ts packages/editor/src/extensions/SlashCommand.ts packages/editor/src/styles/index.css docs/todo/current.md --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：格式化与 build 通过（`@block-editor/editor`、`block-editor-playground`）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：需你在 playground 手工确认 handle 与 slash 是否达到目标图（图4/图6）细节；如需我继续贴近图稿可再做一轮微调。

### 2026-03-31 23:10

- 任务ID：P0-H4 菜单挂载与下拉统一重构
- 状态变更：doing -> done
- 代码改动：`slash` 菜单切换到 `DropdownMenu` 同源渲染（`createDropdownItem`）；`handle` 菜单挂载改为 `document.body` 并接入 `floating-ui` 自动定位/碰撞检测；统一 `dropdown-item` 的悬浮过渡、文本层级和图标结构，消除 `handle/slash/toolbar` 样式割裂。
- 验证命令：`pnpm exec prettier packages/editor/src/ui/components/DropdownMenu.ts packages/editor/src/extensions/SlashCommand.ts packages/editor/src/extensions/block-handle.ts packages/editor/src/styles/index.css --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：需你对照图3手工确认间距与行高细节，下一轮可继续做像素级对齐（分组标题、分区分隔、右箭头项样式）。

### 2026-03-31 23:40

- 任务ID：P0-H4.1 下拉漂移与 slash 定位修复
- 状态变更：doing -> done
- 代码改动：修复 `handle` 菜单打开后仍跟随鼠标切换锚点（开启菜单时冻结 handle 跟随）；修复 `slash` 菜单挂载到 `body` 后未固定定位导致位置异常（补 `position: fixed` + 视口内展示）；统一 `DropdownItem` 图标节点选取，保证菜单图标结构一致。
- 验证命令：`pnpm exec prettier packages/editor/src/extensions/block-handle.ts packages/editor/src/styles/index.css docs/todo/current.md --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过（`@block-editor/editor`、`block-editor-playground` 构建通过）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮继续像素级对齐图3（分组标题/右箭头子菜单样式/行高细节）。

### 2026-04-01 00:08

- 任务ID：P0-M9 多选框选触发原生文本选中修复
- 状态变更：doing -> done
- 代码改动：`BlockMultiSelect` 在框选起始/移动/结束阶段补 `preventDefault`，并在进入 marquee 态时清理浏览器原生 selection；增加 `html[data-be-marquee-selecting='1']` 全局 `user-select: none` 兜底，避免块框选出现蓝色文字选区。
- 验证命令：`pnpm exec prettier packages/editor/src/extensions/BlockMultiSelect.ts packages/editor/src/styles/index.css --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：后续可补 e2e 用例覆盖“连续框选 + 长文档滚动”下不触发原生文本选中。

### 2026-04-01 00:18

- 任务ID：P0-TB1 表格 handle 入口统一到 block-handle
- 状态变更：doing -> done
- 代码改动：`EditorCore` 移除 `TableHandle` 扩展挂载，统一由 `block-handle` 处理表格块入口；在 `block-handle` 点击链路中对表格块改为 `NodeSelection` 整表选中并切换 `block-selection`，避免跳到首个单元格与 table bubble 弹出。
- 验证命令：`pnpm exec prettier packages/editor/src/core/EditorCore.ts packages/editor/src/extensions/block-handle.ts packages/editor/src/extensions/TableHandle.ts --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮补回归 e2e（表格块 handle 点击后应整表选中且不展示 table bubble）。

### 2026-04-01 13:55

- 任务ID：P0-9 / P0-M8 / P0-SK13 回归 e2e 收口
- 状态变更：doing -> done
- 代码改动：更新 `regression.spec.ts` 的焦点与选区辅助函数（段落输入、拖选、表格单元格选区）稳定性；适配链接编辑入口为 `setLink`；适配“表格 handle 已并入 block-handle”新语义，新增断言“点击表格块 handle 后不弹 table bubble、不会落入首单元格编辑焦点”。
- 验证命令：`pnpm --filter block-editor-playground test:e2e`
- 验证结果：通过（41/41）。
- 文档更新：`docs/todo/current.md`
- 风险与待办：`P0-10`（行为基准与评分卡更新）仍待执行，建议作为下一步。

### 2026-04-01 14:25

- 任务ID：P1-8 UI 模块插件化（第一阶段）
- 状态变更：todo -> doing
- 代码改动：新增 `EditorUIPlugins` 对外插件接口（`outline/commentPanel`）；`EditorUIRenderer` 支持 `options.plugins` 注入并优先使用外部插件挂载；评论面板默认实现改为可被渲染器控制 `setVisible/focusThread`，渲染器内部只维护可见性状态与事件转发，不再强绑定固定实现。
- 验证命令：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：当前为第一阶段兼容改造，下一轮继续推进“默认 `CommentPanel` 事件订阅外移 + 插件示例页/文档 + e2e 插件接入回归”。

### 2026-04-01 14:38

- 任务ID：P1-8.1 可插拔模块示例场景
- 状态变更：doing -> done
- 代码改动：新增 playground 场景页 `pluginized-modules`，通过 `EditorUIRenderer.options.plugins` 注入外部 `outline/commentPanel` 插件示例；插件示例演示“外部挂载、外部渲染、外部定位跳转”，不改内置模块代码；同步更新路由与左侧场景导航入口。
- 验证命令：`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：后续补“插件接入文档（usage/developer）+ e2e 验收用例 + 插件生命周期约束”。

### 2026-04-01 14:52

- 任务ID：P1-8.2 插件外部数据与控制 API
- 状态变更：doing -> done
- 代码改动：`EditorUIRenderer` 新增 `getCommentPanelController()`（open/close/toggle/setVisible/focusThread/createFromSelection）；新增 `getOutlineData()/onOutlineDataChange()` 与 `getCommentThreads()/onCommentDataChange()`，支持外部布局（如抽屉）直接读取和订阅评论/大纲数据。
- 验证命令：`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮补“插件 API 文档示例 + 外部抽屉评论场景 demo + e2e 覆盖订阅链路”。

### 2026-04-02 10:40

- 任务ID：P1-8.3 可插拔模块使用文档补齐
- 状态变更：doing -> done
- 代码改动：新增 `/usage/pluginized-modules` 使用文档，补齐评论/大纲插件注入、外部抽屉评论、外部数据订阅、控制器调用等可复制示例；同步补充 `configuration/layout-modules/getting-started` 入口说明与跳转；VitePress 侧边栏新增“可插拔评论与大纲”菜单项。
- 验证命令：`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/usage/pluginized-modules.md`、`docs/usage/configuration.md`、`docs/usage/layout-modules.md`、`docs/usage/getting-started.md`、`docs/.vitepress/config.mts`、`docs/todo/current.md`
- 风险与待办：下一轮可补充“外部抽屉评论（Vue 组件版）”与“插件生命周期约束/内存释放”开发者文档。

### 2026-04-02 16:20

- 任务ID：P0-LY1~P0-LY5 + P0-OV1~P0-OV2
- 状态变更：todo -> done
- 代码改动：
  - `EditorUIRenderer` 新增 `layout` 单入口（`preset/builder/regions/modules/plugins`），并兼容旧 `layoutBuilder/layoutSchema/plugins`。
  - 新增布局预设：`default/minimal/editor-outline/editor-comment/editor-outline-comment`。
  - playground 左侧场景菜单改为二级分组（布局预设 / 布局自定义 / 专项回归）。
  - 默认/极简/模块化/可插拔场景改用 `layout` 单入口示例。
  - 新增 `ui-layer-root` 分组容器并接入 `Tooltip`、`SlashCommand`、`BlockHandle`、`Dialog`，避免散落直接挂载 body。
- 验证命令：`pnpm exec prettier <本轮改动文件> --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build`
- 验证结果：通过（editor/playground/docs 构建均通过）。
- 文档更新：`docs/usage/layout-modules.md`、`docs/usage/configuration.md`、`docs/usage/pluginized-modules.md`、`docs/todo/current.md`
- 风险与待办：`P0-OV3` 已完成主链路迁移；保留 `import/export/下载锚点/拖拽 ghost` 等非弹层用途的 `document.body` 使用。

### 2026-04-02 16:55

- 任务ID：P0-OV3 剩余挂载点分组迁移
- 状态变更：doing -> done
- 代码改动：
  - 迁移 `TableBubbleMenu`、`FindReplacePanel`、`ToolbarDropdown`、`Toolbar`、`ColorPicker`、`SelectionTooltip`、`BlockMultiSelectBar`、`Callout` 的 `document.body` fallback 到 `resolveUILayerHost` 分组容器。
  - `ImagePreviewModal` 改为挂载到 `modal` 分组容器（仍保留 `body overflow` 锁滚行为）。
  - 复核 `packages/editor/src` 直接 `document.body` 用法，仅保留非弹层类用途（导入文件 input、导出临时节点、下载锚点、拖拽 ghost）。
- 验证命令：`pnpm exec prettier <本轮改动文件> --write`、`pnpm --filter @block-editor/editor build`、`pnpm --filter block-editor-playground build`
- 验证结果：通过。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一轮可继续给 `ui-layer-root` 补可选调试开关（显示各分组边界）与 e2e 覆盖。

### 2026-04-02 17:30

- 任务ID：P1-8.4 自定义评论区完整场景
- 状态变更：todo -> done
- 代码改动：playground 新增 `/scenes/custom-comment-panel`，评论面板改为完全外部插件实现，覆盖评论创建（选区预填 + 输入内容）、线程筛选（全部/未解决/已解决）、回复、解决/重开、删除、跳转定位与 `focusThread` 联动。
- 验证命令：`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/usage/pluginized-modules.md`、`docs/usage/getting-started.md`、`docs/todo/current.md`
- 风险与待办：下一轮可把该场景抽成可复用模板（外置 UI 包）并补 e2e 用例覆盖。

### 2026-04-03 11:10

- 任务ID：P1-8.5 自定义评论区插件工厂化
- 状态变更：todo -> done
- 代码改动：新增 `createCustomCommentPanelPlugin` 工厂（选区预填、创建评论、筛选、回复、解决/重开、删除、锚点跳转、可见性控制、焦点定位）；`CustomCommentPanelScenePage` 改为只做 layout 装配与场景数据，不再内嵌大段挂载逻辑。
- 验证命令：`pnpm exec prettier apps/playground/src/scenes/plugins/createCustomCommentPanelPlugin.ts apps/playground/src/scenes/pages/CustomCommentPanelScenePage.vue docs/usage/pluginized-modules.md docs/todo/current.md --write`、`pnpm --filter block-editor-playground build`、`pnpm --dir docs docs:build`
- 验证结果：通过。
- 文档更新：`docs/usage/pluginized-modules.md`、`docs/todo/current.md`
- 风险与待办：后续可继续抽象为 NPM 可复用 UI 包（主题 token 与动作注入点分离）。
