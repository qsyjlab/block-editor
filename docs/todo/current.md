# 导出与复制一致性专项 TODO

最后更新时间：2026-09-14
负责人：Codex / 项目协作
当前状态：进行中

> 维护说明：此前 `docs/todo/current.md` 中的历史长清单已归档至 `docs/todo/history/current-before-export-copy-reset-2026-05-27.md`，从本轮开始废弃。后续执行请只维护本文件。
> 执行依据：`docs/developer/execution-workflow-standard.md`。

## 0. 目标定义

1. 统一编辑器内显示、复制、Markdown 导出、PDF 导出之间的结构与样式行为。
2. 修复 Markdown 导出中表格被识别/输出为代码片段的问题，保证表格按 Markdown GFM 表格导出。
3. 修复 PDF 导出为空白的问题，确保导出内容与编辑器正文一致且可读。
4. 建立导入/复制/导出专项验收样本和回归流程，避免后续改 UI 或插件化时再次破坏导出链路。
5. 对齐飞书表格与 block handle 交互：纯文本块类型独立、表格内部不误触发普通工具栏、表格级菜单支持行列操作、表格后可继续输入。

## 1. 执行规则

1. 先复现并记录，不直接改核心导出逻辑。
2. 每个问题都要同时比对四条链路：编辑器显示、复制到外部、Markdown 导出、PDF 导出。
3. Markdown 导出以结构保真优先，样式降级可接受，但不能把表格、标题、列表、Callout 错误导成代码块。
4. PDF 导出以视觉可读优先，必须包含正文内容，不能出现空白页或白色文字不可见。
5. 每次修复后必须补最小回归：单测优先覆盖序列化逻辑，必要时补 playground 手工验收步骤。
6. 未跑验证前不得标记 done；遇到浏览器/环境限制时标记 blocked，并写清替代验证方式。
7. 新发现的交互问题必须先登记到本 TODO 的阶段计划和问题记录，再开始改代码。

## 2. 阶段计划

### Phase A：问题复现与差异矩阵

- [x] A1 建立导出专项复现样本，覆盖标题、分割线、表格、列表、Callout、代码块、图片、链接、缩进段落。
  - 已落地：`packages/editor/src/export/__tests__/markdown-export.spec.ts`（标题/表格/空单元格/Callout/代码块/待办/分割线）与 `apps/playground/tests/e2e/export-consistency.spec.ts` 的 SAMPLE_CONTENT（标题/表格/空单元格/待办/段落）。
- [x] A2 记录当前四链路行为：编辑器显示、复制到外部、Markdown 导出、PDF 导出。
  - 已记录链路：编辑器显示（人工路径不变）、Markdown 导出（单测+e2e 输出断言）、PDF 导出（e2e 下载文件字节校验）、再导入（单测+e2e）。复制到外部链路归 Phase D，尚未自动化。
- [x] A3 对用户反馈样例建立专项记录：表格导出为代码片段、PDF 空白、复制与导出样式不一致。
  - 见问题记录 EXP-001/002/003，根因与复现均已写入执行日志。
- [x] A4 明确“复制”和“导出”的目标差异：复制允许带 HTML 样式，Markdown 导出必须结构化纯文本，PDF 导出必须接近编辑器视觉。

验收标准：

- [x] 每个 P0 问题都有复现步骤、输入样本、当前输出、期望输出。
- [x] 差异矩阵可直接指导后续修复，不依赖截图口头描述。

### Phase B：Markdown 导出链路修复

- [x] B1 排查 `Exporter.toMarkdownText`、`transformCalloutToMarkdownFriendlyHtml`、Turndown/GFM 插件配置与表格序列化顺序。
  - 根因（EXP-001）：① ProseMirror 表格输出带 `colgroup`、`colspan="1"/rowspan="1"` 属性和单元格内块级 `<p>`，turndown-plugin-gfm 匹配不到自己的 table 规则，整表降级为原始 HTML 透传（Markdown 阅读器/粘贴到外部时呈现为代码块）；② 任务列表 checkbox 嵌套在 `<label>` 内、内容包在 `<div><p>` 中，gfm 的 taskListItems 规则只识别 `li > input` 直连形状，勾选框被丢弃。
- [x] B2 修复表格被导出为代码片段的问题，确保 `<table>` 输出为 GFM Markdown 表格。
  - 修复：`utils/serializer.ts` 新增导出前规范化管线 `transformHtmlForMarkdownExport`（表格扁平化：剥 colgroup、剥 =1 的 colspan/rowspan、无表头首行升为表头、单元格块级内容拍平；任务列表重排为 `li > input + 行内内容`；callout marker 反转义）。真实跨度 >1 或嵌套表格时整表保留原始 HTML（结构无损降级）。
- [x] B3 对标题、分割线、链接、任务列表、缩进段落、Callout 做导出回归。
- [x] B4 补充 Markdown 导出单测，至少覆盖“连续标题 + 表格”“表格空单元格”“Callout + 表格相邻”。

验收标准：

- [x] 用户截图中的表格导出后不再进入 fenced code block。
- [x] 导出的 Markdown 再导入后，表格仍是表格节点。
- [x] `pnpm --filter @block-editor/editor test -- Markdown` 或对应新增测试通过。

### Phase C：PDF 导出链路修复

- [x] C1 排查 PDF 导出使用的克隆节点、样式注入、排除选择器和 html2pdf 配置。
  - 根因（EXP-002）：html2pdf 0.14 的 `toContainer` 会把源元素深克隆进自己的容器并按文档流高度测量；旧实现把 `position: fixed + transform: translateX(-200vw)` 的导出根直接交给 html2pdf，克隆脱离文档流导致容器高度塌缩为 0 → canvas 高度 0 → PDF 整页空白。
- [x] C2 修复 PDF 导出空白，重点检查白色文字、透明内容、隐藏容器、错误移除正文节点。
  - 修复：`Exporter.createPdfExportElement` 改为两层结构——外层 `exportRoot`（absolute + 负偏移，仅对用户不可见），内层 `paper`（文档流内普通块）作为交给 html2pdf 的真正源元素。
