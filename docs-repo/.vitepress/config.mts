import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Block Editor",
  description: "Block Editor 使用文档",
  lang: "zh-CN",
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "配置", link: "/reference/configuration" },
      { text: "回归", link: "/guide/regression-checklist" },
      { text: "审计记录", link: "/ui-audit/color-hardcode-inventory" },
    ],
    sidebar: [
      {
        text: "开始",
        items: [
          { text: "介绍", link: "/" },
          { text: "快速开始", link: "/guide/getting-started" },
          { text: "回归清单", link: "/guide/regression-checklist" },
        ],
      },
      {
        text: "参考",
        items: [
          { text: "配置说明", link: "/reference/configuration" },
          { text: "操作栏配置", link: "/reference/operation-bars" },
          { text: "模块化布局", link: "/reference/layout-modules" },
          { text: "迁移与接入", link: "/reference/migration" },
        ],
      },
      {
        text: "审计文档",
        items: [
          {
            text: "颜色硬编码清单",
            link: "/ui-audit/color-hardcode-inventory",
          },
          {
            text: "文案硬编码清单",
            link: "/ui-audit/i18n-hardcoded-text-inventory",
          },
          {
            text: "重复实现清单",
            link: "/ui-audit/duplicate-implementation-inventory",
          },
          { text: "重构风险图", link: "/ui-audit/refactor-risk-map" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/" }],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Block Editor",
    },
  },
});
