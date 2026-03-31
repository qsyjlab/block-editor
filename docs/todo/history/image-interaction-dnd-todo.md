# Block Editor 图片交互与拖拽一致性 TODO（新一轮）

> 维护迁移说明（2026-03-28）：本文件转为历史来源，后续执行请统一更新 `docs/todo/current.md`。

最后更新时间：2026-03-28（持续更新）  
负责人：Codex + 你  
当前状态：执行中（Phase B/C/D 第一批已完成）

## 0. 本轮目标

1. 修复图片点击行为，避免误触发、误状态切换、异常插入内容。
2. 重做图片预览弹层样式，交互与视觉对齐飞书类体验（遮罩、层级、关闭路径、内容区）。
3. 图片工具栏改造为与主工具栏同源组件与同风格体系（按钮/下拉/tooltip/i18n）。
4. 修复拖拽交互：不再只有图片可拖拽，所有块类型都支持“长按 handle 拖拽”。
5. 建立自动化回归，防止图片拖拽重复插入、空段落、拖拽失效等问题回归。

## 1. 执行规则（沿用）

1. 每完成一个子任务，立即更新勾选状态。
2. 每次功能完成后，必须同步：
   `docs/usage/*`、`docs/developer/*`、`docs/developer/call-chains.md`、本 TODO 执行日志。
3. 每次提交前必须跑：
   `pnpm --filter @block-editor/editor test`  
   `pnpm --filter block-editor-playground test:e2e`  
   `pnpm --dir docs docs:build`
4. 功能只有在“代码 + 自动化 + 文档 + 日志”齐全后才可标记完成。

## 2. 任务清单（细颗粒）

### Phase A：现状复盘与用例固化

- [ ] A1. 固化 3 个核心问题复现脚本（图片点击异常、预览样式异常、非图片块长按拖拽失败）。
- [ ] A2. 建立“块类型拖拽矩阵”：段落/标题/引用/代码块/列表/Callout/表格/图片。
- [ ] A3. 记录当前状态机（图片选中态、工具栏显示态、预览态、拖拽态）并标注冲突点。
- [ ] A4. 梳理浏览器原生图片拖拽干扰链路（默认 dragstart/drop）。

验收标准：

- [ ] 三类问题都有稳定复现路径。
- [ ] 拖拽矩阵覆盖至少 8 类块。

---

### Phase B：图片点击与工具栏交互重构

- [ ] B1. 定义图片交互状态机：`idle -> selected -> toolbar-open -> preview-open`。
- [x] B2. 明确单击行为：单击图片只进入选中态并展示图片工具栏，不直接触发预览。
- [x] B3. 明确预览触发入口：工具栏“预览”按钮 + 双击图片（可选）。
- [x] B4. 外部点击回收策略：关闭图片工具栏，保留/回收选中态规则统一。
- [ ] B5. 图片 caption 编辑时，块级 handle 不抢焦点不抢 hover。

验收标准：

- [ ] 图片单击行为可预测，不出现误开预览。
- [ ] 工具栏显示/隐藏与选中态一致，无闪烁。

---

### Phase C：图片工具栏样式与组件统一

- [x] C1. 图片工具栏改为复用现有 toolbar 组件体系（按钮、下拉、tooltip）。
- [x] C2. 统一视觉 Token：背景、边框、阴影、hover、active、disabled 与主工具栏一致。
- [x] C3. 支持 i18n 注入（tooltip、aria、下拉项文案）。
- [x] C4. 暗黑/浅色双主题对齐，避免“图片工具栏是另一套样式”。

验收标准：

- [ ] 图片工具栏与顶部 toolbar 视觉一致。
- [ ] 暗黑模式下对比度、边框、文字可读性通过。

---

### Phase D：图片预览弹层重做

- [x] D1. 重做预览弹层结构：遮罩层 + 内容层 + 关闭按钮 + 标题/说明区。
- [x] D2. 交互收口：`Esc`、遮罩点击、关闭按钮统一关闭。
- [x] D3. 锁定背景滚动与层级管理（防止与编辑器浮层冲突）。
- [x] D4. 预览样式对齐参考（飞书风格），并支持暗黑/浅色。
- [x] D5. 大图加载与失败态处理（loading / error fallback）。

