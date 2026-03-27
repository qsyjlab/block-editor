# 使用文档：行为差异清单（首轮）

更新时间：2026-03-27

该页面是行为基准的“当前状态快照”，帮助你快速知道哪些能力已对齐飞书/语雀，哪些还在修复中。

## 1. 当前结论（P0）

1. 已通过：评论主链路、链接插入与锚点跳转、表格行操作、块手柄可见与菜单、块删除后焦点回归、块上移下移顺序、基础粘贴策略、格式化撤销重做、中文输入稳定性（含 composition 模拟）、快捷键一致性（加粗/斜体）、选区一致性、顶部/选区工具栏命令一致性。
2. 部分通过：粘贴后光标落点（无头环境粘贴自动化链路仍不稳定）。
3. 未通过：暂无 P0 阻断项。

说明：按照发布门槛，存在 P0 未通过项时，不建议对外发布为“行为对齐版本”。

## 2. 你可以怎么验收

1. 打开 `/scenes/regression?theme=dark&lang=zh-CN&collab=0`。
2. 先跑自动化：
3. `pnpm --filter @block-editor/editor test`
4. `pnpm --filter block-editor-playground test:e2e`
5. 当前 e2e 已覆盖 19 条场景，其中 18 条通过、1 条暂时 skip（H2.18 粘贴落点）。
6. 再按 `/usage/regression-checklist` 手工过一遍输入、撤销重做、块删除落点、快捷键一致性。

## 3. 追踪入口

1. 三方行为矩阵：`/developer/behavior-matrix`
2. 差异盘点明细：`/developer/behavior-gap-analysis`
3. 总计划与执行日志：仓库根目录 `behavior-benchmark-todo.md`
