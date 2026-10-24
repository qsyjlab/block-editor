import type { Editor } from '@tiptap/core'

export interface StoredDocument {
  id: string
  title: string
  content: any
  createdAt: number
  updatedAt: number
}

export interface DocumentManagerOptions {
  /** localStorage 前缀，默认 be:doc: */
  storageKey?: string
  /** 自动保存防抖毫秒，默认 800；0 关闭自动保存 */
  autosaveDelay?: number
  /** 存储后端，默认 window.localStorage（可注入 mock 测试） */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

/**
 * 多文档管理（对齐飞书文档列表）：
 * - localStorage 持久化（key = `${storageKey}${id}`，索引存 `${storageKey}index`）；
 * - 新建/重命名/删除/列表（按 updatedAt 倒序）；
 * - attachEditor 后编辑内容防抖自动保存（attach 时 save() 一次防止挂载即写脏数据由调用方控制）。
 * 纯逻辑无 DOM 依赖，方便单测与上层任意 UI 接入。
 */
export class DocumentManager {
  private storageKey: string
  private autosaveDelay: number
  private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  private attached: {
    editor: Editor
    docId: string
    timer: number | null
    handler: () => void
  } | null = null

  constructor(options: DocumentManagerOptions = {}) {
    this.storageKey = options.storageKey ?? 'be:doc:'
    this.autosaveDelay = options.autosaveDelay ?? 800
    this.storage =
      options.storage ??
      (typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          })
  }

  /** 文档索引（手动排序，create 置顶），不按时间重排 */
  list(): StoredDocument[] {
    const ids = this.readIndex()
    const docs: StoredDocument[] = []
    for (const id of ids) {
      const doc = this.readOne(id)
      if (doc) docs.push(doc)
    }
    return docs
  }

  /**
   * 手动排序（拖拽）：把 id 移到 targetId 前/后；targetId 为 null 时移到最前。
   * 自动保存不改变排序，顺序只由本方法与 create 调整。
   */
  reorder(id: string, targetId: string | null, position: 'before' | 'after' = 'before'): void {
    if (id === targetId) return
    const ids = this.readIndex()
    const from = ids.indexOf(id)
    if (from < 0) return
    ids.splice(from, 1)
    if (targetId === null || position === 'before') {
      const to = targetId === null ? 0 : ids.indexOf(targetId)
      if (to < 0) {
        ids.push(id)
      } else {
        ids.splice(to, 0, id)
      }
    } else {
      const to = ids.indexOf(targetId)
      if (to < 0) {
        ids.push(id)
      } else {
        ids.splice(to + 1, 0, id)
      }
    }
    this.writeIndex(ids)
  }

  create(title = '未命名文档', content?: any): StoredDocument {
    const now = Date.now()
    const doc: StoredDocument = {
      id: `d-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      createdAt: now,
      updatedAt: now,
    }
    this.writeOne(doc)
    this.writeIndex([doc.id, ...this.readIndex()])
    return doc
  }

  get(id: string): StoredDocument | null {
    return this.readOne(id)
  }

  save(id: string, patch: Partial<Pick<StoredDocument, 'title' | 'content'>>): StoredDocument | null {
    const doc = this.readOne(id)
    if (!doc) return null
    const next: StoredDocument = {
      ...doc,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      updatedAt: Date.now(),
    }
    this.writeOne(next)
    return next
  }

  rename(id: string, title: string): StoredDocument | null {
    return this.save(id, { title })
  }

  remove(id: string): void {
    this.storage.removeItem(this.keyFor(id))
    this.writeIndex(this.readIndex().filter((x) => x !== id))
    if (this.attached?.docId === id) this.detachEditor()
  }

  /** 把编辑器挂到某文档：加载内容并启动防抖自动保存 */
  attachEditor(editor: Editor, id: string): StoredDocument | null {
    const doc = this.readOne(id)
    if (!doc) return null
    this.detachEditor()
    editor.commands.setContent(doc.content ?? { type: 'doc', content: [] })
    const handler = () => {
      const attached = this.attached
      if (!attached) return
      if (this.autosaveDelay <= 0) return
      if (attached.timer) window.clearTimeout(attached.timer)
      attached.timer = window.setTimeout(() => {
        if (!this.attached) return
        this.save(this.attached.docId, { content: this.attached.editor.getJSON() })
      }, this.autosaveDelay)
    }
    editor.on('update', handler)
    this.attached = { editor, docId: id, timer: null, handler }
    return doc
  }

  /** 手动立即保存当前挂载编辑器的内容 */
  flush(): void {
    const attached = this.attached
    if (!attached) return
    if (attached.timer) {
      window.clearTimeout(attached.timer)
      attached.timer = null
    }
    this.save(attached.docId, { content: attached.editor.getJSON() })
  }

  detachEditor(): void {
    if (!this.attached) return
    this.attached.editor.off('update', this.attached.handler)
    if (this.attached.timer) window.clearTimeout(this.attached.timer)
    this.attached = null
  }

  destroy(): void {
    this.detachEditor()
  }

  private keyFor(id: string) {
    return `${this.storageKey}${id}`
  }

  private readIndex(): string[] {
    try {
      const raw = this.storage.getItem(`${this.storageKey}index`)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private writeIndex(ids: string[]) {
    this.storage.setItem(`${this.storageKey}index`, JSON.stringify(ids))
  }

  private readOne(id: string): StoredDocument | null {
    try {
      const raw = this.storage.getItem(this.keyFor(id))
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !parsed.id) return null
      return parsed as StoredDocument
    } catch {
      return null
    }
  }

  private writeOne(doc: StoredDocument) {
    this.storage.setItem(this.keyFor(doc.id), JSON.stringify(doc))
  }
}