验收标准：

- [ ] 预览弹层样式和交互可独立验收。
- [ ] 不出现遮罩层下穿、滚动穿透、关闭失灵。

---

### Phase E：长按 handle 拖拽全类型修复

- [ ] E1. 定义“长按拖拽”触发逻辑（时间阈值 + 位移阈值）。
- [x] E2. `block-handle` 拖拽链路支持全部目标块类型，不只图片。
- [x] E3. 修复原生图片拖拽干扰（阻断默认浏览器 drop 导致的重复插入）。
- [ ] E4. 拖拽落点反馈统一（段落/引用/代码块/表格等一致高亮）。
- [ ] E5. 拖拽结束状态清理（handle、drop target、selection、ghost）统一回收。
- [ ] E6. 修复“拖拽后多插一份图片/文本”的回归问题。

验收标准：

- [ ] 块类型拖拽矩阵全部通过。
- [ ] 不再出现拖拽重复插入和异常空行。

---

### Phase F：自动化与文档收口

- [ ] F1. 新增 e2e：图片点击状态机（单击选中、预览入口、关闭路径）。
- [ ] F2. 新增 e2e：图片预览弹层样式/行为断言（遮罩、关闭、层级）。
- [ ] F3. 新增 e2e：长按 handle 拖拽矩阵（段落/引用/代码块/列表/图片/表格等）。
- [ ] F4. 新增 e2e：阻断原生图片拖拽重复插入回归。
- [x] F5. 更新使用文档：图片操作说明、拖拽说明、异常排查。
- [x] F6. 更新开发文档：状态机、调用链路、关键事件生命周期。
- [ ] F7. 更新行为基准与评分卡（新增 H4 系列行为项）。

验收标准：

- [ ] 自动化全绿且可复现。
- [ ] 使用/开发文档与调用链路同步完成。

## 3. 建议新增回归用例 ID（H4）

1. H4.1 图片单击仅选中并显示图片工具栏（不自动开预览）
2. H4.2 图片预览弹层打开/关闭路径一致（Esc/遮罩/按钮）
3. H4.3 图片工具栏主题一致性（浅色/暗黑）
4. H4.4 长按 handle 拖拽矩阵（非图片块也可拖）
5. H4.5 图片拖拽后不重复插入节点
6. H4.6 拖拽反馈样式一致性（多块类型）

## 4. 执行日志

- 2026-03-28：新建本轮 TODO。目标聚焦：图片点击行为、预览弹层、图片工具栏统一、长按 handle 拖拽全类型修复。待下一步按 Phase A 开始执行。
- 2026-03-28（第1次执行）：
  - 已完成：B2/B3/B4、C1~C4、D1~D5、E2/E3、F5/F6。
  - 关键修复：
    - `SelectionTooltip` 在 `NodeSelection`/`image` 场景下禁用，消除“图片工具栏 + 文本选区工具栏”双栏叠加。
    - `ImageEnhanced` 单击只选中并展示图片工具栏；预览入口收口为“工具栏预览按钮 + 双击”。
    - 预览弹层升级为统一遮罩层，支持 `Esc / backdrop / close` 关闭，带滚动锁与 loading/error 状态。
    - 图片节点禁用原生 `dragstart`，避免浏览器默认图片拖拽链路干扰块拖拽。
    - `block-handle` 去除普通点击前置 `mousedown.preventDefault`，并增加拖拽后短时 click 抑制，提升真实手势拖拽可用性。
  - 验证结果：
    - `pnpm --filter @block-editor/editor test`：22/22 通过
    - `pnpm --filter block-editor-playground test:e2e`：39/39 通过
    - `pnpm --dir docs docs:build`：通过
