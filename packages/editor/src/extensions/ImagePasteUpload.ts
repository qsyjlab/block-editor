import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'

export const imagePasteUploadPluginKey = new PluginKey('imagePasteUpload')

export interface ImagePasteUploadOptions {
  /**
   * 自定义上传函数（接入方可传对象存储/OSS 逻辑），返回图片 URL。
   * 默认使用 base64 dataURL 内联。
   */
  upload?: (file: File) => Promise<string>
  /** 允许的最大文件体积（MB），默认 20 */
  maxFileSizeMb?: number
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function extractImageFiles(items: DataTransferItemList | null | undefined): File[] {
  if (!items) return []
  const files: File[] = []
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file && file.type.startsWith('image/')) files.push(file)
  }
  return files
}

/**
 * 本地图片粘贴/拖入直传（对齐飞书文档体验）：
 * - 粘贴截图或复制本地图片文件 → 直接插入编辑器；
 * - 拖拽图片文件进编辑器 → 同样插入；
 * - 默认 base64 内联，接入方通过 `upload` 选项接对象存储。
 */
export const ImagePasteUpload = Extension.create<ImagePasteUploadOptions>({
  name: 'imagePasteUpload',

  addOptions() {
    return {
      upload: undefined,
      maxFileSizeMb: 20,
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    const maxBytes = (extension.options.maxFileSizeMb ?? 20) * 1024 * 1024
    // eslint-disable-next-line no-console
    console.log('[ipt-debug] maxBytes=', maxBytes, 'options=', JSON.stringify(extension.options))

    const insertImageFile = (view: import('prosemirror-view').EditorView, file: File) => {
      if (file.size > maxBytes) {
        // 体积超限：静默交给默认行为，避免打断粘贴流程
        return false
      }
      const insert = (src: string) => {
        const { schema } = view.state
        const node = schema.nodes.image?.create({ src })
        if (!node) return
        const tr = view.state.tr.replaceSelectionWith(node)
        view.dispatch(tr)
      }
      const position = view.state.selection.from

      if (extension.options.upload) {
        // 先插占位避免丢焦点，上传完成后替换 src
        const placeholderId = `uploading-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const placeholder = view.state.schema.nodes.image?.create({
          src: '',
          alt: placeholderId,
        })
        if (placeholder) {
          view.dispatch(view.state.tr.replaceSelectionWith(placeholder))
          extension.options
            .upload(file)
            .then((src) => {
              const { doc } = view.state
              doc.descendants((node, pos) => {
                if (node.type.name === 'image' && node.attrs.alt === placeholderId) {
                  view.dispatch(
                    view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src, alt: null }),
                  )
                  return false
                }
                return true
              })
            })
            .catch(() => {
              // 上传失败：移除占位
              const { doc } = view.state
              doc.descendants((node, pos) => {
                if (node.type.name === 'image' && node.attrs.alt === placeholderId) {
                  view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize))
                  return false
                }
                return true
              })
            })
        }
        return true
      }

      void position
      fileToDataUrl(file)
        .then(insert)
        .catch(() => {})
      return true
    }

    return [
      new Plugin({
        key: imagePasteUploadPluginKey,
        props: {
          handlePaste(view, event) {
            // 先按体积过滤：全部超限时放行默认行为，不吞事件
            const files = extractImageFiles(event.clipboardData?.items).filter(
              (file) => file.size <= maxBytes,
            )
            if (files.length === 0) return false
            event.preventDefault()
            files.forEach((file) => insertImageFile(view, file))
            return true
          },
          handleDrop(view, event) {
            const files = extractImageFiles(event.dataTransfer?.items).filter(
              (file) => file.size <= maxBytes,
            )
            if (files.length === 0) return false
            event.preventDefault()
            // 落点定位：拖到具体位置时把光标移过去再插入
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
            if (coords) {
              const { state } = view
              view.dispatch(
                state.tr.setSelection(TextSelection.near(state.doc.resolve(coords.pos))),
              )
            }
            files.forEach((file) => insertImageFile(view, file))
            return true
          },
        },
      }),
    ]
  },
})
