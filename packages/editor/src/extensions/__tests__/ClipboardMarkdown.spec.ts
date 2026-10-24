// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TextSelection } from 'prosemirror-state'
import { ClipboardMarkdown } from '../ClipboardMarkdown'

function createEditor(content: string) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({ codeBlock: false, dropcursor: false }),
      ClipboardMarkdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
  })
}

function serializeSelection(editor: Editor): string | null {
  const serializer = editor.view.someProp('clipboardTextSerializer') as
    | ((slice: { size: number; content: unknown }) => string)
    | undefined
  if (!serializer) throw new Error('clipboardTextSerializer prop not registered')
  const slice = editor.state.selection.content()
  return serializer(slice)
}

describe('ClipboardMarkdown（EXP-003 复制链路一致性）', () => {
  it('选区含表格：text/plain 输出 GFM 表格而不是原始 HTML', () => {
    const editor = createEditor(
      '<p>前面段落</p><table><tr><th>姓名</th><th>年龄</th></tr><tr><td>张三</td><td>28</td></tr></table><p>后面段落</p>',
    )
    // 选中表格及其后段落（跳过第一段，验证片段序列化）
    const $from = editor.state.doc.resolve(2)
    const $to = editor.state.doc.resolve(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, $from.pos, $to.pos)))

    const plain = serializeSelection(editor)
    expect(plain).toBeTruthy()
    expect(plain).toContain('| 姓名 | 年龄 |')
    expect(plain).toContain('| 张三 | 28 |')
    expect(plain).not.toContain('<table')
    expect(plain).toContain('后面段落')
    editor.destroy()
  })

  it('选区含任务列表：勾选框保留 GFM 形态', () => {
    const editor = createEditor(
      `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>已完成事项</p></li><li data-type="taskItem" data-checked="false"><p>未完成事项</p></li></ul>`,
    )
    const $from = editor.state.doc.resolve(1)
    const $to = editor.state.doc.resolve(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, $from.pos, $to.pos)))

    const plain = serializeSelection(editor)
    expect(plain).toMatch(/-\s+\[x\] 已完成事项/)
    expect(plain).toMatch(/-\s+\[ \] 未完成事项/)
    editor.destroy()
  })

  it('空选区返回空字符串，不产生垃圾内容', () => {
    const editor = createEditor('<p>内容</p>')
    const $cursor = editor.state.doc.resolve(1)
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, $cursor.pos)),
    )
    expect(serializeSelection(editor)).toBe('')
    editor.destroy()
  })
})
