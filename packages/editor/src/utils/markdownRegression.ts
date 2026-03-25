export interface MarkdownRegressionCase {
  name: string
  input: string
  expectedIncludes: string[]
}

export interface MarkdownRegressionResult {
  name: string
  passed: boolean
  missing: string[]
  output: string
}

export const DEFAULT_MARKDOWN_REGRESSION_CASES: MarkdownRegressionCase[] = [
  {
    name: 'Callout + 段落',
    input: '> [!INFO]\n> 这是提示块\n\n普通段落',
    expectedIncludes: ['[!INFO]', '普通段落'],
  },
  {
    name: '任务列表',
    input: '- [x] 已完成\n- [ ] 待办',
    expectedIncludes: ['- [x] 已完成', '- [ ] 待办'],
  },
  {
    name: '缩进标记',
    input: '[indent:2] 二级缩进段落',
    expectedIncludes: ['[indent:2] 二级缩进段落'],
  },
  {
    name: '表格',
    input: '| 列1 | 列2 |\n| --- | --- |\n| A | B |',
    expectedIncludes: ['| 列1 | 列2 |', '| A | B |'],
  },
  {
    name: '代码块',
    input: '```ts\nconst a = 1\n```',
    expectedIncludes: ['```ts', 'const a = 1'],
  },
  {
    name: '嵌套列表',
    input: '- 一级\n  - 二级\n    - 三级',
    expectedIncludes: ['- 一级', '- 二级', '- 三级'],
  },
]

export function normalizeMarkdownForCompare(md: string): string {
  return md
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
