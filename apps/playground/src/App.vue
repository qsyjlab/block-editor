<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { SCENE_NAV_ITEMS } from './router'

const route = useRoute()
const theme = computed(() => {
  const raw = String(route.query.theme || 'light').toLowerCase()
  return raw === 'dark' || raw === 'auto' ? raw : 'light'
})

const links = computed(() => {
  const query = route.query
  return SCENE_NAV_ITEMS.map((item) => ({
    key: item.key,
    title: item.title,
    to: { path: item.path, query },
  }))
})

const themeLinks = computed(() => {
  const baseQuery = { ...route.query }
  return [
    {
      key: 'light',
      label: '浅色',
      to: { path: route.path, query: { ...baseQuery, theme: 'light' } },
    },
    {
      key: 'dark',
      label: '暗黑',
      to: { path: route.path, query: { ...baseQuery, theme: 'dark' } },
    },
    {
      key: 'auto',
      label: '跟随系统',
      to: { path: route.path, query: { ...baseQuery, theme: 'auto' } },
    },
  ]
})
</script>

<template>
  <div class="app-layout" :data-play-theme="theme">
    <aside class="scene-nav">
      <h1>Playground 场景</h1>
      <p>快速切换布局与操作栏模式</p>
      <div class="theme-switch">
        <RouterLink
          v-for="item in themeLinks"
          :key="item.key"
          :to="item.to"
          class="theme-link"
          :class="{ 'theme-link--active': item.key === theme }"
        >
          {{ item.label }}
        </RouterLink>
      </div>
      <nav>
        <RouterLink
          v-for="item in links"
          :key="item.key"
          :to="item.to"
          class="scene-link"
          active-class="scene-link--active"
        >
          {{ item.title }}
        </RouterLink>
      </nav>
    </aside>
    <main class="scene-main">
      <RouterView />
    </main>
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
    'Helvetica Neue', sans-serif;
}

.app-layout {
  --pg-bg: #f3f4f6;
  --pg-surface: #ffffff;
  --pg-surface-soft: #f9fafb;
  --pg-border: #e5e7eb;
  --pg-text: #111827;
  --pg-text-muted: #6b7280;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--pg-bg);
  color: var(--pg-text);
}

.app-layout[data-play-theme='dark'] {
  --pg-bg: #0f172a;
  --pg-surface: #111827;
  --pg-surface-soft: #1f2937;
  --pg-border: #334155;
  --pg-text: #e5e7eb;
  --pg-text-muted: #94a3b8;
}

.scene-nav {
  width: 250px;
  border-right: 1px solid var(--pg-border);
  background: var(--pg-surface);
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scene-nav h1 {
  margin: 0;
  font-size: 16px;
  color: var(--pg-text);
}

.scene-nav p {
  margin: 0;
  color: var(--pg-text-muted);
  font-size: 12px;
}

.theme-switch {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}

.theme-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--pg-text-muted);
  border: 1px solid var(--pg-border);
  background: var(--pg-surface);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
}

.theme-link--active {
  color: var(--pg-text);
  border-color: var(--primary-color, #3b82f6);
}

.scene-nav nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scene-link {
  display: block;
  text-decoration: none;
  color: var(--pg-text);
  border: 1px solid var(--pg-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  transition: all 0.15s ease;
  background: var(--pg-surface);
}

.scene-link:hover {
  background: var(--pg-surface-soft);
  border-color: var(--pg-border);
}

.scene-link--active {
  background: color-mix(in srgb, var(--primary-color, #3b82f6) 12%, var(--pg-surface));
  border-color: var(--primary-color, #3b82f6);
  color: var(--primary-color, #3b82f6);
}

.scene-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
