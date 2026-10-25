import { Editor } from '@tiptap/core'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

/**
 * Serialize editor content to JSON
 */
export const toJSON = (editor: Editor) => {
  return editor.getJSON()
}

/**
 * Serialize editor content to HTML
 */
export const toHTML = (editor: Editor) => {
  return editor.getHTML()
}

function normalizeCalloutLabel(type: string): 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' {
  if (type === 'success') return 'SUCCESS'
  if (type === 'warning') return 'WARNING'
  if (type === 'danger') return 'DANGER'
  return 'INFO'
}

// turndown 会把 `[!INFO]` 之类的标记转义成 `\[!INFO\]`，导出后需要还原
const CALLOUT_MARKER_ESCAPE_PATTERN = /\\\[!(INFO|SUCCESS|WARNING|DANGER)\\\]/g

/**
 * 缩进属性用文本前缀保留，导入时再还原为 data-indent
 */
function liftIndentToTextPrefix(doc: Document) {
  doc
    .querySelectorAll<HTMLElement>(
      'p[data-indent],h1[data-indent],h2[data-indent],h3[data-indent],h4[data-indent],h5[data-indent],h6[data-indent]',
    )
    .forEach((el) => {
      const level = Number(el.getAttribute('data-indent') || 0)
      if (level <= 0) return
      const prefix = `[indent:${level}] `
      if (el.firstChild?.nodeType === Node.TEXT_NODE) {
        el.firstChild.textContent = `${prefix}${el.firstChild.textContent || ''}`
      } else {
        el.insertBefore(doc.createTextNode(prefix), el.firstChild)
      }
    })
}

/**
 * callout 保留为 [!TYPE] 风格的 blockquote
 */
function calloutToBlockquote(doc: Document) {
  doc.querySelectorAll('div[data-callout-type]').forEach((callout) => {
    const calloutType = normalizeCalloutLabel(callout.getAttribute('data-callout-type') || 'info')
    const blockquote = doc.createElement('blockquote')

    const marker = doc.createElement('p')
    marker.textContent = `[!${calloutType}]`
    blockquote.appendChild(marker)

    const contentEl = callout.querySelector('.be-callout-content') as HTMLElement | null
    const source = contentEl || callout

    Array.from(source.children).forEach((child) => {
      blockquote.appendChild(child.cloneNode(true))
    })

    if (blockquote.children.length === 1) {
      const empty = doc.createElement('p')
      empty.textContent = ''
      blockquote.appendChild(empty)
    }

    callout.replaceWith(blockquote)
  })
}

/**
 * 目录块导出为纯文本标题列表（目录是动态视图，导出降级为条目文本）
 */
function tocBlockToPlainList(doc: Document) {
  doc.querySelectorAll('div[data-type="toc-block"]').forEach((toc) => {
    const maxLevel = Number(toc.getAttribute('data-max-level')) || 3
    const plain = doc.createElement('div')
    plain.setAttribute('data-type', 'toc-placeholder')
    let found = 0
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      const level = Number(h.tagName.slice(1))
      if (level > maxLevel) return
      const text = (h.textContent || '').trim()
      if (!text) return
      found += 1
      const line = doc.createElement('p')
      line.textContent = `${'  '.repeat(level - 1)}· ${text}`
      plain.appendChild(line)
    })
    if (found === 0) {
      plain.textContent = '（目录：文档暂无标题）'
    }
    toc.replaceWith(plain)
  })
}

/**
 * 表格规范化为 turndown-plugin-gfm 可识别的形状。
 *
 * ProseMirror 输出的表格带 `<colgroup>`、`colspan/rowspan` 属性和单元格内块级 `<p>`，
 * gfm 插件匹配不到自己的 table 规则会把整张表降级为原始 HTML 透传（EXP-001 的根因）。
 * 降级约定：
 * - 合并单元格（colspan/rowspan）在 GFM 中无法表达 → 整表保留原始 HTML，结构无损；
 * - 无表头表格 → 首行升为表头（GFM 必须有 header row）；
 * - 单元格内多段落/列表 → 拍平为单行文本，用空格连接（结构保真优先，样式降级可接受）。
 */
