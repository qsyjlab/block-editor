import { createRouter, createWebHistory } from "vue-router";
import ScenarioPage from "./scenes/ScenarioPage.vue";

export const SCENE_KEYS = [
  "default",
  "inline-toolbar",
  "minimal",
  "custom-layout-a",
  "custom-layout-b",
  "regression",
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/scenes/default",
    },
    {
      path: "/scenes/:scene",
      component: ScenarioPage,
    },
  ],
});
