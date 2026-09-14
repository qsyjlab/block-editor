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
import Link from '@tiptap/extension-link'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { CustomCodeBlock } from '../../extensions/CodeBlock'
import { Indent } from '../../extensions/Indent'
import { Callout } from '../../extensions/Callout'
import { Exporter } from '../Exporter'
import { MarkdownImporter } from '../../import/MarkdownImporter'

function createEditor(content: string) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({ codeBlock: false, dropcursor: false }),
      CustomCodeBlock,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Indent,
      Callout,
    ],
    content,
  })
}

const CASE_HEADINGS_TABLE = `
<h1>一级标题</h1>
<h2>二级标题</h2>
<table>
  <tr><th>姓名</th><th>年龄</th></tr>
  <tr><td>张三</td><td>28</td></tr>
  <tr><td>李四</td><td>32</td></tr>
</table>
<p>表格后的段落</p>
`

const CASE_TABLE_EMPTY_CELLS = `
<table>
  <tr><th>A</th><th>B</th></tr>
  <tr><td></td><td>filled</td></tr>
</table>
`

const CASE_CALLOUT_TABLE = `
<div data-callout-type="info"><p>提示内容</p></div>
<table>
  <tr><th>列一</th><th>列二</th></tr>
  <tr><td>甲</td><td>乙</td></tr>
</table>
`

const CASE_CODEBLOCK = `
<pre><code>const a = 1</code></pre>
<p>after code</p>
`

const CASE_TASKLIST_DIVIDER = `
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>已完成事项</p></li>
  <li data-type="taskItem" data-checked="false"><p>未完成事项</p></li>
</ul>
<hr />
<p>结束段落</p>
`

describe('Exporter.toMarkdownText（EXP-001 回归）', () => {
  it('连续标题 + 表格：表格应导出为 GFM 表格而不是代码块', async () => {
    const editor = createEditor(CASE_HEADINGS_TABLE)
    const markdown = await new Exporter(editor).toMarkdownText()

    expect(markdown).toContain('# 一级标题')
    expect(markdown).toContain('## 二级标题')
    expect(markdown).toContain('| 姓名 | 年龄 |')
    expect(markdown).toContain('| --- | --- |')
    expect(markdown).toContain('| 张三 | 28 |')
    expect(markdown).toContain('表格后的段落')
    expect(markdown).not.toContain('```')
    editor.destroy()
  })

  it('表格空单元格：导出后单元格结构保持', async () => {
    const editor = createEditor(CASE_TABLE_EMPTY_CELLS)
    const markdown = await new Exporter(editor).toMarkdownText()

    expect(markdown).toContain('| A | B |')
    expect(markdown).toContain('| --- | --- |')
    expect(markdown).toMatch(/\|\s*\|\s*filled\s*\|/)
    editor.destroy()
  })

  it('Callout + 表格相邻：callout 导出为引用标记，表格仍为 GFM', async () => {
    const editor = createEditor(CASE_CALLOUT_TABLE)
    const markdown = await new Exporter(editor).toMarkdownText()

    expect(markdown).toContain('[!INFO]')
    expect(markdown).toContain('提示内容')
    expect(markdown).toContain('| 列一 | 列二 |')
    expect(markdown).not.toContain('```')
    editor.destroy()
  })

  it('代码块导出为 fenced code', async () => {
    const editor = createEditor(CASE_CODEBLOCK)
    const markdown = await new Exporter(editor).toMarkdownText()

    expect(markdown).toContain('```')
    expect(markdown).toContain('const a = 1')
    editor.destroy()
  })

  it('待办列表 + 分割线导出结构一致', async () => {
    const editor = createEditor(CASE_TASKLIST_DIVIDER)
    const markdown = await new Exporter(editor).toMarkdownText()

    expect(markdown).toMatch(/-\s+\[x\] 已完成事项/)
    expect(markdown).toMatch(/-\s+\[ \] 未完成事项/)
    expect(markdown).toContain('---')
    expect(markdown).toContain('结束段落')
    editor.destroy()
  })

  it('导出后再导入：表格仍是表格节点（EXP-004 闭环）', async () => {
    const source = createEditor(CASE_HEADINGS_TABLE)
    const markdown = await new Exporter(source).toMarkdownText()
    source.destroy()

    const target = createEditor('<p>placeholder</p>')
    new MarkdownImporter(target).importText(markdown)
    const json = target.getJSON()
    const nodeTypes = new Set<string>()
    JSON.stringify(json, (_key, value) => {
      if (value && typeof value === 'object' && value.type) nodeTypes.add(value.type)
      return value
    })
    expect(nodeTypes.has('table')).toBe(true)
    expect(nodeTypes.has('tableHeader')).toBe(true)
    expect(nodeTypes.has('tableCell')).toBe(true)
    expect(nodeTypes.has('codeBlock')).toBe(false)
    target.destroy()
  })
})