- 2026-03-28（第2次执行，用户验收反馈修正）：
  - 反馈问题：
    - 图片选中时仍看到“第二套工具栏”。
    - 图片预览在部分交互路径下感知为未生效。
  - 修正动作：
    - 保持 `SelectionTooltip` 在图片 `NodeSelection` 下强制隐藏（互斥规则不变）。
    - 预览触发链路增加兜底：首次点击只选中；再次单击/双击/工具栏预览按钮均可打开预览。
    - 回归用例 H3.9 增补断言：图片选中时文本选区工具栏不可见，并通过图片工具栏按钮验证预览可打开。
  - 验证结果：
    - `pnpm --filter block-editor-playground test:e2e`：39/39 通过
- 2026-03-28（第3次执行，样式链路修正）：
  - 根因：playground 仅加载 `@block-editor/editor/dist/style.css`，在未重新构建 `editor` css 产物时，`src/styles/index.css` 的新样式不会即时体现。
  - 修复：`apps/playground/src/main.ts` 增加开发态源码样式导入 `../../../packages/editor/src/styles/index.css`，确保样式改动可实时生效。
  - 验证：
    - `pnpm --filter block-editor-playground build`：通过
- 2026-03-28（第4次执行，预览组件化）：
  - 按需求将图片预览弹层从 `ImageEnhanced` 内联逻辑抽离为独立组件：
    - 新增 `packages/editor/src/ui/components/ImagePreviewModal.ts`
    - `ImageEnhanced` 只保留触发入口，预览状态统一由组件托管
  - 视觉与交互改造：
    - 黑色半透明遮罩
    - 左右侧关闭按钮
    - 中间大图区域
    - 底部工具栏：上一张 / 下一张 / 比例 / 旋转 / 放大 / 缩小 / 下载
  - 同步更新 i18n：
    - 新增预览工具栏相关词条（中英）
  - 验证结果：
    - `pnpm --filter @block-editor/editor test`：22/22 通过
    - `pnpm --filter block-editor-playground build`：通过
    - `pnpm --filter block-editor-playground test:e2e`：39/39 通过
- 2026-03-28（第5次执行，预览样式生效兜底）：
  - 反馈：预览逻辑已生效，但在 playground 中看起来“没有样式”。
  - 根因：`apps/playground/src/main.ts` 曾仅依赖 `@block-editor/editor/dist/style.css`，当 `editor` 未重新构建时，新加的 `be-image-viewer-*` 样式不会即时进入页面。
  - 修复：
    - 在 `apps/playground/src/main.ts` 追加源码样式导入：
      `../../../packages/editor/src/styles/index.css`
    - 保证开发态下预览遮罩与底部工具栏样式即时可见。
  - 验证结果：
    - `pnpm --filter block-editor-playground build`：通过
- 2026-03-28（第6次执行，预览交互细化）：
  - 反馈：预览存在“双关闭按钮”、工具栏层级被图片覆盖、缺少图片拖拽平移。
  - 修复：
    - `ImagePreviewModal` 关闭入口改为右上角单关闭按钮（保留 `Esc` 与 backdrop 关闭）。
    - 预览图片新增 `pointer` 拖拽平移能力，并与缩放状态联动。
    - 预览底部工具栏改为固定底部高层级，避免被图片覆盖。
  - 文档同步：
    - `docs/developer/call-chains.md` 更新预览链路说明（单关闭按钮 + 拖拽平移）。
    - `docs/usage/regression-checklist.md` 更新图片预览验收项（拖拽平移 + 层级可见性）。
  - 验证结果：
    - `pnpm --filter block-editor-playground build`：通过
    - `pnpm --filter block-editor-playground test:e2e`：39/39 通过
- 2026-03-28（第7次执行，预览样式异常修复）：
  - 反馈：预览样式“整体不正确”（主图/关闭按钮/工具栏表现异常）。
  - 根因：`packages/editor/src/styles/index.css` 在 `.be-image-viewer-close` 规则处缺失 `}`，导致后续 `.be-image-viewer-toolbar` 等大量选择器被错误嵌套到关闭按钮作用域下，弹层样式链路异常。
  - 修复：
    - 补齐 `.be-image-viewer-close` 规则闭合。
    - 将预览工具栏与按钮相关选择器恢复为顶层作用域。
  - 验证结果：
    - `pnpm --filter block-editor-playground build`：通过
