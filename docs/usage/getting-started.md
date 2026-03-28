# 使用文档：快速开始

## 1. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

## 2. 启动编辑器 Playground

```bash
pnpm --filter block-editor-playground dev
```

访问后可通过路由切换场景，例如：

- `/scenes/default`
- `/scenes/inline-toolbar`
- `/scenes/minimal`
- `/scenes/block-showcase`
- `/scenes/drag-showcase`
- `/scenes/table-showcase`
- `/scenes/regression`

常用 query：

- `?theme=light|dark|auto`
- `&lang=zh-CN|en-US`
- `&room=xxx&user=xxx`
- `&collab=0|1`（`0` 表示关闭协作，便于本地稳定回归）

## 2.1 运行 E2E 回归（Vitest）

```bash
pnpm --filter block-editor-playground exec playwright install chromium
pnpm --filter block-editor-playground test:e2e
```

说明：

- 该命令会自动启动 Playground 并执行完整行为回归（当前覆盖到 `H3.14`）。
- 用例默认走 `scenes/regression?lang=zh-CN&theme=dark&collab=0`。

## 2.2 运行编辑器单元测试（Vitest）

```bash
pnpm test:unit
# 或
pnpm --filter @block-editor/editor test
```

说明：

- 单元测试统一使用 `vitest`。
- 当前已包含 `SmartPaste` 回归测试（覆盖代码块内粘贴放行与普通 URL 智能粘贴）。

## 3. 启动文档

文档位于当前目录 `docs/`：

```bash
cd docs
pnpm install
pnpm docs:dev
```

构建：

```bash
pnpm docs:build
```

## 4. 最小接入示例

```ts
import { EditorCore, EditorUIRenderer } from "@block-editor/editor";

const core = new EditorCore({
  element: document.createElement("div"),
  i18n: "zh-CN",
  uiConfig: {
    toolbar: { preset: "basic" },
  },
});

new EditorUIRenderer(core, document.querySelector("#app")!, {
  toolbarMode: "top",
  theme: "auto",
  commentPanelDefaultVisible: true,
});
```
