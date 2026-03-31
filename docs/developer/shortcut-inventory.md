# 快捷键入口盘点（P0-SK1）

最后更新：2026-03-31

本页用于记录快捷键历史入口、迁移状态与统一注册中心映射关系。

## 1. 入口映射表

| 场景              | 历史入口                               | 现状     | 统一 ID              | 说明                                 |
| ----------------- | -------------------------------------- | -------- | -------------------- | ------------------------------------ |
| 打开查找          | `FindReplacePanel.handleGlobalKeydown` | 已迁移   | `find.open`          | `Mod+F`，支持输入控件内触发          |
| 打开替换          | `FindReplacePanel.handleGlobalKeydown` | 已迁移   | `find.openReplace`   | `Mod+H`，支持输入控件内触发          |
| 关闭查找面板      | `FindReplacePanel.handleGlobalKeydown` | 已迁移   | `find.close`         | `Esc`，仅面板打开时生效              |
| 多选清空          | `BlockMultiSelectBar.handleKeyDown`    | 已迁移   | `multiselect.clear`  | `Esc`，仅存在多选时生效              |
| 工具栏 More 关闭  | `Toolbar.handleDocumentKeydown`        | 待迁移   | `toolbar.more.close` | `Esc`                                |
| 下拉菜单关闭      | `ToolbarDropdown` 内部监听             | 待迁移   | `dropdown.close`     | `Esc`                                |
| 下拉菜单键盘导航  | `ToolbarDropdown.handleMenuKeydown`    | 待迁移   | `dropdown.navigate`  | `↑/↓/Enter/Esc`                      |
| 图片预览关闭/切换 | `ImagePreviewModal.handleKeyDown`      | 待迁移   | `image.preview.*`    | `Esc/←/→`                            |
| 评论输入提交      | `CommentPanel` 输入框监听              | 保留本地 | -                    | 输入组件内行为，不走全局分发         |
| Slash 命令导航    | `SlashCommand.addProseMirrorPlugins`   | 保留本地 | -                    | 编辑器输入态插件内行为，不走全局分发 |

## 2. 统一注册中心当前能力

- 提供统一 schema：`id/scope/combo/priority/when/run`。
- 平台键位映射：`mac` 与 `windows` 双定义。
- 冲突检测：同 `scope + combo` 自动告警。
- 输入框安全策略：默认不在 input/textarea/contenteditable 中触发，支持按项放开。

## 3. 下一步迁移顺序

1. `Toolbar` More 菜单 `Esc` 迁移到注册中心。
2. `ToolbarDropdown` 关闭键与导航键迁移。
3. `ImagePreviewModal` `Esc/Arrow` 迁移。
4. 输出“快捷键演示页”数据源（直接读取注册中心）。