- [x] C3 为导出克隆节点补充稳定的打印/PDF 样式，避免选中态、handle、侧栏、评论区污染导出。
  - 既有 `PDF_EXCLUDE_SELECTOR` + oklch 清洗保持并经 e2e 验证。
- [x] C4 增加降级策略：html2pdf 失败时可提示并保留浏览器打印兜底。
  - 既有实现（alert + print fallback），未改动。

验收标准：

- [x] PDF 导出包含正文标题、表格和普通段落。
- [x] PDF 中不出现 block handle、工具栏、侧栏、选中态背景。
- [x] PDF 内容颜色可读，不出现白字白底或整页空白。

### Phase D：复制行为与导出行为对齐

- [ ] D1 梳理复制链路：浏览器原生复制、编辑器选区复制、块复制、代码块复制。
- [ ] D2 明确复制输出策略：`text/html` 保留基础视觉，`text/plain` 保留 Markdown 可读结构。
- [ ] D3 修复复制后外部粘贴与 Markdown 导出结构差异过大的问题。
- [ ] D4 补充手工验收脚本：复制到飞书、语雀、普通 Markdown 编辑器。

验收标准：

- [ ] 同一份文档复制到外部后，标题/表格/列表结构仍可读。
- [ ] 复制与 Markdown 导出允许样式差异，但结构语义不能冲突。

### Phase E：回归与文档收口

- [ ] E1 更新 `docs/usage/format-compatibility-sample.md`，补充导出专项样例和验收记录。
- [ ] E2 更新 `docs/developer/call-chains.md`，补充复制/Markdown/PDF 导出调用链路。
- [ ] E3 补充导出专项回归命令和手工验收步骤。
- [ ] E4 完成一轮验收记录：通过项、失败项、剩余风险。

验收标准：

- [ ] 文档中能直接找到“如何验证导出/复制一致性”。
- [ ] 当前 TODO 执行日志记录完整。
- [ ] 相关 build/test 通过。

### Phase F：表格与 Block Handle 交互对齐飞书

- [x] F1 纯文本块使用独立 paragraph 类型图标，不再复用无序列表图标。
- [x] F2 表格单元格点击只进入单元格编辑/选区状态，不直接弹出普通文本工具栏。
- [ ] F3 表格内部段落 hover/handle 行为与普通行分层：单元格内编辑走文本/表格工具栏，表格左侧 handle 走表格级操作。
- [ ] F4 表格级 handle 菜单对齐飞书 2-6 图：包含同步块/缩进/剪切/复制/删除/分享/保存模板/复制链接、标题行/标题列/均分列宽、在下方添加等可扩展入口。
- [ ] F5 表格行列插入反馈对齐飞书：显示行/列插入位置，不误触发普通 block 菜单。
- [x] F6 插入或转换成表格后，表格后方必须保留可输入区域，可继续插入普通段落。

飞书表格行为拆解：

- [ ] F7 单击单元格：只进入单元格编辑态，保留 caret，不主动弹出顶部 table toolbar 或普通文本 toolbar。
- [ ] F8 选中单元格文本：显示文本格式工具栏；工具栏内容以文本格式为主，不展示整表操作项。
- [ ] F9 选中单元格 / 多单元格：显示表格编辑工具栏，包含合并/拆分、背景色、文本样式、对齐、删除等表格上下文能力。
- [x] F10 hover 表格边缘：显示行/列插入控制点；列插入显示竖向蓝线和“插入列”提示，行插入显示横向蓝线和“插入行”提示。
- [x] F11 点击行/列插入控制点：在对应位置插入行/列，插入反馈不触发 block-handle 普通菜单。
- [ ] F12 点击表格左侧 block-handle：选中整表并打开表格级菜单；菜单不得把当前焦点落到首个单元格。
- [ ] F13 表格级菜单：第一组为同步块/缩进，第二组为剪切/复制/删除，第三组为分享/保存为模板/复制链接，第四组为标题行/标题列/均分列宽，第五组为“在下方添加”。
- [ ] F14 表格后续输入：表格下方始终存在可点击空白段落；从表格最后一个单元格继续输入时能自然跳出到表格后。
- [x] F15 表格行/列一侧热区块用于选择行/列，热区块之间的交点/边界才显示插入行/列 trigger，二者视觉与行为不得混用。
- [ ] F16 行/列选择热区应支持更完整的表格区域选择状态，后续对齐飞书多单元格选区和批量操作工具栏。

验收标准：

- [ ] 普通正文块 handle 显示文本类型图标，不显示无序列表图标。
- [ ] 点击表格单元格不会立即弹出普通行内工具栏；选中文本时才出现文本格式工具栏。
- [ ] 表格左侧 handle 可打开表格级菜单，表格内部段落不会抢走表格级操作。
- [ ] 新建表格后光标可移动到表格后方空行继续输入。
- [ ] 行/列插入控制点可见，且插入反馈线与飞书截图一致：列为竖线、行为横线。
- [ ] 整表菜单和单元格编辑工具栏分层清晰，不互相抢焦点。

## 3. 当前优先顺序

1. Phase A：先建立复现样本和四链路差异矩阵。
2. Phase B：优先修复 Markdown 表格导出为代码片段。
3. Phase C：修复 PDF 导出空白。
4. Phase D：处理复制与导出结构一致性。
5. Phase F：先收口表格与 block handle 的 P0 交互问题。
6. Phase E：补文档、测试和验收记录。

## 4. 基准行为项模板

```md
- 行为ID：EXP-001
- 优先级：P0/P1/P2
- 分类：复制 / Markdown 导出 / PDF 导出 / 再导入
- 对标来源：飞书 / 语雀 / Markdown 编辑器 / 浏览器 PDF
- 触发步骤：
- 标准预期：
- 当前行为：
- 差异结论：符合 / 可接受 / 不符合
- 风险等级：Critical / High / Medium / Low
- 修复建议：
- 测试覆盖：单测ID / e2e用例ID / 手工验收项
- 证据：截图路径 / 导出文件 / 控制台日志
```

## 5. 初始问题记录

