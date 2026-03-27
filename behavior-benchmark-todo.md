# Block Editor 行为基准 TODO（飞书/语雀对标）

最后更新时间：2026-03-27（持续更新）  
负责人：Codex + 你  
当前状态：进行中

## 0. 目标定义（本轮要达到什么）

1. 建立可执行的“编辑行为基准”，用于判断当前编辑器是否符合飞书文档与语雀文档操作标准。
2. 形成统一的行为对照矩阵（飞书 vs 语雀 vs 当前实现），并产出可复现的差异清单。
3. 将基准固化为“手工回归清单 + Vitest 单测 + E2E 回归”三层测试体系。
4. 以 P0/P1/P2 优先级推进改造，保证每轮迭代都有可量化评分提升。

## 1. 执行规则（每次都要遵守）

1. 每完成一个子任务，立即更新本文件勾选状态。
2. 每次代码提交后，在“执行日志”追加一条：时间、改动范围、验证结果、遗留问题。
3. 如任务拆分变化，先更新“任务清单”再执行。
4. 每次功能开发完成后，必须更新调用链路文档：`docs/developer/call-chains.md`。
5. 每次功能开发完成后，必须同时更新两类文档：
   `docs/usage/*`（使用文档）与 `docs/developer/*`（开发者读代码文档）。
6. 所有“对标结论”必须能回放：需包含操作路径、预期行为、当前行为、证据（截图或日志）。
7. 功能任务只有在“代码 + 测试 + 调用链路 + 使用文档 + 开发文档 + 代办日志”全部更新后，才可标记完成。

## 2. 阶段计划（细颗粒）

### Phase A：行为基准框架定义

- [x] A1. 定义行为分级：`P0`（阻断）、`P1`（高频核心）、`P2`（增强体验）。
- [x] A2. 定义行为评分：`2=符合`、`1=可接受`、`0=不符合`。
- [x] A3. 定义加权规则：`P0*3`、`P1*2`、`P2*1`。
- [x] A4. 定义发布门槛：`P0 不允许 0 分` + `总分阈值`。
- [x] A5. 输出行为项模板（动作、预期、边界、异常、快捷键、证据）。

验收标准：
- [x] 有统一评分模型与发布门槛。
- [x] 有标准化行为项模板，后续可批量录入。

---

### Phase B：飞书/语雀标准行为矩阵建模

- [x] B1. 梳理“文本输入与光标”行为项。
- [x] B2. 梳理“选区与格式化”行为项。
- [x] B3. 梳理“粘贴与剪贴板”行为项（纯文本/富文本/代码块）。
- [x] B4. 梳理“撤销重做”行为项（连续操作、跨块操作）。
- [x] B5. 梳理“块操作”行为项（handle、拖拽、复制块、移动块）。
- [x] B6. 梳理“评论协作”行为项（添加、展开、定位、回复、解决）。
- [x] B7. 梳理“链接/图片/表格”行为项。
- [x] B8. 梳理“快捷键与菜单一致性”行为项。
- [x] B9. 输出三方矩阵：飞书、语雀、当前实现。

验收标准：
- [x] 至少 60 条行为项（建议 P0≥20，P1≥25）。
- [x] 每条都有“标准预期 + 对照结论”。

---

### Phase C：当前实现差异盘点（Gap Analysis）

- [ ] C1. 按行为项逐条验证当前实现。
- [x] C1.a 完成 P0（26 条）首轮逐条盘点并归档证据。
- [x] C2. 标记差异等级：`Critical/High/Medium/Low`（P0 首轮已完成）。
- [x] C3. 输出差异影响范围（功能模块、用户路径、风险等级）。
- [x] C4. 输出改造建议（最小改动方案 + 推荐方案）。
- [x] C5. 形成首批修复 backlog（按 P0/P1/P2）。

验收标准：
- [x] 所有 P0 行为项都有明确结论与修复建议。
- [x] 形成可执行的修复任务队列。

---

### Phase D：Playground 基准场景建设

