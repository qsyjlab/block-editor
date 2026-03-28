# 当前代办清单（唯一执行入口）

最后更新：2026-03-28  
状态：进行中  
维护规则：后续所有代办更新统一写在本页面。

## P0 图片交互与拖拽一致性收口（进行中）

来源：`docs/todo/history/image-interaction-dnd-todo.md`（历史来源，不再继续维护）

- [ ] P0-1 固化复现脚本（3类问题：图片点击异常、预览样式异常、非图片块长按拖拽失败）。
- [ ] P0-2 建立块类型拖拽矩阵（段落/标题/引用/代码块/列表/Callout/表格/图片）。
- [ ] P0-3 输出并确认图片交互状态机（`idle -> selected -> toolbar-open -> preview-open`）。
- [ ] P0-4 处理 caption 编辑与 block-handle 抢焦点/抢 hover 冲突。
- [ ] P0-5 完成“长按拖拽阈值”规则（时间阈值 + 位移阈值）。
- [ ] P0-6 统一拖拽落点反馈样式（段落/引用/代码块/表格等一致高亮）。
- [ ] P0-7 统一拖拽结束清理（handle/drop-target/selection/ghost）。
- [ ] P0-8 修复“拖拽后重复插入图片/文本”回归问题并稳定复现验证。
- [ ] P0-9 补齐 e2e：图片点击状态机、预览弹层、长按拖拽矩阵、原生拖拽干扰防回归。
- [ ] P0-10 更新行为基准与评分卡（新增 H4 系列项）并完成一轮验收报告。

## P1 全链路对标未收口项（未开始）

来源：`docs/todo/history/toolbar-benchmark-plan.md`（3.2 当前剩余缺口）

- [ ] P1-1 构建清零守护：持续保证 `pnpm -r build` 全绿（不引入新 TS 错误）。
- [ ] P1-2 类型生态稳定：第三方类型声明与版本持续对齐（Markdown/协作相关依赖重点关注）。
- [ ] P1-3 协作后端接入与鉴权方案落地（基础架构、会话鉴权、最小可运行链路）。
- [ ] P1-4 评论与版本历史服务端化最小闭环（写入、查询、回放、失败兜底）。
- [ ] P1-5 版本历史增强（diff 对比、命名版本、冲突处理）。
- [ ] P1-6 块链接体系增强（块引用预览、反向引用）。
- [ ] P1-7 Markdown 深度兼容与大文档性能优化（复杂嵌套映射 + 压测基线 + 优化项收口）。

## 执行顺序

1. 先完成 `P0-1 ~ P0-4`（明确行为边界和状态机）。
2. 再完成 `P0-5 ~ P0-8`（拖拽核心链路收口）。
3. 然后完成 `P0-9 ~ P0-10`（自动化与评分补齐）。
4. 再推进 `P1-1 ~ P1-2`（工程稳定性守护）。
5. 最后推进 `P1-3 ~ P1-7`（服务端化与体验增强收口）。

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