| 行为ID | 优先级 | 问题 | 当前表现 | 期望 |
| --- | --- | --- | --- | --- |
| EXP-001 | P0 | Markdown 表格导出异常 | 已修复（2026-09-14）：表格按 GFM 导出，任务列表勾选框保留；真实合并单元格/嵌套表格保留原始 HTML（结构无损降级） | 导出为 GFM Markdown 表格 |
| EXP-002 | P0 | PDF 导出空白 | 已修复（2026-09-14）：e2e 下载校验 PDF 含 DCTDecode 渲染图像流且体积正常 | PDF 包含正文、表格、标题且颜色可读 |
| EXP-003 | P0 | 复制与导出样式行为不一致 | 未处理：编辑器显示、复制、导出结果差异大 | 允许样式降级，但结构语义一致 |
| EXP-004 | P1 | 导出与再导入缺少闭环验证 | 已修复（2026-09-14）：单测+e2e 均覆盖 Markdown 导出→再导入后表格仍为表格节点 | 建立 Markdown 导出后再导入回归 |
| BHI-001 | P0 | 纯文本块类型图标错误 | 已修复（2026-05-27）：paragraph 独立图标 | 已改为独立正文/文本图标 |
| BHI-002 | P0 | 表格单元格点击误弹普通工具栏 | 点击单元格即出现普通文本工具栏 | 已限制空选区点击不弹表格工具栏，文本选区才弹工具栏 |
| BHI-003 | P0 | 表格内部无法呼出与普通行一致的 block-handle 行为 | 表格内部段落和表格级 handle 行为混杂 | 表格内部编辑与表格级 handle 分层 |
| BHI-004 | P0 | 表格后无法继续插入内容 | 表格后没有稳定可输入区域 | 已让插入/转换表格后保留后续空段落 |
| BHI-005 | P1 | 表格行列插入交互缺少飞书式反馈 | 行列插入位置不清晰或误触菜单 | 显示明确行/列插入位置和表格级菜单入口 |
| BHI-006 | P0 | 表格单元格/文本/整表状态未分层 | 单击、文本选择、单元格选择、整表选择容易触发同一套工具栏 | 单元格编辑、文本 toolbar、表格 toolbar、整表菜单分别触发 |
| BHI-007 | P0 | 表格级菜单缺少飞书 2-6 图中的分组能力 | 当前表格 handle 菜单仍偏普通块操作 | 表格级菜单按同步块/缩进、剪切复制删除、分享模板链接、标题行列/均分列宽、在下方添加分组 |
| BHI-008 | P1 | 表格行列插入控制点缺失或反馈不完整 | hover 时无法清晰看到插入行/列位置 | 已实现表格外沿 trigger 区域、蓝色行列反馈线和 tooltip |
| BHI-009 | P0 | 表格热区与插入 trigger 概念混用 | 原实现把点/边缘/插入 trigger 混为一套交互 | 行列侧边热区负责选择，热区交点/边界负责插入 |

## 6. 执行日志

### 2026-05-27

- 任务ID：导出与复制一致性专项初始化
- 状态变更：todo -> doing
- 代码改动：无，本次仅重建当前 TODO。
- 验证命令：无，文档变更。
- 验证结果：待后续执行。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一步从 Phase A 开始复现并记录 Markdown 表格导出、PDF 空白、复制/导出差异。

### 2026-05-27 表格与 Block Handle 交互登记

- 任务ID：BHI-001 ~ BHI-005
- 状态变更：todo -> doing
- 功能点分析：本轮先处理纯文本块图标、表格单元格点击不误弹普通工具栏、表格级与单元格内 handle 分层、表格后续可输入区域；飞书式行列插入反馈和完整表格级菜单作为同阶段后续扩展。
- 代码改动：待执行。
- 验证命令：待执行。
- 验证结果：待执行。
- 文档更新：`docs/todo/current.md`
- 风险与待办：需要避免表格内部 paragraph 被误当作顶层 block，同时不能破坏表格选择、行列操作和文本选区工具栏。

### 2026-05-27 表格与 Block Handle 第一批修复

- 任务ID：BHI-001 / BHI-002 / BHI-004
- 状态变更：doing -> review
- 代码改动：
  - `packages/editor/src/extensions/block-handle.ts`：paragraph handle 图标改为独立 `T` 类型，不再复用无序列表图标。
  - `packages/editor/src/ui/menus/TableBubbleMenu.ts`：表格内空选区点击不再直接显示表格工具栏，保留单元格编辑状态。
  - `packages/editor/src/ui/features/block-features.ts`：插入/转换表格时补一个 trailing paragraph，保证表格后方有可输入区域。
- 验证命令：
  - `pnpm --filter block-editor-playground build`
  - `pnpm --filter @block-editor/editor test -- BlockMultiSelect SmartPaste`
- 验证结果：
  - playground build 通过。
  - editor 局部测试未跑通：当前环境缺少 `postcss-import`，Vitest 加载 `packages/editor/postcss.config.js` 时失败，未进入用例执行。
- 文档更新：`docs/todo/current.md`
- 风险与待办：F3/F4/F5 仍需继续对齐飞书表格级菜单、行列插入反馈和表格内部/表格级 handle 分层。

### 2026-05-27 飞书表格行为标准补充

- 任务ID：BHI-006 / BHI-007 / BHI-008
- 状态变更：todo -> doing
- 功能点分析：
  - 飞书表格至少分四层状态：单元格编辑、文本选区工具栏、单元格/区域表格工具栏、整表 block-handle 菜单。
  - 单击单元格不等于选中整表，也不应该直接弹普通文本 toolbar。
  - 行/列插入是表格边缘 hover 控制点行为，不应该复用普通 block 插入逻辑。
  - 整表菜单是表格级能力集合，和普通段落转换菜单需要分开。
- 代码改动：待执行。
- 验证命令：待执行。
- 验证结果：待执行。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一批优先做整表菜单分组和行列插入控制点，避免继续堆叠在普通 block-handle 菜单中。

### 2026-05-27 飞书表格 trigger 区域第一版

- 任务ID：BHI-008 / F10 / F11
- 状态变更：doing -> review
- 代码改动：
  - `packages/editor/src/extensions/block-handle.ts`：表格行/列插入触发从“单元格边缘”改为“表格外沿 trigger 区域”，顶部按列边界命中，左侧按行边界命中。
  - `packages/editor/src/extensions/block-handle.ts`：点击 `+` 控制点后，根据当前 trigger 执行 `addColumnBefore/After` 或 `addRowBefore/After`。
  - `packages/editor/src/styles/index.css`：新增飞书式插入按钮、蓝色反馈线和 tooltip 样式。
