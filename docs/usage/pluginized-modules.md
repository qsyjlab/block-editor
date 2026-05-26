# 使用文档：可插拔评论与大纲

本页说明如何把评论面板与大纲从内置 UI 中解耦，改成由业务侧自定义渲染（例如抽屉、侧栏、浮层），并通过 `EditorUIRenderer` 暴露的 API 获取数据与控制行为。

## 1. 适用场景

- 你希望评论区不是固定右侧栏，而是外部抽屉/弹窗。
- 你希望大纲渲染成业务自己的导航组件。
- 你希望只复用编辑器的数据与命令，不复用默认面板 UI。

## 2. 注入插件（outline/commentPanel）

推荐通过 `layout` 单入口配置插件：

```ts
import { EditorCore, EditorUIRenderer } from '@block-editor/editor'

const core = new EditorCore({
  element: document.createElement('div'),
  i18n: 'zh-CN',
})

const renderer = new EditorUIRenderer(core, document.querySelector('#app')!, {
  theme: 'auto',
  toolbarMode: 'top',
  layout: {
    preset: 'editor-outline-comment',
    plugins: {
      outline: {
        mount: ({ renderer, regionContainer }) => {
          if (!regionContainer) return
          regionContainer.innerHTML = '<div class="my-outline">自定义大纲</div>'

          const unsub = renderer.onOutlineDataChange((headings) => {
            regionContainer.innerHTML = headings
              .map((item) => `<div data-pos="${item.pos}">H${item.level} ${item.text}</div>`)
              .join('')
          })

          regionContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            const pos = Number(target.dataset.pos || 0)
            if (!pos) return
            core.editor.commands.focus(pos)
          })

          return { unmount: () => unsub() }
        },
      },
      commentPanel: {
        mount: ({ renderer, regionContainer }) => {
          if (!regionContainer) return
          regionContainer.innerHTML = '<div class="my-comment-panel">自定义评论区</div>'

          const unsub = renderer.onCommentDataChange((threads) => {
            regionContainer.innerHTML = `
              <div class="my-comment-panel">
                <h4>评论(${threads.length})</h4>
                ${threads
                  .map(
                    (thread) =>
                      `<button data-id="${thread.id}">${thread.quoteText || '无引用'}</button>`,
                  )
                  .join('')}
              </div>
            `
          })

          const onClick = (e: Event) => {
            const target = e.target as HTMLElement
            const id = target.dataset.id
            if (!id) return
            renderer.getCommentPanelController().focusThread(id)
          }

          regionContainer.addEventListener('click', onClick)

          return {
            setVisible: (visible) => {
              regionContainer.style.display = visible ? 'block' : 'none'
            },
            focusThread: (commentId) => {
              const node = regionContainer.querySelector(
                `[data-id="${commentId}"]`,
              ) as HTMLElement | null
              node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              node?.focus()
            },
            unmount: () => {
              unsub()
              regionContainer.removeEventListener('click', onClick)
            },
          }
        },
      },
    },
  },
})
```

## 3. 外部控制评论区（抽屉按钮示例）

```ts
const comment = renderer.getCommentPanelController()

document.querySelector('#open-comment')?.addEventListener('click', () => {
  comment.open()
})

document.querySelector('#toggle-comment')?.addEventListener('click', () => {
  comment.toggle()
})

document.querySelector('#create-comment')?.addEventListener('click', () => {
  const ok = comment.createFromSelection()
  if (!ok) {
    console.warn('当前选区无法创建评论')
  }
})
```

## 4. 外部获取数据（大纲/评论）

```ts
const headingSnapshot = renderer.getOutlineData()
const commentSnapshot = renderer.getCommentThreads()

const offOutline = renderer.onOutlineDataChange((headings) => {
  console.log('outline changed', headings)
})

const offComments = renderer.onCommentDataChange((threads) => {
  console.log('comment changed', threads)
})

offOutline()
offComments()
```

## 5. 外部抽屉布局建议

推荐做法：

1. 让 `layout.builder` 负责容器编排（编辑区 + 业务抽屉容器）。
2. 用 `layout.plugins.commentPanel` 把评论面板挂到抽屉容器。
3. 用 `getCommentPanelController()` 统一开关，避免多处状态分叉。

```ts
new EditorUIRenderer(core, root, {
  layout: {
    builder: ({ container }) => {
      const toolbar = document.createElement('div')
      const main = document.createElement('div')
      const editor = document.createElement('div')
      const drawer = document.createElement('aside')

      main.style.display = 'grid'
      main.style.gridTemplateColumns = '1fr 360px'
      main.append(editor, drawer)
      container.append(toolbar, main)

      return {
        toolbarContainer: toolbar,
        editorContainer: editor,
        scrollContainer: editor,
        overlayContainer: container,
        commentContainer: drawer,
      }
    },
    plugins: {
      commentPanel: {
        mount: ({ regionContainer }) => {
          if (!regionContainer) return
          regionContainer.innerHTML = '<div>业务抽屉评论区</div>'
          return {
            setVisible: (visible) => {
              regionContainer.style.display = visible ? 'block' : 'none'
            },
          }
        },
      },
    },
  },
})
```

## 6. 对应演示场景

- `/scenes/pluginized-modules`
- `/scenes/custom-comment-panel`（完整自定义评论区：创建/筛选/回复/解决/重开/删除/定位）

## 7. 推荐复用方式：插件工厂

当评论区/大纲逻辑较复杂时，建议把 `mount` 逻辑提炼为工厂函数，场景页只保留装配代码。

```ts
import { createCustomCommentPanelPlugin } from '../plugins/createCustomCommentPanelPlugin'
import { createCustomOutlinePlugin } from '../plugins/createCustomOutlinePlugin'

new EditorUIRenderer(core, container, {
  layout: {
    preset: 'editor-outline-comment',
    plugins: {
      outline: createCustomOutlinePlugin({
        title: '业务大纲',
      }),
      commentPanel: createCustomCommentPanelPlugin({
        title: '业务评论区',
        description: '可复用评论插件工厂',
      }),
    },
  },
})
```

参考实现：

- `apps/playground/src/scenes/plugins/createCustomCommentPanelPlugin.ts`
- `apps/playground/src/scenes/plugins/createCustomOutlinePlugin.ts`
- `apps/playground/src/scenes/pages/CustomCommentPanelScenePage.vue`
- `apps/playground/src/scenes/pages/PluginizedModulesScenePage.vue`

## 8. 外部抽屉布局（完整装配示例）

如果你希望评论区放在业务抽屉中，而不是默认右侧栏，可以直接用 `layout.builder` 组装：

```ts
new EditorUIRenderer(core, container, {
  layout: {
    builder: ({ container, editorCore }) => {
      // 1) 自己创建 toolbar/editor/drawer 容器
      // 2) 返回 slots: toolbarContainer/editorContainer/scrollContainer/outlineContainer/commentContainer
      // 3) 在 drawer 顶部自定义按钮，通过 editorCore.events.emit('toggleCommentPanel') 控制评论开关
      return slots
    },
    plugins: {
      outline: createCustomOutlinePlugin(),
      commentPanel: createCustomCommentPanelPlugin(),
    },
  },
})
```

完整可运行场景：

- `/scenes/custom-drawer-modules`
