import { describe, expect, it, vi } from 'vitest'

vi.mock('prosemirror-model', () => ({
  Fragment: {
    fromArray: (nodes: unknown[]) => nodes,
  },
}))

import { BlockMultiSelect } from '../BlockMultiSelect'

type NodeLike = {
  nodeSize: number
  type?: unknown
  isTextblock?: boolean
  content?: unknown
  textContent?: string
  attrs?: Record<string, unknown>
  marks?: unknown[]
}

function createEditorMock(entries: Array<{ offset: number; node: NodeLike }>) {
  const doc = {
    content: { size: entries.reduce((acc, item) => acc + item.node.nodeSize, 0) },
    forEach: (cb: (node: NodeLike, offset: number) => void) => {
      entries.forEach((item) => cb(item.node, item.offset))
    },
    nodeAt: (pos: number) => entries.find((item) => item.offset === pos)?.node ?? null,
  }

  const tr: any = {
    doc,
    docChanged: false,
    delete: vi.fn(() => {
      tr.docChanged = true
      return tr
    }),
    replaceWith: vi.fn(() => {
      tr.docChanged = true
      return tr
    }),
    setMeta: vi.fn(() => tr),
  }

  const dispatch = vi.fn()
  const storage = {
    blockMultiSelect: {
      selectedPositions: new Set<number>(),
    },
  }

  return {
    editor: {
      storage,
      state: {
        doc,
        tr,
        schema: {
          nodes: {},
          text: (text: string) => ({ text }),
        },
      },
      view: {
        dispatch,
      },
    },
    tr,
    dispatch,
    storage: storage.blockMultiSelect,
  }
}

function getCommands() {
  return (BlockMultiSelect as any).config.addCommands.call({}) as Record<
    string,
    (...args: any[]) => (props: { editor: any }) => boolean
  >
}

describe('BlockMultiSelect Commands', () => {
  it('should toggle and clear selected block positions', () => {
    const { editor, tr, storage, dispatch } = createEditorMock([
      { offset: 0, node: { nodeSize: 2 } },
    ])
    const commands = getCommands()

    expect(commands.toggleBlockSelection(0)({ editor })).toBe(true)
    expect(storage.selectedPositions.has(0)).toBe(true)
    expect(dispatch).toHaveBeenCalledWith(tr)

    expect(commands.toggleBlockSelection(0)({ editor })).toBe(true)
    expect(storage.selectedPositions.has(0)).toBe(false)

    storage.selectedPositions.add(0)
    expect(commands.clearBlockSelection()({ editor })).toBe(true)
    expect(storage.selectedPositions.size).toBe(0)
  })

  it('should range-select offsets between start and end', () => {
    const { editor, storage } = createEditorMock([
      { offset: 0, node: { nodeSize: 2 } },
      { offset: 2, node: { nodeSize: 2 } },
      { offset: 4, node: { nodeSize: 2 } },
    ])
    const commands = getCommands()

    expect(commands.rangeSelectBlocks(4, 0)({ editor })).toBe(true)
    expect(Array.from(storage.selectedPositions).sort((a, b) => a - b)).toEqual([0, 2, 4])
  })

  it('should delete selected blocks in descending offset order', () => {
    const { editor, tr, storage } = createEditorMock([
      { offset: 0, node: { nodeSize: 2 } },
      { offset: 2, node: { nodeSize: 3 } },
    ])
    const commands = getCommands()

    storage.selectedPositions.add(0)
    storage.selectedPositions.add(2)
    expect(commands.deleteSelectedBlocks()({ editor })).toBe(true)
    expect(tr.delete).toHaveBeenNthCalledWith(1, 2, 5)
    expect(tr.delete).toHaveBeenNthCalledWith(2, 0, 2)
    expect(storage.selectedPositions.size).toBe(0)
  })

  it('should convert selected blocks to paragraph nodes', () => {
    const paragraphType = {
      create: vi.fn((_attrs: unknown, content?: unknown) => ({
        kind: 'paragraph',
        nodeSize: 2,
        content,
      })),
    }
    const headingNode = {
      nodeSize: 2,
      type: { name: 'heading' },
      isTextblock: true,
      content: { text: 'hello' },
      attrs: { level: 2 },
      marks: [],
    }
    const paragraphNode = {
      nodeSize: 2,
      type: paragraphType,
      isTextblock: true,
      content: { text: 'world' },
      attrs: {},
      marks: [],
    }

    const { editor, tr, storage } = createEditorMock([
      { offset: 0, node: headingNode },

      { offset: 2, node: paragraphNode },
    ])
    ;(editor.state.schema.nodes as any).paragraph = paragraphType as any

    const commands = getCommands()
    storage.selectedPositions.add(0)
    expect(commands.convertSelectedBlocks('paragraph')({ editor })).toBe(true)
    expect(paragraphType.create).toHaveBeenCalled()
    expect(tr.replaceWith).toHaveBeenCalled()
  })

  it('should move selected blocks up and update selected offsets', () => {
    const { editor, tr, storage } = createEditorMock([
      { offset: 0, node: { nodeSize: 2, id: 'A' } as any },
      { offset: 2, node: { nodeSize: 2, id: 'B' } as any },
      { offset: 4, node: { nodeSize: 2, id: 'C' } as any },
    ])
    const commands = getCommands()
    storage.selectedPositions.add(2)

    expect(commands.moveSelectedBlocks('up')({ editor })).toBe(true)
    expect(tr.replaceWith).toHaveBeenCalled()
    expect(Array.from(storage.selectedPositions)).toEqual([0])
  })

  it('should move selected blocks to target position as a group', () => {
    const { editor, tr, storage } = createEditorMock([
      { offset: 0, node: { nodeSize: 2, id: 'A' } as any },
      { offset: 2, node: { nodeSize: 2, id: 'B' } as any },
      { offset: 4, node: { nodeSize: 2, id: 'C' } as any },
      { offset: 6, node: { nodeSize: 2, id: 'D' } as any },
    ])
    const commands = getCommands()

    storage.selectedPositions.add(0)
    storage.selectedPositions.add(2)

    expect(commands.moveSelectedBlocksToTarget(6, 'after')({ editor })).toBe(true)
    expect(tr.replaceWith).toHaveBeenCalled()
    expect(Array.from(storage.selectedPositions).sort((a, b) => a - b)).toEqual([4, 6])
  })
})