- 验证命令：`pnpm --filter block-editor-playground build`
- 验证结果：通过；仅有既有 chunk size 和 turndown 动态/静态混用警告。
- 文档更新：`docs/todo/current.md`
- 风险与待办：当前是触发区域第一版，后续还需要根据手工视觉反馈微调 trigger 点密度、圆点位置和 hover 热区大小。

### 2026-05-27 表格 trigger 热区与编辑态收口

- 任务ID：BHI-006 / BHI-008
- 状态变更：doing -> review
- 代码改动：
  - `packages/editor/src/extensions/block-handle.ts`：插入列 trigger 改为顶部外沿整条带状热区，列边界吸附阈值从 30px 放宽到 60px，降低 hover 点不到的问题。
  - `packages/editor/src/extensions/block-handle.ts`：新增顶部/左侧透明 trigger layer，显示飞书式表格外沿可操作区域。
  - `packages/editor/src/extensions/TableHandle.ts`：单元格 caret 编辑态不再自动给整表加选中高亮；仅整表 NodeSelection 或 block-selection 场景保留整表选中态。
  - `packages/editor/src/styles/index.css`：补充 trigger layer 视觉样式。
- 验证命令：`pnpm --filter block-editor-playground build`
- 验证结果：通过；仅有既有 chunk size 和 turndown 动态/静态混用警告。
- 文档更新：`docs/todo/current.md`
- 风险与待办：下一步继续调表格级菜单视觉和单元格/区域选择工具栏，进一步对齐飞书表格。

### 2026-05-27 表格热区逻辑修正（仅 block-handle，未改工具栏）

- 任务ID：BHI-009 / F15 / F16
- 代码改动：
  - `block-handle.ts`：热区优先于插入 trigger；插入仅在列/行热区边界邻域；点击热区后列头蓝条 + 整列/整行蒙层。
  - `index.css`：热区 hover/选区视觉与飞书列选样式。
- 验证命令：`pnpm --filter block-editor-playground build`

### 2026-05-27 表格热区与插入 trigger 语义修正

- 任务ID：BHI-009 / F15
- 状态变更：todo -> review
- 功能点分析：
  - 表格一侧的点位/热区不是插入入口，而是行/列选择入口。
  - 插入行/列入口位于相邻热区块之间的交点/边界，触发后才显示 `+`、tooltip 和蓝色插入线。
  - 行/列选择背景、热区蓝色焦点线、插入蓝线必须拆分，避免 hover 时误选或误插入。
- 代码改动：
  - `packages/editor/src/extensions/block-handle.ts`：拆分行/列选择热区与插入 trigger；热区 hover 只高亮对应行/列，靠近热区边界才显示插入行/列 affordance。
  - `packages/editor/src/styles/index.css`：新增热区块、行/列选择态和插入态的独立样式；插入列恢复为竖向蓝线，插入按钮缩小。
- 验证命令：`pnpm --filter block-editor-playground build`
- 验证结果：通过；仅有既有 chunk size 和 turndown 动态/静态混用警告。
- 文档更新：`docs/todo/current.md`
- 风险与待办：F16 仍需继续做真正的表格区域选择与批量操作 toolbar，对齐飞书多单元格选择状态。

### 2026-09-14 导出一致性 Phase A/B/C 修复（EXP-001 / EXP-002 / EXP-004）

- 任务ID：A1-A4 / B1-B4 / C1-C4 / EXP-001 / EXP-002 / EXP-004
- 状态变更：todo -> review（Phase D/F 未动，优先顺序不变）
- 功能点分析：
  - EXP-001：ProseMirror 表格 HTML（colgroup、colspan="1"、单元格内 `<p>`）与任务列表 HTML（checkbox 嵌套在 label 内、内容包在 div>p 中）都不符合 turndown-plugin-gfm 的匹配形状，整表降级为原始 HTML 透传、勾选框丢失。
  - EXP-002：html2pdf 0.14 的 `toContainer` 深克隆源元素并按文档流高度测量；旧的 fixed+transform 导出根克隆后高度塌缩为 0，canvas 高度 0，PDF 空白。
  - 附带发现：`Exporter` 与 `utils/serializer.ts` 存在两份相同的 callout/indent 预处理实现（也是构建警告中 turndown 动/静态混用的来源）。
- 代码改动：
  - `packages/editor/src/utils/serializer.ts`：新增统一导出规范化管线 `transformHtmlForMarkdownExport`（表格扁平化 + 任务列表重排 + callout marker 反转义 + 缩进前缀），新增 `editorToMarkdown`（turndown + gfm + hr='---'），`toMarkdown` 复用。
  - `packages/editor/src/export/Exporter.ts`：`toMarkdownText` 委托 `editorToMarkdown`，删除重复实现；`createPdfExportElement` 改为「absolute 屏外壳 + 文档流内 paper」两层结构，paper 作为 html2pdf 的源元素。
  - `packages/editor/src/export/__tests__/markdown-export.spec.ts`：新增（jsdom 环境，6 个用例，含导出→再导入闭环）。
  - `packages/editor/src/package.json`：新增 devDependency `jsdom@24.1.3`（Node 18 兼容；jsdom 25+ 需要 Node 20+）。
  - `apps/playground/tests/e2e/export-consistency.spec.ts`：新增导出专项 e2e（EXP-001/002/004 三用例，真实浏览器下载 PDF 校验字节）。
  - `apps/playground/tests/e2e/regression.spec.ts`：修复 Windows 下 `spawn('pnpm')` ENOENT（改用 node 直启 vite.js），浏览器启动回退到系统 Edge/Chrome。
  - `apps/playground/src/scenes/useSceneEditor.ts`：新增 `window.__blockEditor` 调试句柄（销毁时清理），供控制台调试与 e2e 使用。