- [ ] D1. 新增“行为基准”场景页（集中复现高频行为链路）。
- [ ] D2. 预填覆盖数据：标题、列表、任务、引用、代码块、表格、链接、图片、评论锚点。
- [ ] D3. 场景支持 query：`theme/lang/collab/room/user`。
- [ ] D4. 新增“无协作干扰”模式（默认 `collab=0`，可显式开启）。
- [ ] D5. 为每条 P0 行为项配置对应复现入口。

验收标准：
- [ ] 可通过 URL 一键复现任一关键行为。
- [ ] 场景数据稳定，不被协作文档污染。

---

### Phase E：Vitest 单元测试基线

- [ ] E1. 建立 editor 包统一 `vitest` 单测入口（保留现有脚本风格）。
- [ ] E2. 落地“粘贴策略”单测（代码块放行、URL 智能粘贴、HTML 清洗）。
- [ ] E3. 落地“选区状态机”单测（text/block/table 模式切换）。
- [ ] E4. 落地“评论链路核心逻辑”单测（预填引用、确认保存）。
- [ ] E5. 落地“块操作命令”单测（移动、复制、删除、转换）。
- [ ] E6. 输出单测覆盖统计与缺口清单。

验收标准：
- [ ] P0 相关逻辑具备单元测试覆盖。
- [ ] 单测可在 CI/本地一致执行。

---

### Phase F：E2E 行为回归（Vitest + Playwright）

- [ ] F1. 扩展现有 e2e：补全 P0 行为链路覆盖。
- [x] F1.a 已新增 H2.6~H2.17（撤销重做、快捷键一致性、Shift+Enter、删除块后焦点连续编辑、格式化撤销重做、块上移下移顺序可逆、中文连续输入稳定性、输入不中断压测、composition 事件链路、斜体快捷键一致性、选区一致性、顶部-选区工具栏一致性）；H2.18（粘贴落点）当前在无头环境下 skip。
- [ ] F2. 新增“编辑不中断”回归（代码块内复制/粘贴/光标保持）。
- [ ] F3. 新增“评论链路一致性”回归（顶部工具栏/选区工具栏路径一致）。
- [ ] F4. 新增“表格工具栏与快捷键”回归。
- [ ] F5. 新增“撤销重做跨块”回归。
- [ ] F6. 输出 e2e 稳定性策略（动态端口、双语断言、弱时序断言）。

验收标准：
- [ ] P0 链路全部具备自动化回归。
- [ ] 回归失败可快速定位到具体行为项 ID。

---

### Phase G：行为评分与发布门禁

- [ ] G1. 生成行为评分卡（按 P0/P1/P2 分组）。
- [ ] G2. 生成当前版本总分与历史趋势。
- [ ] G3. 建立发布门禁规则（P0 不通过则阻断发布）。
- [ ] G4. 将评分结果写入 docs（使用 + 开发）。

验收标准：
- [ ] 每个版本有可追踪评分结果。
- [ ] 发布前可自动判断是否达标。

---

### Phase H：文档与调用链路收口

- [x] H1. 新增使用文档：`docs/usage/behavior-benchmark.md`。
- [x] H2. 新增开发文档：`docs/developer/behavior-benchmark.md`。
- [x] H3. 在 `docs/developer/call-chains.md` 增加行为链路章节。
- [x] H4. 更新 `docs/usage/regression-checklist.md` 增加行为基准章节。

验收标准：
- [x] 使用侧可按文档完成行为验收。
- [x] 开发侧可快速定位行为到代码链路。

---

### Phase I：首轮改造落地（按优先级）

- [ ] I1. 修复所有 P0 差异项。
- [ ] I2. 修复首批 P1（至少 10 项）。
- [ ] I3. 每修复一项必须补对应测试与文档。
- [ ] I4. 完成首轮验收报告（通过项/未通过项/风险项）。

验收标准：
- [ ] P0 行为项全部达标。
- [ ] 首轮行为总分达到目标阈值。

## 3. 当前优先顺序（执行顺序）

1. Phase A（标准与评分规则）
2. Phase B（飞书/语雀行为矩阵）
3. Phase C（差异盘点）
4. Phase D + E + F（场景化 + 单测 + e2e）
5. Phase G + H + I（评分门禁 + 文档 + 首轮改造）

