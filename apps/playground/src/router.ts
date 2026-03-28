import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import DefaultScenePage from "./scenes/pages/DefaultScenePage.vue";
import InlineToolbarScenePage from "./scenes/pages/InlineToolbarScenePage.vue";
import MinimalScenePage from "./scenes/pages/MinimalScenePage.vue";
import CustomLayoutAScenePage from "./scenes/pages/CustomLayoutAScenePage.vue";
import CustomLayoutBScenePage from "./scenes/pages/CustomLayoutBScenePage.vue";
import ModularLayoutScenePage from "./scenes/pages/ModularLayoutScenePage.vue";
import RegressionScenePage from "./scenes/pages/RegressionScenePage.vue";
import BlockShowcaseScenePage from "./scenes/pages/BlockShowcaseScenePage.vue";
import BehaviorBenchmarkScenePage from "./scenes/pages/BehaviorBenchmarkScenePage.vue";
import DragShowcaseScenePage from "./scenes/pages/DragShowcaseScenePage.vue";
import TableShowcaseScenePage from "./scenes/pages/TableShowcaseScenePage.vue";

export const SCENE_KEYS = [
  "default",
  "inline-toolbar",
  "minimal",
  "custom-layout-a",
  "custom-layout-b",
  "modular-layout",
  "block-showcase",
  "drag-showcase",
  "table-showcase",
  "behavior-benchmark",
  "regression",
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

export interface SceneNavItem {
  key: SceneKey;
  title: string;
  path: string;
}

interface SceneRouteRecord extends SceneNavItem {
  component: NonNullable<RouteRecordRaw["component"]>;
}

const sceneRoutes: SceneRouteRecord[] = [
  {
    key: "default",
    title: "默认布局（顶部工具栏）",
    path: "/scenes/default",
    component: DefaultScenePage,
  },
  {
    key: "inline-toolbar",
    title: "行内工具栏模式",
    path: "/scenes/inline-toolbar",
    component: InlineToolbarScenePage,
  },
  {
    key: "minimal",
    title: "极简模式",
    path: "/scenes/minimal",
    component: MinimalScenePage,
  },
  {
    key: "custom-layout-a",
    title: "自定义布局 A（评论左侧）",
    path: "/scenes/custom-layout-a",
    component: CustomLayoutAScenePage,
  },
  {
    key: "custom-layout-b",
    title: "自定义布局 B（左导轨）",
    path: "/scenes/custom-layout-b",
    component: CustomLayoutBScenePage,
  },
  {
    key: "modular-layout",
    title: "模块化布局（Schema）",
    path: "/scenes/modular-layout",
    component: ModularLayoutScenePage,
  },
  {
    key: "block-showcase",
    title: "块类型展示分栏（全覆盖）",
    path: "/scenes/block-showcase",
    component: BlockShowcaseScenePage,
  },
  {
    key: "drag-showcase",
    title: "拖拽专项场景",
    path: "/scenes/drag-showcase",
    component: DragShowcaseScenePage,
  },
  {
    key: "table-showcase",
    title: "表格专项场景",
    path: "/scenes/table-showcase",
    component: TableShowcaseScenePage,
  },
  {
    key: "behavior-benchmark",
    title: "行为基准场景（P0）",
    path: "/scenes/behavior-benchmark",
    component: BehaviorBenchmarkScenePage,
  },
  {
    key: "regression",
    title: "回归验证场景",
    path: "/scenes/regression",
    component: RegressionScenePage,
  },
];

export const SCENE_NAV_ITEMS: SceneNavItem[] = sceneRoutes.map(
  ({ key, title, path }) => ({
    key,
    title,
    path,
  }),
);

const scenePageRoutes: RouteRecordRaw[] = sceneRoutes.map(({ path, component }) => ({
  path,
  component,
}));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/scenes/default",
    },
    ...scenePageRoutes,
  ],
});