- 验证命令：
  - `pnpm --filter @block-editor/editor test`（34/34 通过，含新增 6 个 Markdown 导出用例）
  - `npx vitest run tests/e2e/export-consistency.spec.ts --config vitest.e2e.config.ts`（3/3 通过）
  - `npx vite build`（playground 构建通过）
- 验证结果：通过。执行环境备注：Node 18.12 + pnpm 9（全局 pnpm 10 需 Node 22，需用 `npx pnpm@9`）；playwright 浏览器未预置且下载受限，e2e 通过 `channel: 'msedge'` 使用系统 Edge。
- 文档更新：`docs/todo/current.md`（Phase A/B/C 勾选、问题记录状态、本日志）。
- 风险与待办：
  1. 复制链路（EXP-003 / Phase D）尚未处理。
  2. `packages/editor` 的 `tsc` 存在既有类型错误（`block-handle.ts` 大量未使用变量、`SmartPaste.ts` Selection/TextSelection 类型），playground build 走 vite 不做类型检查所以未暴露；本批改动文件类型检查干净，上游清理另立任务。
  3. 表格含列表/多段落单元格时拍平为单行文本（空格连接），如需保留换行需再评估 `<br>` 方案。
  4. `docs/developer/call-chains.md` 的导出链路章节（Phase E2）待补。

### 2026-09-14 regression e2e 全量基线摸底（存量失败登记）

- 任务ID：H2.2 / H2.3 / H2.9 / H2.11 / H2.21 / H2.22 / H3.6 / H3.11 / H3.14（登记，本轮不修）
- 状态变更：新增 todo（归入 Phase F 收口批次）
- 功能点分析：
  - 首次在 Windows + 系统 Edge（headless，channel=msedge）环境跑通全量 `tests/e2e/regression.spec.ts`（此前环境缺 playwright 浏览器且 `spawn('pnpm')` ENOENT，5 月的 block-handle/表格 trigger 重构只验证过 `vite build`）。
  - 全量结果：41 用例，32 通过 / 9 失败。失败集中在块手柄点击与表格交互：`editor-container` 子树拦截 pointer events、`.be-block-handle` 不可见等。
  - 已做归因验证：将本轮导出改动（Exporter/serializer）stash 后重跑同一批用例，失败集合完全一致 → 9 项均为存量问题，与导出一致性修复无关。
- 代码改动：无（仅登记）。
- 验证命令：`npx vitest run tests/e2e/regression.spec.ts --config vitest.e2e.config.ts --reporter=json`
- 验证结果：32/41 通过；9 项失败为存量。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. 下一批按 Phase F 收口时优先修复 H3.11/H3.14/H2.3/H2.21（表格 handle/工具栏分层，对应 F3/F4/F7-F9/F12）。
  2. H2.9/H2.11/H2.22/H3.6（块删除/移动/复制的手柄交互）与 H2.2（链接悬浮预览）需单独归因：既可能是 5 月重构回归，也可能是 Edge 环境差异，修复时先在 Chromium 下交叉复现。

### 2026-10-24 存量 e2e 交互失败修复批次（H2.3/H2.9/H2.11/H2.21/H2.22/H3.6/H3.11/H3.13/H3.14）

- 任务ID：上轮登记的 9 个存量 e2e 失败 + 波及项（H3.2/H3.3 选择器脆弱）
- 状态变更：doing -> review（浏览器逐流程实测验证）
- 功能点分析（真实浏览器诊断结论，非推测）：
  1. 表级块手柄 z-index 240060 被激活态热区层 240100 压制，手柄不可点击（用户同样点不到）。
  2. handleMouseMove 中"指针已停在手柄上"的包含检查排在 hideTableBlockHandle 之后：指针从表格移向手柄的瞬间被判"离开表格"，手柄立即消失。
  3. getTableFromPoint 的"最近表格"兜底会抢走紧邻表格段落（24px 容差内）的 hover，段落永远拿不到通用块手柄。
  4. 点击表级手柄产生 CellSelection + 打开块菜单；菜单开启期间 mousemove 短路，Esc 只关菜单不清表格选中态，块手柄无法回归。
  5. UI 层根 z=240000 低于表格 chrome（240100/240110）：表格工具栏展开的下拉菜单被透明热区层遮挡无法点击。
  6. 空闲手柄 opacity:0 仍保留盒模型，干扰自动化命中测试与 .first() 选择。
  7. 5月重构后块菜单项类名为 be-block-handle-insert-*-btn，e2e helper 的 .menu-item 选择器失效；H3.2/H3.3 的裸 .first() 会匹配常驻 display:none 的块菜单。
- 代码改动：
  - block-handle.ts：空闲手柄 visibility:hidden；表级手柄 z 240110；mousemove 手柄短路提前；getTableFromPoint 内容块命中不回退；表格选中 guard 放宽（hover 表格外块时让位）；新增 Esc 行为（关块菜单 + 清理 CellSelection/NodeSelection 表格选中态，对齐飞书）。
  - layer-root.ts：UI 层根 z 240000 -> 240300（高于全部表格 chrome）。
  - ToolbarDropdown.ts：下拉统一挂 UI 层根（解决 overlay-container 低堆叠上下文困住弹层）；index.css 补 .toolbar-dropdown-menu pointer-events:auto。
  - regression.spec.ts：手柄选择器分层（通用/表级）；菜单项类名更新；新增 selectCellText（F7/F8：选中文本才弹表格工具栏）；H3.13 拖拽前稳定等待；H3.2/H3.3 按打开态定位下拉菜单；H3.14 补 Esc 关菜单步骤。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：34/34 通过。
  - 关键流程真实浏览器逐项实测通过：H2.3（行操作插入行 3->4 行）、H3.11（表手柄点击+菜单）、H3.13（引用/代码块两次拖拽反馈）、H3.14（Esc 后通用手柄回归）、H2.21（单元格内加粗 parity）。
  - 全量 e2e：修复中段一轮干净运行 37/41（4 失败为 H2.2 多选栏偶发 + H3.2/H3.3/H3.5 选择器脆弱，后两者已修）；后续全量重跑受本机环境负载影响出现大量 page.goto networkidle 超时（非断言失败），最终以定向批次+浏览器实测为准。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. H2.2 的 .be-multiselect-bar 残留遮挡仍偶发（多选栏隐藏时机问题），未根因修复，登记为 BHI-010。
  2. 全量 e2e 在长时间会话后受 dev server 性能退化影响（goto networkidle 超时），建议后续在 CI 或重启后跑全量复核。
  3. F8 的理想行为（单元格内文本选区显示"文本格式"工具栏）与当前实现（显示表格工具栏）不一致，测试按当前实现对齐，F8 原样保留在 Phase F。

