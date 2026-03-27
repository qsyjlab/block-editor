# 使用文档：关键交互回归清单

每轮 UI/交互改动后至少执行一次。

配套基准文档：`/usage/behavior-benchmark`。
差异盘点入口：`/usage/behavior-gap-analysis`。

## 环境准备

1. `pnpm --filter block-editor-playground dev`
2. 建议场景：`/scenes/regression?theme=dark&lang=zh-CN&collab=0`
3. 交叉验证：`theme=light|dark|auto`

自动化回归（推荐先跑）：

1. 首次执行：`pnpm --filter block-editor-playground exec playwright install chromium`
2. 运行：`pnpm --filter block-editor-playground test:e2e`
3. 覆盖项：`H2.1 评论 / H2.2 链接 / H2.3 表格工具栏 / H2.4 block handle / H2.5 selection tooltip / H2.6 撤销重做 / H2.7 快捷键一致性（加粗） / H2.8 Shift+Enter / H2.9 删除块后焦点连续编辑 / H2.10 格式化撤销重做 / H2.11 块上移下移顺序可逆 / H2.12 中文连续输入稳定性冒烟 / H2.13 输入不中断压测 / H2.14 composition 事件链路 / H2.15 快捷键一致性（斜体） / H2.16 选区一致性 / H2.17 顶部-选区工具栏一致性 / H2.18 粘贴落点（当前 skip） / B5 主色联动冒烟`
4. e2e 已内置端口兜底，会自动在 `4174-4274` 中选择可用端口启动 playground。
5. 若在受限沙箱环境出现 `listen EPERM`，需在允许本地端口监听的环境执行。

## 评论链路

1. 选中文本 -> 点击“添加评论” -> 评论区展开并预填引用。
2. 未输入正文时不应直接保存评论。
3. 点击行内评论标注 -> 评论区展开并定位线程。
4. 在 `default / inline-toolbar / custom-layout-a / custom-layout-b / modular-layout / regression` 场景，评论区都应可见且可展开（不允许出现触发后无面板）。

## 链接链路

1. 插入链接弹窗文案随语言变化。
2. hover 内链显示预览；点击 hash 链接跳转到块。

## 表格与块菜单

1. 表格工具栏显示/隐藏正常。
2. block handle 菜单动作可执行且暗黑样式一致。
3. `layoutSchema.modules.blockHandle.enabled=false` 时，块手柄与菜单必须完全隐藏。

## 行内工具栏

1. 选区工具栏图标默认可见，hover/active 状态清晰。
2. 下拉、tooltip 不应出现白底/裁切/错位。

## 记录模板

```md
- 日期：
- 场景：
- 结果：通过/失败
- 失败项：
- 修复记录：
```
