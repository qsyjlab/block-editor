import { Editor, JSONContent } from '@tiptap/core'

export interface PerformanceBenchmarkOptions {
  paragraphs?: number
  selectionOps?: number
}

export interface PerformanceBenchmarkResult {
  timestamp: number
  paragraphs: number
  selectionOps: number
  setContentMs: number
  getJSONMs: number
  selectionSweepMs: number
  insertMs: number
  totalMs: number
}

function createLargeDoc(paragraphs: number): JSONContent {
  const content: JSONContent[] = []
  for (let i = 0; i < paragraphs; i += 1) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `基线段落 ${i + 1} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        },
      ],
    })
  }

  return {
    type: 'doc',
    content,
  }
}

export async function runEditorPerformanceBenchmark(
  editor: Editor,
  options: PerformanceBenchmarkOptions = {},
): Promise<PerformanceBenchmarkResult> {
  const paragraphs = Math.max(100, options.paragraphs ?? 2000)
  const selectionOps = Math.max(20, options.selectionOps ?? 200)

  const original = editor.getJSON()
  const doc = createLargeDoc(paragraphs)

  const startAll = performance.now()

  const t0 = performance.now()
  editor.commands.setContent(doc, true)
  const setContentMs = performance.now() - t0

  const t1 = performance.now()
  editor.getJSON()
  const getJSONMs = performance.now() - t1

  const t2 = performance.now()
  const maxPos = Math.max(2, editor.state.doc.content.size - 1)
  for (let i = 0; i < selectionOps; i += 1) {
    const pos = 1 + Math.floor(Math.random() * maxPos)
    editor.chain().setTextSelection(pos).run()
  }
  const selectionSweepMs = performance.now() - t2

  const t3 = performance.now()
  const endPos = Math.max(1, editor.state.doc.content.size - 1)
  editor.chain().focus().setTextSelection(endPos).insertContent('性能基线').run()
  const insertMs = performance.now() - t3

  editor.commands.setContent(original, true)

  const totalMs = performance.now() - startAll

  return {
    timestamp: Date.now(),
    paragraphs,
    selectionOps,
    setContentMs,
    getJSONMs,
    selectionSweepMs,
    insertMs,
    totalMs,
  }
}