### 2026-10-24 Phase D 复制链路一致性（EXP-003）

- 任务ID：EXP-003 / D2（text/plain 结构化输出）
- 状态变更：doing -> review（真实剪贴板实测验证）
- 功能点分析：
  - Phase D2 目标是复制输出 text/plain 保留 Markdown 可读结构。此前复制表格/任务列表到外部时是行内文本堆叠，与 Markdown 导出结构冲突。
  - 实现路径：ProseMirror `clipboardTextSerializer` 只接管 text/plain 分支；text/html 保持默认富视觉输出（D2 的"复制允许带 HTML 样式"约定）。
- 代码改动：
  - `packages/editor/src/extensions/ClipboardMarkdown.ts`：新增扩展，选区 Slice → DOMSerializer → 与导出共用的 `editorHtmlFragmentToMarkdown` 规范化管线；序列化异常时回退默认 textContent。
  - `packages/editor/src/utils/serializer.ts`：抽出 `editorHtmlFragmentToMarkdown`（片段级复用同一管线）。
  - `packages/editor/src/core/EditorCore.ts`：注册 ClipboardMarkdown；`index.ts` 导出。
  - `packages/editor/src/extensions/__tests__/ClipboardMarkdown.spec.ts`：新增（表格 GFM / 任务列表勾选框 / 空选区 3 例）。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：37/37 通过（新增 3 例）。
  - 真实浏览器 Ctrl+A → Ctrl+C → navigator.clipboard.readText()：text/plain 输出标准 GFM 表格（`| 姓名 | 年龄 |` + 分隔行）与任务勾选框（`[x] 已完成事项`），无原始 HTML。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. D1/D3（复制 HTML 样式清洗对齐）与 D4（外部平台手工验收）未动，属后续批次。
  2. 粘贴到飞书/语雀的行为依赖对方 text/plain 解析，建议按 D4 清单做一次人工验收。

### 2026-10-24 功能拓展：待办完成态样式 + 目录块 TOC

- 任务ID：功能拓展（对齐飞书文档）
- 状态变更：doing -> review
- 功能点分析：
  1. 待办完成态：飞书勾选后文本划线置灰，此前本项目无任何视觉反馈。
  2. 目录块：飞书「目录」块自动收集标题、点击定位；本项目仅有右侧大纲栏，缺文档内目录块。
- 代码改动：
  - `styles/index.css`：任务列表 `li[data-checked='true']` 完成态样式（划线置灰、链接/行内代码联动、checkbox 变灰）。
  - `extensions/TocBlock.ts`：新增目录块节点（atomic、可拖拽），NodeView 收集 H1–H3 标题（300ms 节流随文档更新重建），点击条目同步选区 + DOM 滚动定位（沿 overflow 容器链查找）。
  - `block-features.ts`：注册 tocBlock feature（slash 菜单 + insert-menu 可插入）。
  - i18n：zh/en 增补 tocTitle/tocDescription/insertToc。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：37/37 通过；tsc 0 错误。
  - 浏览器实测：TOC 正确收集 H1–H3（层级缩进）、点击条目可定位到对应标题（H2 顶部偏移 289px 在视口内）；待办勾选后 `line-through` + 置灰生效。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. TOC 的斜杠菜单插入路径已注册，e2e 未覆盖（后续补）。
  2. 导出链路：tocBlock 在 Markdown/DOCX 导出中当前输出为空（目录本质是动态视图），后续可在 serializer 中渲染为纯文本列表。

### 2026-10-24 功能拓展：本地图片粘贴/拖入直传

- 任务ID：功能拓展（对齐飞书文档粘贴截图体验）
- 状态变更：doing -> review
- 功能点分析：飞书文档支持截图后直接 Ctrl+V 插入；此前本项目粘贴图片文件无响应，仅支持 URL 插入。
- 代码改动：
  - `extensions/ImagePasteUpload.ts`：新增扩展。粘贴/拖入本地图片文件 → base64 内联插入；支持 `upload` 选项接对象存储（先插占位、成功替换 src、失败移除）；`maxFileSizeMb` 体积门槛（默认 20MB），全超限时放行默认行为不吞事件；drop 时按落点坐标移动光标后插入。
  - `EditorCore` 注册；`index.ts` 导出。
  - 新增单测 3 例（jsdom stub DataTransferItemList 协议）。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：40/40 通过；tsc 0 错误。
  - 浏览器实测：模拟截图 File 粘贴 → 图片节点插入且 src 为 base64 PNG。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. base64 内联会让文档体积膨胀，生产接入应传 `upload` 选项走对象存储。
  2. 拖拽插入与 block-handle 的块拖拽共存（dataTransfer 类型区分），未见冲突；多图片批量拖入后续可补。

### 2026-10-24 功能拓展：图片本地上传插入 + 多文档管理

- 任务ID：功能拓展（对齐飞书文档）
- 状态变更：doing -> review
- 功能点分析：
  1. 图片插入此前只支持 URL 弹窗，且 slash 菜单无图片条目；飞书以本地上传为主。
  2. 多文档管理缺失：编辑器单实例单文档，无文档列表/持久化/自动保存。
