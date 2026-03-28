# 使用文档：关键交互回归清单

每轮 UI/交互改动后至少执行一次。

配套基准文档：`/usage/behavior-benchmark`。
差异盘点入口：`/usage/behavior-gap-analysis`。

## 环境准备

1. `pnpm --filter block-editor-playground dev`
2. 建议场景：`/scenes/regression?theme=dark&lang=zh-CN&collab=0`
3. 行为基准场景：`/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0`
4. 行为直达示例：`/scenes/behavior-benchmark?theme=dark&lang=zh-CN&collab=0&case=cmt-001`
5. 交叉验证：`theme=light|dark|auto`

自动化回归（推荐先跑）：

1. 首次执行：`pnpm --filter block-editor-playground exec playwright install chromium`
2. 运行：`pnpm --filter block-editor-playground test:e2e`
3. 覆盖项：`H2.1 评论 / H2.2 链接 / H2.3 表格工具栏 / H2.4 block handle / H2.5 selection tooltip / H2.6 撤销重做 / H2.7 快捷键一致性（加粗） / H2.8 Shift+Enter / H2.9 删除块后焦点连续编辑 / H2.10 格式化撤销重做 / H2.11 块上移下移顺序可逆 / H2.12 中文连续输入稳定性冒烟 / H2.13 输入不中断压测 / H2.14 composition 事件链路 / H2.15 快捷键一致性（斜体） / H2.16 选区一致性 / H2.17 顶部-选区工具栏一致性 / H2.18 粘贴落点 / H2.19 代码块复制粘贴与光标保持 / H2.20 评论双路径一致性 / H2.21 表格工具栏快捷键一致性 / H2.22 跨块撤销重做 / H3.1 评论回复与解决重开 / H3.2 下拉键盘导航与 Esc / H3.3 暗黑弹层对比度 / H3.4 粘贴撤销 / H3.5 链接编辑撤销重做 / H3.6 块复制 / H3.7 粘贴图片链接自动转图片 / H3.8 块拖拽排序反馈 / H3.9 图片对齐与说明稳定 / H3.10 代码块语言单击切换 / H3.11 表格 handle 点击高亮 / H3.12 图片拖拽空段落防回归 / H3.13 拖拽专项反馈 / H3.14 表格场景 handle 边界 / H3.15 图片操作边界分层 / H3.16 代码块语言连续切换稳定 / B5 主色联动冒烟`
4. e2e 已内置端口兜底，会自动在 `4174-6174` 中选择可用端口启动 playground。
5. 若在受限沙箱环境出现 `listen EPERM`，需在允许本地端口监听的环境执行。

## 评论链路

1. 选中文本 -> 点击“添加评论” -> 评论区展开并预填引用。
2. 选中文本后，顶部工具栏“添加评论”与选区工具栏“添加评论”应保持一致行为（都预填引用且不自动保存）。
3. 未输入正文时不应直接保存评论。
4. 点击行内评论标注 -> 评论区展开并定位线程。
5. 在 `default / inline-toolbar / custom-layout-a / custom-layout-b / modular-layout / behavior-benchmark / drag-showcase / table-showcase / regression` 场景，评论区都应可见且可展开（不允许出现触发后无面板）。

## 链接链路

1. 插入链接弹窗文案随语言变化。
2. hover 内链显示预览；点击 hash 链接跳转到块。

## 表格与块菜单

1. 表格工具栏显示/隐藏正常。
2. 表格左上角专属 handle 可见，点击后整表出现高亮选中态。
3. 表格 handle 在表格边缘应稳定可点，不应出现“鼠标刚移过去就消失”。
4. 表格区域优先表格 handle，块级 handle 不应抢占造成误判。
5. block handle 菜单动作可执行且暗黑样式一致。
6. `layoutSchema.modules.blockHandle.enabled=false` 时，块手柄与菜单必须完全隐藏。

## 行内工具栏

1. 选区工具栏图标默认可见，hover/active 状态清晰。
2. 下拉、tooltip 不应出现白底/裁切/错位。

## 代码块高亮

1. 代码块语言切换后应立即出现对应语法高亮（首次切换允许轻微加载延迟）。
2. 语言下拉单击一个选项即可切换，不应需要点击两次。
3. 首次切到某语言后再次切换同语言，不应重复卡顿（应命中已加载缓存）。
4. 暗黑/浅色模式下 token 颜色都应可读，不出现“全白/全灰”。
5. 连续切换 3 次以上语言，最终语言正确且菜单不残留加载态。

## 图片预览

1. 图片点击一次进入选择态并显示对齐工具条。
2. 图片选中后不应再出现一套“文本选区工具栏”，页面只保留图片工具条。
3. 打开预览入口为：再次单击图片、双击图片、或图片工具条“预览”按钮。
4. 预览是黑色半透明遮罩，右上角关闭按钮可用。
5. 预览底部工具栏应可用：上一张、下一张、比例、旋转、放大、缩小、下载。
6. 预览支持 backdrop 点击、Esc 关闭。
7. 预览中支持拖拽图片位置（平移）以及缩放联动（含滚轮缩放）。
8. 预览底部工具栏层级应高于图片与编辑区，不可被覆盖。
9. 图片中部交互时优先图片自身操作（预览/对齐/resize），左侧边缘才出现块级 handle。
10. 图片 caption 当前为暂时关闭状态，不作为本轮回归失败项。

## 记录模板

```md
- 日期：
- 场景：
- 结果：通过/失败
- 失败项：
- 修复记录：
```
