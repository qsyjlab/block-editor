import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentStore } from '../Comment'

function createLocalStorageMock(seed?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(seed || {}))
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

describe('CommentStore', () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })
  })

  it('should add / resolve / reopen / delete thread and replies', () => {
    const store = new CommentStore()
    const listener = vi.fn()
    const dispose = store.on(listener)

    store.addThread('c1', 'first comment', 'Tester', 'quoted')
    const thread = store.get('c1')
    expect(thread).toBeTruthy()
    expect(thread?.author).toBe('Tester')
    expect(thread?.quoteText).toBe('quoted')
    expect(thread?.resolved).toBe(false)

    store.addReply('c1', 'reply text', 'Reviewer')
    expect(store.get('c1')?.replies.length).toBe(1)
    expect(store.get('c1')?.replies[0].author).toBe('Reviewer')

    store.resolve('c1')
    expect(store.get('c1')?.resolved).toBe(true)
    store.reopen('c1')
    expect(store.get('c1')?.resolved).toBe(false)

    store.delete('c1')
    expect(store.get('c1')).toBeUndefined()
    expect(listener).toHaveBeenCalled()

    dispose()
  })

  it('should load existing threads from localStorage', () => {
    const payload = JSON.stringify([
      {
        id: 'loaded-1',
        author: 'Alice',
        text: 'loaded comment',
        quoteText: 'loaded quote',
        createdAt: 1000,
        resolved: false,
        replies: [],
      },
    ])
    const localStorageMock = createLocalStorageMock({
      'be-comment-threads-v1': payload,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })

    const store = new CommentStore()
    const loaded = store.getAll()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('loaded-1')
    expect(loaded[0].text).toBe('loaded comment')
    expect(loaded[0].quoteText).toBe('loaded quote')
  })
})