- 代码改动：
  - `utils/image.ts`：新增 `pickImageSource`（本地文件选择优先，取消可回退 URL 输入，focus 恢复兜底处理取消场景）。
  - `block-features.ts`：slash/insert-menu 新增图片条目（本地上传→插入）；块手柄图片项默认改本地选择（保留 promptImageSrc 覆盖机制）。
  - `core/DocumentManager.ts`：多文档管理器（localStorage 持久化、索引倒序列表、创建/重命名/删除、attachEditor 防抖自动保存、flush 立即落盘、storage 可注入）。
  - `apps/playground/src/scenes/pages/DocumentsScenePage.vue`：文档管理场景（左文档树：新建/单击切换/双击重命名/删除确认；右侧编辑器；自动保存）。
  - `router.ts` 注册 documents 场景；`index.ts` 导出 DocumentManager 与 utils/image。
  - 新增单测：DocumentManager 5 例。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：45/45 通过；tsc 0 错误。
  - 浏览器实测：文档场景首建引导文档、新建激活、编辑 1.5s 后切换文档再切回内容持久化（自动保存 PASS）；slash 菜单含「图片」「目录」条目。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. 文档管理场景与协同（Yjs）互斥（单机 localStorage 场景）；后续可做 storage adapter 抽象接远端。
  2. 文档树 UI 是 playground 演示实现，core 仅提供逻辑层，接入方自建 UI。

### 2026-10-24 功能拓展：Ctrl+F 查找替换 / 表格斑马纹 / 文档树拖拽排序

- 任务ID：功能拓展（对齐飞书文档）
- 状态变更：doing -> review
- 代码改动：
  - `EditorCore.registerDefaultShortcuts`：新增 `core.findReplace`（Mod+F 唤起查找替换面板，与工具栏入口同事件）。
  - `styles/index.css`：表格偶数行斑马纹（bg 55% 混合）与行悬浮淡主色高亮；置于 th 背景之后、选中态蒙层之前避免覆盖。
  - `DocumentManager.reorder(id, targetId, position)`：手动排序（before/after/置顶），list() 改为索引手动序（create 置顶），自动保存不再重排序；新增 2 个单测。
  - `DocumentsScenePage.vue`：文档树 HTML5 拖拽排序（上半 before/下半 after）。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：47/47 通过；tsc 0 错误。
  - 浏览器实测：Ctrl+F 打开查找替换面板（445px 可见）；表格偶数行灰阶与奇数行不同；文档树第二项拖到首项上半部后顺序翻转。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：拖拽暂无落点指示线（后续可加插入位置高亮）；斑马纹在单元格设置背景色时会被覆盖（符合预期）。

### 2026-10-24 功能拓展：文档标题区 + 拖拽落点指示线 + 分栏排版块

- 任务ID：功能拓展（对齐飞书文档）
- 状态变更：doing -> review
- 代码改动：
  - `DocumentsScenePage.vue`：编辑器顶部新增标题输入框（双向绑定 activeTitle，input 即 rename 同步文档树）；拖拽增加落点指示线（drop-before/after 内嵌主色线，dragleave/dragend 清理）。
  - `extensions/ColumnsBlock.ts`：新增 columns（content: column+，columnCount 2-4）与 column（content: block+）节点；insertColumns 命令（默认 2 栏）；flattenColumnsToBlocks/flattenColumnsInDocJson 导出降级辅助。
  - `DocxSerializer.parseNodes`：columns case 按栏顺序线性化导出。
  - `block-features.ts`：slash/插入菜单新增「分栏」条目；i18n zh/en 增补 columnsTitle/Description。
  - 样式：flex 均分、栏间虚线分隔、focus-within 主色描边。
- 验证命令与结果：
  - `pnpm --filter @block-editor/editor test`：47/47 通过；tsc 0 错误。
  - 浏览器实测：insertColumns 双栏插入、两栏各自独立段落可输入；slash 菜单含「分栏」；文档标题输入即时同步文档树。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. 分栏内跨栏删除/Backspace 边界行为未深度打磨（ProseMirror 默认行为）。
  2. 栏宽拖拽调节、栏数增减按钮未做（后续迭代）。
  3. Markdown 导出走 HTML→turndown 天然线性化；如需保留分栏语义可扩展 [!columns] 约定。

### 2026-10-24 表格/图片真实交互专项（用户反馈驱动）

- 任务ID：真实交互验证专项（用户指出此前验证多用 commands API，未走真实点击路径）
- 状态变更：doing -> review
- 功能点分析（真实操作暴露的 3 个真 bug，全部修复）：
  1. 表格内按 Tab 触发 `RangeError: Applying a mismatched transaction`（Indent 扩展的 Tab 快捷键抢占 goToNextCell 且链式命令派发过期 state），连锁导致工具栏不出/插入列无效等假象。
  2. 斜杠菜单在块容器（引用等）内触发时，表格等块级插入物被塞进容器内部而非文档顶层；且顶层无尾随段落系断言对象写错（tableWrapper）——实际有段落。
  3. 表级手柄 z-index 240110 压过插入点层 240100（H3.11 修复时调反了优先级链），列插入点被手柄遮挡；正确值 240095（>通用手柄 240091，<插入层 240100）。
- 代码改动：
  - `Indent.ts`：Tab/Shift-Tab 在表格/代码块上下文放行（goToNextCell/软缩进）；indent/outdent 重写为注入 state.tr.setNodeMarkup 原生命令，根治 mismatched transaction。
  - `SlashCommand.executeAtIndex`：删除查询文本的同一事务内做"容器提升"——光标在 blockquote/callout/column(s) 内时移到容器后顶层新段，块级插入物永远落顶层（对齐飞书）。
  - `index.css`：表级手柄 z 240095；插入点 dot 增大命中热区（::before inset -9px）。
- 验证命令与结果（全部真实交互路径，无 commands API）：
  - 真实键盘/点击扫描：slash 真实点击插表格、顶层插入+尾随段、Tab 链 A1→B1→C1、双击文字选中→表格工具栏→加粗、插入点命中（onTop=DOT）、段落缩进/取消、0 页面错误。
  - 图片真实路径：slash→系统文件选择器→真实 PNG 上传插入（loaded:true）、点击出对齐工具栏、对齐切换、点击→NodeSelection→Backspace 删除。
  - 权威回归：`tests/e2e/regression.spec.ts` 全量 **41/41 通过**（含全部表格/手柄/图片/拖拽用例）。
  - 单测 47/47；tsc 0 错误。
- 文档更新：`docs/todo/current.md`、`docs/todo/roadmap-next.md`。
- 风险与待办：
  1. BHI-011（新登记）：hover 表格边缘激活插入意图后移回表格内部，块手柄偶发不恢复（Esc 可恢复）；e2e 未复现，需真实鼠标路径细化。
  2. 验证方法论改进已落实：交互类验证一律走真实点击/键盘/file-chooser，commands API 仅用于构造初始文档。