## 4. 基准行为项模板（后续按此录入）

```md
- 行为ID：
- 优先级：P0/P1/P2
- 分类：输入/选区/粘贴/评论/表格/块操作/...
- 对标来源：飞书/语雀
- 触发步骤：
- 标准预期：
- 当前行为：
- 差异结论：符合/可接受/不符合
- 风险等级：Critical/High/Medium/Low
- 修复建议：
- 测试覆盖：单测ID / e2e用例ID
- 证据：截图路径 / 日志链接
```

## 5. 执行日志（每次执行后更新）

- 2026-03-27：初始化“行为基准 TODO（飞书/语雀对标）”文档，建立阶段计划、验收标准、评分模型与执行规则。下一步：进入 Phase A/A1-A5，先输出行为项模板与发布门槛草案。
- 2026-03-27：开始执行第一轮。完成 Phase A（分级、评分、加权、发布门槛、模板）并落地到使用/开发文档；新增 `docs/usage/behavior-benchmark.md`、`docs/developer/behavior-benchmark.md`，同步更新 `docs/.vitepress/config.mts` 侧边栏、`docs/usage/regression-checklist.md` 与 `docs/developer/call-chains.md` 行为基准链路章节。验证：`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第二轮。完成 Phase B（行为矩阵建模）：新增 `docs/developer/behavior-matrix.md`，输出首版 66 条三方对照行为项（P0=26、P1=28、P2=12），覆盖输入、选区、粘贴、撤销、块操作、评论、链接图片、表格、工具栏一致性；同步更新行为基准文档入口与 VitePress 导航。验证：`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第三轮。完成 Phase C（P0 首轮差异盘点）：新增 `docs/developer/behavior-gap-analysis.md` 与 `docs/usage/behavior-gap-analysis.md`，输出 P0（26 条）结论、风险分级、影响范围与修复 backlog（P0-FIX-001~005）；同步更新 `docs/.vitepress/config.mts`、`docs/developer/call-chains.md`、`docs/usage/regression-checklist.md` 与行为基准入口。验证：`pnpm --filter @block-editor/editor test` 通过；`pnpm --filter block-editor-playground test:e2e` 在可监听端口环境下通过（6/6）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第四轮。扩展 e2e 回归到 9 条：新增 H2.6（输入撤销重做）、H2.7（Cmd/Ctrl+B 快捷键一致性）、H2.8（Shift+Enter 软换行）；同步更新差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（9/9）；`pnpm --filter @block-editor/editor test` 通过（3/3）。
- 2026-03-27：继续执行第五轮。新增 H2.9（删除块后焦点连续编辑）并修复 `block-handle.deleteBlock` 焦点回收链路（删除后设置近邻选区 + 强制 focus）；同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（10/10）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第六轮。新增 H2.10（格式化撤销重做）与 H2.11（块上移下移顺序可逆），并增强 block handle 菜单点击用例稳定性；同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（12/12）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第七轮。新增 H2.12（中文连续输入稳定性冒烟），将 INP-001 从“未通过”提升为“部分通过”；同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（13/13）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第八轮。新增 H2.13（输入不中断压测：输入过程中触发 resize/selectionchange/UI token 重算后仍可连续输入），将 INP-002 从“未通过”提升为“部分通过”；同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（14/14）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第九轮。新增 H2.14（composition 事件链路模拟）与 H2.15（Cmd/Ctrl+I 快捷键一致性），将 INP-001、TOB-002 提升到“通过”；同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（16/16）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
- 2026-03-27：继续执行第十轮。新增 H2.16（Shift 扩选与鼠标拖选一致性）与 H2.17（顶部/选区工具栏一致性）并通过；尝试新增 H2.18（粘贴落点）但受无头环境剪贴板与焦点链路影响暂时标记 skip，PST-004 维持“部分通过”。同步更新行为矩阵、差异盘点、回归清单、调用链路与 TODO。验证：`pnpm --filter block-editor-playground test:e2e` 通过（18/19，1 skip）；`pnpm --filter @block-editor/editor test` 通过（3/3）；`pnpm --dir docs docs:build` 通过。
