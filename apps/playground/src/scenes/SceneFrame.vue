<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="scene-page">
    <div class="scene-header">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
    <div class="scene-editor">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scene-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.scene-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--pg-border);
  background: var(--pg-surface);
  flex-shrink: 0;
}

.scene-header h2 {
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  color: var(--pg-text);
}

.scene-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pg-text-muted);
}

.scene-editor {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--pg-bg);
}

.scene-editor :deep(.layout) {
  height: 100% !important;
  min-height: 0;
}

.scene-editor :deep(.main-content) {
  min-width: 0;
  min-height: 0;
}

.scene-editor :deep(.editor-scroll-area) {
  min-width: 0;
  min-height: 0;
  padding: 12px;
}

.scene-editor :deep(.editor-container) {
  border-radius: 6px;
  min-height: 100%;
}

.scene-editor :deep(.toolbar) {
  padding: 6px 10px;
}
</style>