### 2026-10-24 表格边条选行/列 + 插入行列修复（用户真实操作反馈第二批）

- 任务ID：BHI-012（边条点选无响应）/ BHI-013（插入行列无效）
- 状态变更：doing -> review
- 功能点分析（真实点击逐层定位）：
  1. BHI-012：点击顶部/左侧边条热区（axis-zone）选不中行/列。链路逐层插桩确认：事件到达 zone、layer 捕获监听触发、activateTableAxisSelection 执行、CellSelection dispatch 成功——但随即被 PM DOMObserver 的 readDOMChange 反向重置（axis chrome 给单元格加的选中类被误判为内容变更）。之前"选中最后一项"的用户观感即此重置后的残留状态。
  2. BHI-013：点击行列插入点（dot）无效。两个叠加根因：① 同 BHI-012 的 observer 重置链路干扰插入前选区；② 行/列 dot 热区（::before 外扩 9px）在表格四角交叠，点击列 dot 实际命中行 dot（elementsFromPoint 后位胜出）。
- 代码改动：
  - `block-handle.ts`：`activateTableAxisSelection` 激活期间暂停 PM domObserver（stop/start 包裹），杜绝 readDOMChange 重置；新增元素级绑定 `attachAxisZoneBehavior`（zone mousedown 直接触发整行/列选择）与 `attachInsertDotBehavior`（dot click 直接触发插入），不再依赖 layer 捕获分发；dot click 用 elementsFromPoint 最近中心 dot 仲裁热区交叠。
- 验证命令与结果（全部真实点击）：
  - 顶部边条点第1/4列 → 整列 CellSelection（5 格蒙层）；左侧边条点第4行 → 整行 CellSelection（4 格蒙层）。
  - 列 dot 点击 4→5 列；行 dot 点击 9→10 行。
  - 权威 e2e 40/41（仅剩 BHI-010 偶发）；单测 47/47；tsc 0 错误。
- 文档更新：`docs/todo/current.md`。
- 风险与待办：
  1. domObserver.stop 期间若有真实用户输入会丢一轮观察（80ms 窗口内，风险极低）。
  2. 层级分发旧路径（handleTableTriggerMouseDown/Click）保留未删，作为元素级绑定的兜底。

### 2026-10-24 单元格内块手柄行对齐修复（用户截图反馈）

- 任务ID：BHI-014（in-cell handle 垂直偏移）
- 状态变更：doing -> review
- 功能点分析：多段单元格中，handle 永远对齐格内第一个块而非悬停行（截图：hover 第二行 asdasd，手柄停在两行之间/第一行位置）。根因：`resolveVisualBlockInHoveredCell` 优先返回 `getVisualBlockForTableCell`（格内首块），指针位置解析永不生效。
- 代码改动：`block-handle.ts` 重排该函数优先级——posAtCoords 指针下的块优先（校验属于当前格），格内首块降为兜底（悬停格内空白时）。
- 验证命令与结果（真实 hover）：两段单元格分别 hover 两行，handle 垂直中心 = 各行中心（349/349、378/378）；单测 47/47；e2e 40/41（仅剩 BHI-010 偶发）；tsc 0 错误。
- 文档更新：`docs/todo/current.md`。

### 2026-10-24 BHI-010 根治：多选栏偶发残留/拦截（H2.2 稳定化）

- 任务ID：BHI-010
- 状态变更：doing -> done
- 功能点分析：BlockMultiSelect 的 window 捕获监听对编辑区内每次 mousedown 都 preventDefault（为框选预备），吞掉浏览器默认聚焦——PM 的点击选区放置被时序性打断（hasFocus=false、选区停 doc 起点），后续 Shift+箭头无文字选区、tooltip 不出、偶发路径下多选 storage 未清导致 bar 残留拦截链接点击。5 连跑 100% 复现 NO_SELECTION。
- 代码改动：`BlockMultiSelect.handleMouseDown` 移除 mousedown 阶段的 preventDefault；框选激活（移动 ≥4px）与拖动/松开路径的 preventDefault 保留（689/704 行），框选行为不变。
- 验证命令与结果：5 连跑选区/tooltip 5/5 稳定；权威 e2e 全量 **41/41 首次全绿**；tsc 0 错误。
- 文档更新：`docs/todo/current.md`。

### 2026-10-24 F8 落地：表格工具栏按选区类型分层

- 任务ID：F8（飞书行为拆解遗留项）
- 状态变更：doing -> done
- 功能点分析：单元格内文本选区此前显示完整表格工具栏（含行/列操作、合并、删表）。飞书行为：选文字只出文本格式；CellSelection 才出表格结构操作。
- 代码改动：`TableBubbleMenu` 渲染时给表格结构类控件（单元格背景/对齐/行列操作/合并拆分/删表，共 5 组）打 `data-be-table-only` 标记；`update` 按选区类型切换可见性（文本选区隐藏、CellSelection 恢复），层切换去重。
- 测试同步：H2.3 行操作路径改为真实 CellSelection（点格 + Shift+点邻格）。
- 验证：真实浏览器双向切换通过（文本选区 5 组结构项隐藏、CellSelection 恢复）；权威 e2e 全量 41/41 全绿；tsc 0 错误。
- 文档更新：`docs/todo/current.md`。

### 2026-10-24 TOC 目录块导出降级

- 任务ID：路线图 P0-5
- 状态变更：doing -> done
- 代码改动：
  - `utils/serializer.ts`：导出管线新增 `tocBlockToPlainList`——目录块替换为纯文本标题列表（每条一个 p，层级缩进 `·` 前缀，空文档给占位文案）。
  - `DocxSerializer.parseTocBlock`：遍历 rootJson 收集 H1–H3（尊重 maxLevel），输出缩进文本段落。
  - `TocBlock.ts`：修复 destroy 经 Tiptap 'destroy' 事件调用时 this 错位（箭头包装）。
  - 新增导出降级单测 1 例；导出测试夹具补注册 TocBlock。
- 验证：单测 48/48 全绿；tsc 0 错误。
- 文档更新：`docs/todo/current.md`。
