# 重构风险图（Phase A5）

更新时间：2026-03-26

## 风险分级

- `R1`：高风险（牵涉核心交互与状态）
- `R2`：中风险（牵涉多个模块联动）
- `R3`：低风险（样式替换或局部组件化）

## R1 高风险项

### 1. SelectionTooltip 初始化与 EditorCore 依赖时序

位置：

- `packages/editor/src/extensions/SelectionTooltip.ts`
- `packages/editor/src/core/EditorCore.ts`

风险点：

- 插件初始化时机早于部分 UI 配置注入时机，容易出现“header 可用、selection 不可用”的行为不一致。

控制策略：

1. 所有事件触发路径统一经过 `EditorCore.events`。
2. 增加 selection toolbar 的冒烟验证（评论展开、链接插入、清除格式）。

### 2. CommentPanel 选择区暂存与跳转联动

位置：`packages/editor/src/ui/CommentPanel.ts`

风险点：

- 存在 pending selection、引用预览、跳转、创建评论的状态联动，改动容易引入“错位评论”。

控制策略：

1. 保留“创建前恢复 selection”逻辑。
2. 每次改动后人工验证：打开评论 -> 输入 -> 添加 -> 跳转。

### 3. EditorUIRenderer 布局容器责任过重

位置：`packages/editor/src/ui/EditorUIRenderer.ts`

风险点：

- 同时承担布局、模块挂载、事件转发、链接预览等职责，改为模块化时容易回归。

控制策略：

1. 先加模块接口，再迁移具体模块。
2. `layoutBuilder` 保留兼容，分阶段替换。

## R2 中风险项

### 1. Dropdown 统一抽离

位置：

- `ToolbarDropdown`
- `block-handle`
- `SlashCommand`

风险点：

- 交互细节不同（键盘、hover、portal、动画），强行一次性统一风险大。

控制策略：

1. 先统一样式与 item 数据结构。
2. 再统一事件模型与渲染容器。

### 2. i18n 文案补齐

位置：多个 UI 模块

风险点：

- 大量 `aria-label` 和 tooltip 也要迁移，漏项概率高。

控制策略：

1. 建立词条命名规范。
2. 每个模块迁移后做“可见文案+无障碍文案”双检查。

## R3 低风险项

1. 纯样式 token 替换（不改结构、不改事件）。
2. playground 场景页视觉微调。

## 建议的风险顺序

1. 先完成低风险样式收口（R3）。
2. 再做中风险组件抽离（R2）。
3. 最后做高风险模块化重构（R1）。
