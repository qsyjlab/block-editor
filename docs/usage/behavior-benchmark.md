# 使用文档：行为基准（飞书/语雀对标）

## 1. 目的

该文档用于回答一个问题：当前编辑器行为是否符合飞书文档与语雀文档的主流操作标准。

我们只对标“行为一致性”，不做视觉 1:1 对标。

## 2. 评分规则

每条行为项评分：

- `2`：符合（结果与交互预期一致）
- `1`：可接受（有轻微差异但不影响主流程）
- `0`：不符合（会造成明显认知偏差或阻断）

权重：

- `P0`（阻断）：`*3`
- `P1`（高频核心）：`*2`
- `P2`（体验增强）：`*1`

发布门槛：

- `P0` 不允许出现 `0`
- 行为总分达到目标阈值（建议 `>= 85%`）

## 3. 行为项结构

每条行为项都要包含：

1. 行为 ID
2. 对标来源（飞书 / 语雀）
3. 触发步骤
4. 标准预期
5. 当前行为
6. 差异结论
7. 测试覆盖（手工 / 单测 / e2e）

## 4. 当前执行方式

1. 在 playground 打开：`/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0`。
2. 关键行为可通过 `case` 参数一键定位，例如：
3. `/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0&case=cmt-001`
4. `/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0&case=pst-001`
5. `/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0&case=tob-002`
6. 运行自动化回归：`pnpm test:unit` 与 `pnpm test:e2e`。
7. 将结果回写到 `docs/todo/history/behavior-benchmark-todo.md` 执行日志。
8. 交互专项可直接进入：
9. `/scenes/drag-showcase?theme=dark&lang=zh-CN&collab=0`
10. `/scenes/table-showcase?theme=dark&lang=zh-CN&collab=0`

## 5. 首批重点对标范围

1. 输入与选区（含中文输入法）
2. 粘贴与剪贴板（尤其代码块）
3. 撤销重做
4. 块操作（handle、多选、移动、复制、删除）
5. 评论链路（发起、展开、定位、回复）
6. 链接/表格/代码块交互

开发侧对照矩阵入口：

- `/developer/behavior-matrix`

当前差异清单入口：

- `/usage/behavior-gap-analysis`
- `/developer/behavior-gap-analysis`
