import { Node, mergeAttributes } from '@tiptap/core'

/**
 * 分栏排版（对齐飞书文档「分栏」）：
 * - columns 容器 + 若干 column 子栏，每栏可放任意块；
 * - 均分宽度，栏间虚线分隔；插入时可选 2/3 栏；
 * - Markdown/DOCX 导出按栏顺序线性化（结构降级为顺序内容）。
 */
export interface ColumnsOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** 在当前光标插入一个 N 栏分栏块 */
      insertColumns: (options?: { columnCount?: number }) => ReturnType
    }
  }
}

const makeColumnContent = (count: number) =>
  Array.from({ length: count }, () => ({
    type: 'column',
    content: [{ type: 'paragraph' }],
  }))

export const Columns = Node.create<ColumnsOptions>({
  name: 'columns',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  group: 'block',
  content: 'column+',
  defining: true,

  addAttributes() {
    return {
      columnCount: {
        default: 2,
        parseHTML: (element) => Number(element.getAttribute('data-columns')) || 2,
        renderHTML: (attributes) => ({ 'data-columns': attributes.columnCount }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'columns',
        'data-columns': node.attrs.columnCount,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      insertColumns:
        (options?: { columnCount?: number }) =>
        ({ chain }: { chain: () => any }) => {
          const count = Math.min(4, Math.max(2, options?.columnCount ?? 2))
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { columnCount: count },
              content: makeColumnContent(count),
            })
            .run()
        },
    }
  },
})

export const Column = Node.create<ColumnsOptions>({
  name: 'column',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'column' }),
      0,
    ]
  },
})

/** 分栏 → 顺序内容（导出降级用）：按栏顺序取出内部块 */
export function flattenColumnsToBlocks(json: any): any[] {
  const out: any[] = []
  const walk = (node: any) => {
    if (!node) return
    if (node.type === 'columns') {
      for (const child of node.content ?? []) walk(child)
      return
    }
    if (node.type === 'column') {
      for (const child of node.content ?? []) out.push(child)
      return
    }
    out.push(node)
  }
  walk(json)
  return out
}

/** 导出辅助：编辑器 JSON 中若含分栏，先展平为顺序块（供 Markdown/DOCX 复用） */
export function flattenColumnsInDocJson(docJson: any): any {
  if (!docJson || docJson.type !== 'doc' || !Array.isArray(docJson.content)) return docJson
  return { ...docJson, content: flattenColumnsToBlocks(docJson.content) }
}
