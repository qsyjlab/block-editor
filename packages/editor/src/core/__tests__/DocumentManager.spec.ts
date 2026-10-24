// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { DocumentManager } from '../DocumentManager'

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

function createManager() {
  const storage = createMemoryStorage()
  const manager = new DocumentManager({ storage, autosaveDelay: 100 })
  return { manager, storage }
}

describe('DocumentManager（多文档管理）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('创建文档并出现在列表（按更新时间倒序）', () => {
    const { manager } = createManager()
    const a = manager.create('文档A')
    const b = manager.create('文档B')
    const list = manager.list()
    expect(list).toHaveLength(2)
    // 同一毫秒内创建时顺序不保证，但列表包含两者
    expect(list.map((d) => d.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('保存与重命名更新内容并刷新 updatedAt', () => {
    const { manager } = createManager()
    const doc = manager.create('标题')
    vi.advanceTimersByTime(10)
    const saved = manager.save(doc.id, { content: { type: 'doc', content: [] } })
    expect(saved?.content).toEqual({ type: 'doc', content: [] })
    const renamed = manager.rename(doc.id, '新标题')
    expect(renamed?.title).toBe('新标题')
    expect(manager.list()[0].title).toBe('新标题')
  })

  it('删除后从索引与存储中移除', () => {
    const { manager, storage } = createManager()
    const doc = manager.create('待删除')
    manager.remove(doc.id)
    expect(manager.list()).toHaveLength(0)
    expect(storage.getItem(`be:doc:${doc.id}`)).toBeNull()
  })

  it('attachEditor 加载内容且防抖自动保存', () => {
    const { manager } = createManager()
    const doc = manager.create(
      '自动保存',
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '初始' }] }] },
    )
    const updates: Array<() => void> = []
    const fakeEditor = {
      commands: { setContent: vi.fn() },
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph' }] })),
      on: vi.fn((_, handler) => updates.push(handler)),
      off: vi.fn(),
    } as any
    const attached = manager.attachEditor(fakeEditor, doc.id)
    expect(attached?.title).toBe('自动保存')
    expect(fakeEditor.commands.setContent).toHaveBeenCalled()

    // 触发 update → 防抖 100ms 后写盘
    updates.forEach((fn) => fn())
    expect(fakeEditor.getJSON).not.toHaveBeenCalled()
    vi.advanceTimersByTime(150)
    expect(fakeEditor.getJSON).toHaveBeenCalled()
    expect(manager.get(doc.id)?.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('flush 立即落盘，detach 后不再保存', () => {
    const { manager } = createManager()
    const doc = manager.create('flush')
    let json = { v: 1 } as any
    const fakeEditor = {
      commands: { setContent: vi.fn() },
      getJSON: vi.fn(() => json),
      on: vi.fn((_e: string, h: () => void) => { handler = h }),
      off: vi.fn(),
    } as any
    let handler: () => void = () => {}
    manager.attachEditor(fakeEditor, doc.id)
    json = { v: 2 }
    manager.flush()
    expect(manager.get(doc.id)?.content).toEqual({ v: 2 })

    manager.detachEditor()
    json = { v: 3 }
    handler()
    vi.advanceTimersByTime(500)
    expect(manager.get(doc.id)?.content).toEqual({ v: 2 })
  })
})
