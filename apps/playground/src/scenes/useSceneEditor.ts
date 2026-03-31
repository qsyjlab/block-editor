import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { EditorCore } from '@block-editor/editor'

export interface SceneRuntimeContext {
  room: string
  userName: string
  userColor: string
  editorLocale: 'zh-CN' | 'en-US'
  theme: 'light' | 'dark' | 'auto'
  collaborationEnabled: boolean
}

export interface SceneEditorOptions {
  defaultCollaborationEnabled?: boolean
}

function queryValue(input: unknown, fallback: string): string {
  if (typeof input === 'string' && input.trim()) return input
  if (Array.isArray(input) && typeof input[0] === 'string' && input[0].trim()) {
    return input[0]
  }
  return fallback
}

function resolveRuntimeContext(
  sceneKey: string,
  query: Record<string, unknown>,
  options: SceneEditorOptions = {},
): SceneRuntimeContext {
  const room = queryValue(query.room, 'block-editor-demo-room')
  const userName = queryValue(query.user, `用户-${Math.random().toString(36).slice(2, 6)}`)
  const locale = queryValue(query.lang, navigator.language || 'zh-CN').toLowerCase()
  const editorLocale: 'zh-CN' | 'en-US' = locale.startsWith('en') ? 'en-US' : 'zh-CN'
  const rawTheme = queryValue(query.theme, 'light').toLowerCase()
  const theme: 'light' | 'dark' | 'auto' =
    rawTheme === 'dark' || rawTheme === 'auto' ? rawTheme : 'light'
  const defaultCollab = options.defaultCollaborationEnabled ?? true
  const collaborationEnabled = queryValue(query.collab, defaultCollab ? '1' : '0') !== '0'

  return {
    room: `${room}-${sceneKey}`,
    userName,
    userColor: `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`,
    editorLocale,
    theme,
    collaborationEnabled,
  }
}

export function useSceneEditor(
  sceneKey: string,
  editorContainer: Ref<HTMLElement | null>,
  create: (container: HTMLElement, context: SceneRuntimeContext) => EditorCore,
  options: SceneEditorOptions = {},
) {
  const route = useRoute()
  let editor: EditorCore | null = null

  const destroyEditor = () => {
    editor?.destroy()
    editor = null
    if (editorContainer.value) {
      editorContainer.value.innerHTML = ''
    }
  }

  const createEditor = () => {
    const container = editorContainer.value
    if (!container) return
    container.innerHTML = ''
    const context = resolveRuntimeContext(
      sceneKey,
      route.query as unknown as Record<string, unknown>,
      options,
    )
    editor = create(container, context)
  }

  onMounted(createEditor)
  onBeforeUnmount(destroyEditor)

  watch(
    () => [
      route.query.theme,
      route.query.lang,
      route.query.room,
      route.query.user,
      route.query.collab,
    ],
    () => {
      destroyEditor()
      createEditor()
    },
  )
}
