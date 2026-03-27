# 使用文档：迁移指南

## 目标

将旧版编辑器接入迁移到当前能力：

- 主题化（light/dark/auto）
- 组件化 UI
- 可配置操作栏
- 可自定义布局与模块挂载

## 迁移步骤

1. 先接入 `EditorCore + EditorUIRenderer` 最小链路。
2. 用 `uiConfig.toolbar` 切到 `basic`，确认核心编辑链路稳定。
3. 再开启 `selectionToolbar`、评论、表格菜单等能力。
4. 最后替换页面硬编码颜色为 token，并跑回归清单。

## 常见问题

### 暗黑模式弹层发白

检查弹层宿主是否挂在 `overlayContainer`。

### 评论面板点击没反应

检查场景布局是否有评论区容器；无容器时应显示为右侧浮层。

### 示例看起来“功能异常”

先用 `preset: "basic"` 验证核心链路，再逐步启用 `full` 项目。
