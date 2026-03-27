# block-editor-docs

Block Editor 文档站（VitePress）。

## 文档分区

- `usage/`：给接入方的使用文档
- `developer/`：给维护者的开发文档（含调用链路）
- `ui-audit/`：历史审计与风险资料

## 开发

```bash
pnpm install
pnpm docs:dev
```

## 构建

```bash
pnpm docs:build
```

## 404 排查

如果你看到旧导航（如“指南 / 配置”）或点击后 404：

1. 请在 `docs/` 目录下启动：`pnpm docs:dev`
2. 修改 `docs/.vitepress/config.mts` 后，重启 dev 进程
3. 旧路径兼容入口：
   - `/guide`
   - `/guide/what-is-vitepress`
   - `/reference`
   - `/config`
   - `/config/introduction`
