import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultScenePage from './scenes/pages/DefaultScenePage.vue'
import InlineToolbarScenePage from './scenes/pages/InlineToolbarScenePage.vue'
import MinimalScenePage from './scenes/pages/MinimalScenePage.vue'
import CustomLayoutAScenePage from './scenes/pages/CustomLayoutAScenePage.vue'
import CustomLayoutBScenePage from './scenes/pages/CustomLayoutBScenePage.vue'
import ModularLayoutScenePage from './scenes/pages/ModularLayoutScenePage.vue'
import RegressionScenePage from './scenes/pages/RegressionScenePage.vue'
import BlockShowcaseScenePage from './scenes/pages/BlockShowcaseScenePage.vue'
import BehaviorBenchmarkScenePage from './scenes/pages/BehaviorBenchmarkScenePage.vue'
import DragShowcaseScenePage from './scenes/pages/DragShowcaseScenePage.vue'
import TableShowcaseScenePage from './scenes/pages/TableShowcaseScenePage.vue'
import ShortcutScenePage from './scenes/pages/ShortcutScenePage.vue'
import PluginizedModulesScenePage from './scenes/pages/PluginizedModulesScenePage.vue'
import CustomCommentPanelScenePage from './scenes/pages/CustomCommentPanelScenePage.vue'

export const SCENE_KEYS = [
  'default',
  'inline-toolbar',
  'minimal',
  'custom-layout-a',
  'custom-layout-b',
  'modular-layout',
  'block-showcase',
  'drag-showcase',
  'table-showcase',
  'shortcuts',
  'pluginized-modules',
  'custom-comment-panel',
  'behavior-benchmark',
  'regression',
] as const

export type SceneKey = (typeof SCENE_KEYS)[number]

export interface SceneNavItem {
  key: SceneKey
  title: string
  path: string
  group: 'layout-preset' | 'layout-custom' | 'feature'
}

export interface SceneNavGroup {
  key: SceneNavItem['group']
  title: string
  items: SceneNavItem[]
}

interface SceneRouteRecord extends SceneNavItem {
  component: NonNullable<RouteRecordRaw['component']>
}

const sceneRoutes: SceneRouteRecord[] = [
  {
    key: 'default',
    title: '默认布局（顶部工具栏）',
    path: '/scenes/default',
    component: DefaultScenePage,
    group: 'layout-preset',
  },
  {
    key: 'inline-toolbar',
    title: '行内工具栏模式',
    path: '/scenes/inline-toolbar',
    component: InlineToolbarScenePage,
    group: 'layout-preset',
  },
  {
    key: 'minimal',
    title: '极简模式',
    path: '/scenes/minimal',
    component: MinimalScenePage,
    group: 'layout-preset',
  },
  {
    key: 'custom-layout-a',
    title: '自定义布局 A（评论左侧）',
    path: '/scenes/custom-layout-a',
    component: CustomLayoutAScenePage,
    group: 'layout-custom',
  },
  {
    key: 'custom-layout-b',
    title: '自定义布局 B（左导轨）',
    path: '/scenes/custom-layout-b',
    component: CustomLayoutBScenePage,
    group: 'layout-custom',
  },
  {
    key: 'modular-layout',
    title: '模块化布局（Schema）',
    path: '/scenes/modular-layout',
    component: ModularLayoutScenePage,
    group: 'layout-custom',
  },
  {
    key: 'block-showcase',
    title: '块类型展示分栏（全覆盖）',
    path: '/scenes/block-showcase',
    component: BlockShowcaseScenePage,
    group: 'feature',
  },
  {
    key: 'drag-showcase',
    title: '拖拽专项场景',
    path: '/scenes/drag-showcase',
    component: DragShowcaseScenePage,
    group: 'feature',
  },
  {
    key: 'table-showcase',
    title: '表格专项场景',
    path: '/scenes/table-showcase',
    component: TableShowcaseScenePage,
    group: 'feature',
  },
  {
    key: 'shortcuts',
    title: '快捷键总览',
    path: '/scenes/shortcuts',
    component: ShortcutScenePage,
    group: 'feature',
  },
  {
    key: 'pluginized-modules',
    title: '可插拔模块示例',
    path: '/scenes/pluginized-modules',
    component: PluginizedModulesScenePage,
    group: 'layout-custom',
  },
  {
    key: 'custom-comment-panel',
    title: '自定义评论区（完整功能）',
    path: '/scenes/custom-comment-panel',
    component: CustomCommentPanelScenePage,
    group: 'layout-custom',
  },
  {
    key: 'behavior-benchmark',
    title: '行为基准场景（P0）',
    path: '/scenes/behavior-benchmark',
    component: BehaviorBenchmarkScenePage,
    group: 'feature',
  },
  {
    key: 'regression',
    title: '回归验证场景',
    path: '/scenes/regression',
    component: RegressionScenePage,
    group: 'feature',
  },
]

export const SCENE_NAV_ITEMS: SceneNavItem[] = sceneRoutes.map(({ key, title, path, group }) => ({
  key,
  title,
  path,
  group,
}))

const GROUP_META: Array<Pick<SceneNavGroup, 'key' | 'title'>> = [
  { key: 'layout-preset', title: '布局场景 / 预设' },
  { key: 'layout-custom', title: '布局场景 / 自定义' },
  { key: 'feature', title: '专项与回归' },
]

export const SCENE_NAV_GROUPS: SceneNavGroup[] = GROUP_META.map((group) => ({
  ...group,
  items: SCENE_NAV_ITEMS.filter((item) => item.group === group.key),
}))

const scenePageRoutes: RouteRecordRaw[] = sceneRoutes.map(({ path, component }) => ({
  path,
  component,
}))

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/scenes/default',
    },
    ...scenePageRoutes,
  ],
})
