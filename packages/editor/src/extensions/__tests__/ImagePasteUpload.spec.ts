// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { ImagePasteUpload } from '../ImagePasteUpload'

function createEditor(content = '<p>hello</p>') {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({ codeBlock: false, dropcursor: false }),
      Image,
      ImagePasteUpload,
    ],
    content,
  })
}

// jsdom 未实现 DataTransfer/ClipboardEvent 构造器，用最小 stub 模拟
// items 需要模拟 DataTransferItemList 的 {kind, type, getAsFile} 协议
class FakeDataTransfer {
  private list: Array<{ kind: string; type: string; file?: File }> = []
  data: Record<string, string> = {}

  items = {
    add: (input: File | string, type?: string) => {
      if (typeof input === 'string') {
        const mime = type || 'text/plain'
        this.list.push({ kind: 'string', type: mime })
        this.data[mime] = input
      } else {
        this.list.push({ kind: 'file', type: input.type, file: input })
      }
      return null as never
    },
    length: 0,
  }

  constructor() {
    const self = this
    Object.defineProperty(this.items, 'length', {
      get() {
        return self.list.length
      },
    })
    ;[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((index) => {
      Object.defineProperty(this.items, index, {
        get() {
          return self.list[index]
            ? {
                kind: self.list[index].kind,
                type: self.list[index].type,
                getAsFile: () => self.list[index].file || null,
              }
            : undefined
        },
      })
    })
  }

  files: File[] = []
  getData(type: string) {
    return this.data[type] || ''
  }
}

function makePasteEvent(data: { files?: File[]; plain?: string }): ClipboardEvent {
  const dt = new FakeDataTransfer()
  ;(data.files || []).forEach((f) => dt.items.add(f))
  if (data.plain) dt.items.add(data.plain, 'text/plain')
  const event: Record<string, unknown> = {
    clipboardData: dt,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true
    },
  }
  return event as unknown as ClipboardEvent
}

function pasteEvent(editor: Editor, event: ClipboardEvent) {
  editor.view.someProp('handlePaste', (fn) => fn(editor.view, event as ClipboardEvent, null as never))
}

function makePngFile(name = 'shot.png'): File {
  // 1x1 透明 PNG
  const bytes = Uint8Array.from(atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ), (c) => c.charCodeAt(0))
  return new File([bytes], name, { type: 'image/png' })
}

function pasteFiles(editor: Editor, files: File[]): ClipboardEvent {
  const event = makePasteEvent({ files })
  pasteEvent(editor, event)
  return event
}

function imageCount(editor: Editor): number {
  let count = 0
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'image') count += 1
    return true
  })
  return count
}

describe('ImagePasteUpload（本地图片粘贴直传）', () => {
  it('粘贴图片文件插入 base64 图片节点并阻止默认行为', async () => {
    const editor = createEditor()
    const event = pasteFiles(editor, [makePngFile()])
    expect(event.defaultPrevented).toBe(true)

    // FileReader 异步读 base64，轮询等待插入
    await new Promise<void>((resolve) => {
      let tries = 0
      const tick = () => {
        if (imageCount(editor) > 0 || tries > 30) return resolve()
        tries += 1
        setTimeout(tick, 50)
      }
      tick()
    })
    expect(imageCount(editor)).toBe(1)
    let src = ''
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'image') src = node.attrs.src
      return true
    })
    expect(src).toMatch(/^data:image\/png;base64,/)
    editor.destroy()
  })

  it('粘贴纯文本不受影响（不吞事件）', () => {
    const editor = createEditor()
    const event = makePasteEvent({ plain: '普通文本' })
    const handled = editor.view.someProp('handlePaste', (fn) =>
      fn(editor.view, event as ClipboardEvent, null as never),
    )
    expect(handled).toBeFalsy()
    editor.destroy()
  })

  it('超限文件不插入、不阻止默认行为', () => {
    const Limited = ImagePasteUpload.configure({ maxFileSizeMb: 0 })
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, dropcursor: false }),
        Image,
        Limited,
      ],
      content: '<p>hello</p>',
    })
    const event = pasteFiles(editor, [makePngFile()])
    const handledDirect = editor.view.someProp('handlePaste', (fn) => fn(editor.view, event as ClipboardEvent, null as never))
    console.log('[dbg] handledDirect=', handledDirect, 'fileSize=', makePngFile().size, 'defaultPrevented=', event.defaultPrevented, 'options=', JSON.stringify((ImagePasteUpload as any).options))
    expect(event.defaultPrevented).toBe(false)
    expect(imageCount(editor)).toBe(0)
    editor.destroy()
  })
})
