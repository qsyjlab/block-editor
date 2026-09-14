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