function normalizeTablesForGfm(doc: Document) {
  Array.from(doc.querySelectorAll('table')).forEach((table) => {
    // ProseMirror 会给所有单元格输出 colspan="1"/rowspan="1"，只有真实跨度 >1 才无法用 GFM 表达
    const hasSpanningCell = Array.from(table.querySelectorAll('[colspan], [rowspan]')).some(
      (el) =>
        Number(el.getAttribute('colspan') || 1) > 1 || Number(el.getAttribute('rowspan') || 1) > 1,
    )
    if (hasSpanningCell) return
    table
      .querySelectorAll('[colspan="1"], [rowspan="1"]')
      .forEach((el) => {
        el.removeAttribute('colspan')
        el.removeAttribute('rowspan')
      })

    table.querySelectorAll('colgroup').forEach((el) => el.remove())

    if (!table.querySelector('th')) {
      const firstRow = table.querySelector('tr')
      if (!firstRow) return
      Array.from(firstRow.children).forEach((cell) => {
        const th = doc.createElement('th')
        th.innerHTML = cell.innerHTML
        cell.replaceWith(th)
      })
    }

    const cells = Array.from(table.querySelectorAll('th, td'))
    // 嵌套表格无法安全降级，整表保留原始 HTML
    if (cells.some((cell) => cell.querySelector('table'))) return

    cells.forEach((cell) => {
      const blocks = Array.from(
        cell.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, pre, blockquote'),
      )
      // 只取顶层块：li 内部的 p、嵌套表格里的块不算独立行
      const topLevel = blocks.filter(
        (block) => !blocks.some((other) => other !== block && other.contains(block)),
      )
      if (topLevel.length === 0) return
      const lines = topLevel.map((block) =>
        block.tagName === 'LI' ? `• ${block.innerHTML}` : block.innerHTML,
      )
      cell.innerHTML = lines.join(' ')
    })
  })
}

/**
 * 任务列表规范化为 GFM taskListItem：
 * `<li><label><input></label><div><p>内容</p></div></li>` → `<li><input checked>内容</li>`
 * gfm 只识别 input 直接位于 li 下的形状，label/div 包裹会导致勾选框丢失。
 */
function normalizeTaskListsForGfm(doc: Document) {
  Array.from(doc.querySelectorAll('ul[data-type="taskList"]')).forEach((ul) => {
    ul.removeAttribute('data-type')
    Array.from(ul.children).forEach((li) => {
      if (li.tagName !== 'LI') return

      const checkbox = li.querySelector('input[type="checkbox"]')
      const checked =
        li.getAttribute('data-checked') === 'true' ||
        Boolean(checkbox?.hasAttribute('checked')) ||
        (checkbox as HTMLInputElement | null)?.checked === true
      li.removeAttribute('data-checked')

      li.querySelectorAll(':scope > label').forEach((label) => label.remove())

      // 解开内容包裹层 <div>：段落与嵌套列表上移为 li 直接子级
      Array.from(li.children).forEach((child) => {
        if (child.tagName !== 'DIV') return
        const parent = child.parentNode
        if (!parent) return
        while (child.firstChild) parent.insertBefore(child.firstChild, child)
        child.remove()
      })

      // 列表项内容必须是行内：直接子级 <p> 解开（嵌套列表不动）
      Array.from(li.children).forEach((child) => {
        if (child.tagName !== 'P') return
        const parent = child.parentNode
        if (!parent) return
        while (child.firstChild) parent.insertBefore(child.firstChild, child)
        child.remove()
      })

      const input = doc.createElement('input')
      input.setAttribute('type', 'checkbox')
      if (checked) input.setAttribute('checked', '')
      li.insertBefore(input, li.firstChild)
    })
  })
}

/**
 * 导出前把编辑器 HTML 规范化为 Markdown 友好形状（缩进/Callout/表格/任务列表）
 */
export function transformHtmlForMarkdownExport(sourceHtml: string): string {
  const doc = new DOMParser().parseFromString(sourceHtml, 'text/html')
  liftIndentToTextPrefix(doc)
  calloutToBlockquote(doc)
  tocBlockToPlainList(doc)
  normalizeTablesForGfm(doc)
  normalizeTaskListsForGfm(doc)
  return doc.body.innerHTML
}

function htmlToMarkdown(sourceHtml: string): string {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    hr: '---',
  })
  service.use(gfm)
  return service.turndown(sourceHtml).replace(CALLOUT_MARKER_ESCAPE_PATTERN, '[!$1]')
}

/**
 * 编辑器内容 → Markdown（结构保真优先，样式降级可接受）
 */
export function editorToMarkdown(editor: Editor): string {
  return htmlToMarkdown(transformHtmlForMarkdownExport(editor.getHTML()))
}

/**
 * 任意编辑器 HTML 片段 → Markdown。与整篇导出共用同一条规范化管线，
 * 保证复制到外部的纯文本与 Markdown 导出结构一致（EXP-003）。
 */
export function editorHtmlFragmentToMarkdown(fragmentHtml: string): string {
  return htmlToMarkdown(transformHtmlForMarkdownExport(fragmentHtml))
}

/**
 * Serialize editor content to Markdown
 */
export const toMarkdown = (editor: Editor) => {
  return editorToMarkdown(editor)
}
