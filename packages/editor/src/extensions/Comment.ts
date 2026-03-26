import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentOptions {
  HTMLAttributes: Record<string, any>
}

export interface CommentReply {
  id: string
  author: string
  text: string
  createdAt: number
}

export interface CommentThread {
  id: string
  author: string
  text: string
  quoteText?: string
  createdAt: number
  resolved: boolean
  replies: CommentReply[]
}

const COMMENT_STORAGE_KEY = 'be-comment-threads-v1'

/** LocalStorage-backed comment store — keyed by commentId */
export class CommentStore {
  private threads: Map<string, CommentThread> = new Map()
  private listeners: Array<() => void> = []

  constructor() {
    this.loadFromStorage()
  }

  on(fn: () => void) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private notify() {
    this.saveToStorage()
    this.listeners.forEach((fn) => fn())
  }

  private saveToStorage() {
    try {
      const payload = JSON.stringify(Array.from(this.threads.values()))
      localStorage.setItem(COMMENT_STORAGE_KEY, payload)
    } catch {
      // ignore persistence failures (private mode / quota)
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(COMMENT_STORAGE_KEY)
      if (!raw) return
      const list = JSON.parse(raw) as CommentThread[]
      this.threads = new Map(list.map((thread) => [thread.id, thread]))
    } catch {
      this.threads = new Map()
    }
  }

  addThread(id: string, text: string, author = '我', quoteText?: string) {
    this.threads.set(id, {
      id,
      author,
      text,
      quoteText,
      createdAt: Date.now(),
      resolved: false,
      replies: [],
    })
    this.notify()
  }

  addReply(threadId: string, text: string, author = '我') {
    const thread = this.threads.get(threadId)
    if (!thread) return
    thread.replies.push({
      id: `${threadId}-r${Date.now()}`,
      author,
      text,
      createdAt: Date.now(),
    })
    this.notify()
  }

  resolve(id: string) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.resolved = true
    this.notify()
  }

  reopen(id: string) {
    const thread = this.threads.get(id)
    if (!thread) return
    thread.resolved = false
    this.notify()
  }

  delete(id: string) {
    this.threads.delete(id)
    this.notify()
  }

  getAll(): CommentThread[] {
    return Array.from(this.threads.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): CommentThread | undefined {
    return this.threads.get(id)
  }
}

/** Singleton store shared between Comment extension and CommentPanel */
export const commentStore = new CommentStore()

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /** Add a comment mark with specific id */
      setComment: (commentId: string) => ReturnType
      /** Remove a comment mark */
      unsetComment: (commentId: string) => ReturnType
      /** Quick comment from current selection */
      addComment: () => ReturnType
    }
  }
}

export const Comment = Mark.create<CommentOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'comment-mark',
      },
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {}
          return { 'data-comment-id': attributes.commentId }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setComment:
        (commentId) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId })
        },

      unsetComment:
        (_commentId) =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },

      addComment:
        () =>
        ({ commands, editor }) => {
          if (editor.state.selection.empty) return false
          const { from, to } = editor.state.selection
          const selected = editor.state.doc.textBetween(from, to, ' ').trim()
          const text = selected ? `关于「${selected.slice(0, 30)}」` : '新评论'
          const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          commentStore.addThread(id, text)
          return commands.setMark(this.name, { commentId: id })
        },
    }
  },
})
