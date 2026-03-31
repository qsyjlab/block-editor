import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Block Editor',
  description: 'Block Editor 使用与开发文档',
  lang: 'zh-CN',
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '使用文档', link: '/usage/getting-started' },
      { text: '开发者文档', link: '/developer/architecture' },
      { text: '代办管理', link: '/todo/current' },
      { text: '审计记录', link: '/ui-audit/color-hardcode-inventory' },
    ],
    sidebar: [
      {
        text: '使用文档',
        items: [
          { text: '介绍', link: '/' },
          { text: '快速开始', link: '/usage/getting-started' },
          { text: '核心配置', link: '/usage/configuration' },
          { text: '操作栏配置', link: '/usage/operation-bars' },
          { text: '快捷键总览', link: '/usage/shortcuts' },
          { text: '布局与模块', link: '/usage/layout-modules' },
          { text: '迁移指南', link: '/usage/migration' },
          { text: '行为基准', link: '/usage/behavior-benchmark' },
          { text: '行为评分卡', link: '/usage/behavior-scorecard' },
          { text: '行为差异清单', link: '/usage/behavior-gap-analysis' },
          { text: '回归清单', link: '/usage/regression-checklist' },
        ],
      },
      {
        text: '开发者文档',
        items: [
          { text: '架构总览', link: '/developer/architecture' },
          { text: '代码地图', link: '/developer/code-map' },
          { text: '调用链路', link: '/developer/call-chains' },
          { text: '行为基准', link: '/developer/behavior-benchmark' },
          { text: '行为评分卡', link: '/developer/behavior-scorecard' },
          { text: '行为对照矩阵', link: '/developer/behavior-matrix' },
          { text: '行为差异盘点', link: '/developer/behavior-gap-analysis' },
          { text: '主题与 UI 规范', link: '/developer/theme-and-ui' },
          {
            text: '快捷键治理计划',
            link: '/developer/shortcut-governance-plan',
          },
          { text: '快捷键入口盘点', link: '/developer/shortcut-inventory' },
          {
            text: '执行工作流标准',
            link: '/developer/execution-workflow-standard',
          },
          { text: '文档更新规范', link: '/developer/doc-update-policy' },
        ],
      },
      {
        text: '代办管理',
        items: [
          { text: '当前代办清单', link: '/todo/current' },
          { text: '已执行代办清单', link: '/todo/executed' },
          {
            text: '执行工作流标准',
            link: '/developer/execution-workflow-standard',
          },
        ],
      },
      {
        text: '审计文档',
        items: [
          {
            text: '颜色硬编码清单',
            link: '/ui-audit/color-hardcode-inventory',
          },
          {
            text: '文案硬编码清单',
            link: '/ui-audit/i18n-hardcoded-text-inventory',
          },
          {
            text: '重复实现清单',
            link: '/ui-audit/duplicate-implementation-inventory',
          },
          { text: '重构风险图', link: '/ui-audit/refactor-risk-map' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/' }],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Block Editor',
    },
  },
})
