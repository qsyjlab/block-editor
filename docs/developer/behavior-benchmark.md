# 开发者文档：行为基准（飞书/语雀对标）

## 1. 基准数据模型

建议统一字段：

1. `id`：行为 ID（如 `PST-004`）
2. `priority`：`P0 | P1 | P2`
3. `category`：输入/选区/粘贴/评论/表格/块操作/快捷键
4. `source`：`feishu | yuque | both`
5. `steps`：复现步骤
6. `expected`：标准预期
7. `current`：当前行为
8. `score`：`0 | 1 | 2`
9. `risk`：`critical | high | medium | low`
10. `coverage`：`manual | unit | e2e`（可多值）

## 2. 行为 ID 规范

- 输入：`INP-xxx`
- 选区：`SEL-xxx`
- 粘贴：`PST-xxx`
- 撤销重做：`UND-xxx`
- 块操作：`BLK-xxx`
- 评论：`CMT-xxx`
- 链接：`LNK-xxx`
- 表格：`TBL-xxx`
- 工具栏：`TOB-xxx`

## 3. 首批 P0 行为基线（初版）

| ID | 分类 | 标准行为摘要 | 单测 | E2E |
| --- | --- | --- | --- | --- |
| INP-001 | 输入 | 中文输入法连续输入不丢字，不跳光标 | 待补 | 待补 |
| SEL-001 | 选区 | Shift 扩展选区与鼠标拖选一致 | 待补 | 已有部分 |
| PST-001 | 粘贴 | 普通段落粘贴 URL 自动转链接 | 已有 | 待补 |
| PST-002 | 粘贴 | 代码块内粘贴保持在代码块，不跳出 | 已有 | 待补 |
| UND-001 | 撤销重做 | 文本输入撤销/重做顺序正确 | 待补 | 待补 |
| BLK-001 | 块操作 | 块手柄移动上下块位置正确 | 待补 | 已有 |
| BLK-002 | 块操作 | 删除块后光标落点符合预期 | 待补 | 待补 |
| CMT-001 | 评论 | 选区发起评论会展开面板并预填引用 | 待补 | 已有 |
| CMT-002 | 评论 | 未确认输入前不自动保存评论 | 待补 | 待补 |
| CMT-003 | 评论 | 点击行内评论标注能定位线程 | 待补 | 已有 |
| LNK-001 | 链接 | 插入链接后预览/跳转正常 | 待补 | 已有 |
| TBL-001 | 表格 | 光标进表格后显示表格工具栏 | 待补 | 已有 |
| TOB-001 | 工具栏 | 顶部与选区工具栏同命令行为一致 | 待补 | 待补 |

## 4. 评分汇总规则（实现建议）

1. 按 `priority` 计算加权总分。
2. 输出 `P0 失败项列表` 作为发布阻断清单。
3. 每次回归输出：
4. 当前总分
5. 与上次差值
6. 新增失败项

## 5. 与测试体系映射

1. `Vitest 单测`：纯逻辑与状态机行为（粘贴策略、命令执行、状态切换）。
2. `Vitest + Playwright e2e`：端到端交互行为（评论、链接、表格、代码块、块操作）。
3. `Playground 场景`：手工验证入口和可视化复现。

## 6. 三方矩阵入口

首版行为对照矩阵已落地，见：

- `/developer/behavior-matrix`

## 7. 差异盘点入口

首轮 Gap Analysis 已落地，见：

- `/developer/behavior-gap-analysis`

## 8. 行为基准场景（Playground）

1. 场景路由：`/scenes/behavior-benchmark`
2. 专项路由：`/scenes/drag-showcase`、`/scenes/table-showcase`
3. 查询参数：`theme/lang/collab/room/user/case`
4. `case` 对应 P0 行为 ID（如 `inp-001`、`cmt-001`、`tob-002`），页面会自动定位到对应复现锚点。
5. 默认无协作干扰（`collab=0`），需要协作联调时显式改为 `collab=1`。
