/**
 * CommentPanel — 评论面板 UI
 * - 面板创建评论（不再使用 prompt）
 * - 线程回复 / 解决 / 重新打开 / 删除
 * - 已解决筛选（全部 / 未解决 / 已解决）
 */

import { TextSelection } from 'prosemirror-state'
import { EditorCore } from '../core/EditorCore'
import { commentStore, CommentThread } from '../extensions/Comment'

type CommentFilter = 'all' | 'open' | 'resolved'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export class CommentPanel {
  private listEl: HTMLElement
  private editorCore: EditorCore
  private unsubscribe: () => void
  private filter: CommentFilter = 'open'
  private filterBtns: Record<CommentFilter, HTMLButtonElement>
  private draftInput: HTMLTextAreaElement
  private hintEl: HTMLElement

  constructor(editorCore: EditorCore, container: HTMLElement) {
    this.editorCore = editorCore

    container.classList.add('comment-panel')
    container.setAttribute('role', 'complementary')
    container.setAttribute('aria-label', '评论面板')

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-shrink:0;'

    const title = document.createElement('h3')
    title.textContent = '评论'
    title.style.cssText = 'margin:0;font-size:14px;font-weight:600;color:#262626;'
    header.appendChild(title)

    const filterWrap = document.createElement('div')
    filterWrap.style.cssText = 'display:flex;gap:4px;'

    this.filterBtns = {
      all: this.createFilterBtn('全部', 'all'),
      open: this.createFilterBtn('未解决', 'open'),
      resolved: this.createFilterBtn('已解决', 'resolved'),
    }

    filterWrap.appendChild(this.filterBtns.open)
    filterWrap.appendChild(this.filterBtns.resolved)
    filterWrap.appendChild(this.filterBtns.all)
    header.appendChild(filterWrap)
    container.appendChild(header)

    const draftWrap = document.createElement('div')
    draftWrap.style.cssText = 'border:1px solid #f0f0f0;border-radius:8px;padding:8px;background:#fafafa;margin-bottom:10px;flex-shrink:0;'

    this.draftInput = document.createElement('textarea')
    this.draftInput.placeholder = '输入评论内容（将添加到当前选中文本）'
    this.draftInput.setAttribute('aria-label', '评论内容')
    this.draftInput.rows = 2
    this.draftInput.style.cssText = 'width:100%;resize:vertical;min-height:52px;max-height:140px;border:1px solid #e8e8e8;border-radius:6px;padding:8px;font-size:13px;box-sizing:border-box;font-family:inherit;outline:none;background:#fff;'
    this.draftInput.addEventListener('focus', () => {
      this.draftInput.style.borderColor = '#00b96b'
    })
    this.draftInput.addEventListener('blur', () => {
      this.draftInput.style.borderColor = '#e8e8e8'
    })

    const createRow = document.createElement('div')
    createRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;'

    this.hintEl = document.createElement('span')
    this.hintEl.style.cssText = 'font-size:12px;color:#8c8c8c;'

    const createBtn = document.createElement('button')
    createBtn.textContent = '添加到选区'
    createBtn.setAttribute('aria-label', '添加评论到选区')
    createBtn.style.cssText = 'border:none;background:#00b96b;color:#fff;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit;'
    createBtn.addEventListener('click', () => this.createCommentFromSelection())

    createRow.appendChild(this.hintEl)
    createRow.appendChild(createBtn)

    draftWrap.appendChild(this.draftInput)
    draftWrap.appendChild(createRow)
    container.appendChild(draftWrap)

    this.listEl = document.createElement('div')
    this.listEl.style.cssText = 'flex:1;overflow-y:auto;'
    this.listEl.setAttribute('role', 'list')
    container.appendChild(this.listEl)

    this.unsubscribe = commentStore.on(() => this.render())
    editorCore.editor.on('update', () => this.render())
    editorCore.editor.on('selectionUpdate', () => this.renderSelectionHint())

    this.renderSelectionHint()
    this.render()
  }

  private createFilterBtn(label: string, filter: CommentFilter): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.setAttribute('aria-label', `筛选：${label}`)
    btn.style.cssText = 'border:1px solid #e5e7eb;background:#fff;color:#595959;border-radius:999px;padding:3px 8px;font-size:12px;cursor:pointer;font-family:inherit;'
    btn.addEventListener('click', () => {
      this.filter = filter
      this.render()
    })
    return btn
  }

  private renderSelectionHint() {
    const empty = this.editorCore.editor.state.selection.empty
    this.hintEl.textContent = empty ? '请先在正文中选中文本' : '已检测到选区，可直接添加'
    this.hintEl.style.color = empty ? '#8c8c8c' : '#00b96b'
  }

  private createCommentFromSelection() {
    const text = this.draftInput.value.trim()
    if (!text) return

    const editor = this.editorCore.editor
    if (editor.state.selection.empty) {
      this.renderSelectionHint()
      return
    }

    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    commentStore.addThread(id, text)
    editor.chain().focus().setComment(id).run()

    this.draftInput.value = ''
    this.jumpToComment(id)
    this.render()
  }

  private getFilteredThreads(): CommentThread[] {
    const all = commentStore.getAll()
    if (this.filter === 'all') return all
    if (this.filter === 'resolved') return all.filter((t) => t.resolved)
    return all.filter((t) => !t.resolved)
  }

  private render() {
    this.listEl.innerHTML = ''

    ;(['all', 'open', 'resolved'] as CommentFilter[]).forEach((key) => {
      const active = key === this.filter
      this.filterBtns[key].style.background = active ? '#ecfdf5' : '#fff'
      this.filterBtns[key].style.borderColor = active ? '#86efac' : '#e5e7eb'
      this.filterBtns[key].style.color = active ? '#15803d' : '#595959'
      this.filterBtns[key].setAttribute('aria-pressed', active ? 'true' : 'false')
    })

    this.renderSelectionHint()

    const threads = this.getFilteredThreads()
    if (threads.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'text-align:center;color:#bfbfbf;font-size:13px;padding:32px 0;'
      empty.textContent = this.filter === 'resolved' ? '暂无已解决评论' : '暂无评论'
      this.listEl.appendChild(empty)
      return
    }

    threads.forEach((thread) => {
      this.listEl.appendChild(this.renderThread(thread))
    })
  }

  private renderThread(thread: CommentThread): HTMLElement {
    const item = document.createElement('div')
    item.className = 'comment-item'
    item.setAttribute('role', 'listitem')
    item.setAttribute('data-comment-id', thread.id)
    item.style.cursor = 'pointer'
    item.title = '点击跳转到文档中的标注位置'

    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, textarea, input')) return
      this.jumpToComment(thread.id)
    })

    const headerEl = document.createElement('div')
    headerEl.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;'

    const authorDate = document.createElement('div')
    authorDate.innerHTML = `<span style="font-weight:600;color:#262626;font-size:13px;">${escapeHtml(thread.author)}</span> <span class="comment-date">${formatTime(thread.createdAt)}</span>`
    headerEl.appendChild(authorDate)

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0;'

    if (!thread.resolved) {
      const resolveBtn = this.createActionBtn('✓', '解决评论', '#00b96b')
      resolveBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        commentStore.resolve(thread.id)
        this.removeMarkFromEditor(thread.id)
      })
      actions.appendChild(resolveBtn)
    } else {
      const reopenBtn = this.createActionBtn('↺', '重新打开', '#1677ff')
      reopenBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        commentStore.reopen(thread.id)
      })
      actions.appendChild(reopenBtn)
    }

    const deleteBtn = this.createActionBtn('✕', '删除评论', '#ff4d4f')
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      commentStore.delete(thread.id)
      this.removeMarkFromEditor(thread.id)
    })
    actions.appendChild(deleteBtn)
    headerEl.appendChild(actions)
    item.appendChild(headerEl)

    const textEl = document.createElement('div')
    textEl.className = 'comment-content'
    textEl.textContent = thread.text
    item.appendChild(textEl)

    if (thread.replies.length > 0) {
      const repliesEl = document.createElement('div')
      repliesEl.style.cssText = 'margin-top:8px;border-left:2px solid #f0f0f0;padding-left:10px;display:flex;flex-direction:column;gap:6px;'
      thread.replies.forEach((reply) => {
        const r = document.createElement('div')
        r.innerHTML = `
          <div style="font-size:12px;color:#8c8c8c;margin-bottom:2px;">
            <strong style="color:#595959;">${escapeHtml(reply.author)}</strong> · ${formatTime(reply.createdAt)}
          </div>
          <div style="font-size:13px;color:#595959;">${escapeHtml(reply.text)}</div>
        `
        repliesEl.appendChild(r)
      })
      item.appendChild(repliesEl)
    }

    if (!thread.resolved) {
      const replyRow = document.createElement('div')
      replyRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;'

      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = '回复...'
      input.setAttribute('aria-label', '回复评论')
      input.style.cssText = 'flex:1;border:1px solid #e8e8e8;border-radius:4px;padding:4px 8px;font-size:12px;outline:none;font-family:inherit;'
      input.addEventListener('focus', () => {
        input.style.borderColor = '#00b96b'
      })
      input.addEventListener('blur', () => {
        input.style.borderColor = '#e8e8e8'
      })
      input.addEventListener('click', (e) => e.stopPropagation())

      const sendBtn = document.createElement('button')
      sendBtn.textContent = '回复'
      sendBtn.setAttribute('aria-label', '发送回复')
      sendBtn.style.cssText = 'border:none;background:#00b96b;color:#fff;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit;'
      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const text = input.value.trim()
        if (!text) return
        commentStore.addReply(thread.id, text)
        input.value = ''
      })

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation()
          sendBtn.click()
        }
      })

      replyRow.appendChild(input)
      replyRow.appendChild(sendBtn)
      item.appendChild(replyRow)
    }

    if (thread.resolved) {
      item.style.opacity = '0.7'
    }

    return item
  }

  private createActionBtn(text: string, title: string, hoverColor: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = text
    btn.title = title
    btn.setAttribute('aria-label', title)
    btn.style.cssText = 'border:none;background:transparent;cursor:pointer;font-size:12px;color:#8c8c8c;padding:2px 5px;border-radius:3px;font-family:inherit;'
    btn.addEventListener('mouseenter', () => {
      btn.style.color = hoverColor
      btn.style.background = '#f5f5f5'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.color = '#8c8c8c'
      btn.style.background = 'transparent'
    })
    return btn
  }

  private jumpToComment(commentId: string) {
    const editor = this.editorCore.editor
    const { state, view } = editor
    let foundPos: number | null = null

    state.doc.descendants((node, pos) => {
      if (foundPos !== null) return false
      if (!node.isText) return true
      for (const mark of node.marks) {
        if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
          foundPos = pos
          return false
        }
      }
      return true
    })

    if (foundPos === null) return

    const tr = state.tr.setSelection(TextSelection.near(state.doc.resolve(foundPos)))
    view.dispatch(tr.scrollIntoView())
    view.focus()

    const span = view.dom.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement | null
    if (span) {
      span.style.outline = '2px solid #00b96b'
      setTimeout(() => {
        span.style.outline = ''
      }, 1500)
    }
  }

  private removeMarkFromEditor(commentId: string) {
    const { state, view } = this.editorCore.editor
    const schema = state.schema
    const commentMark = schema.marks.comment
    if (!commentMark) return

    let tr = state.tr
    let changed = false

    state.doc.descendants((node, pos) => {
      if (!node.isInline) return
      node.marks.forEach((mark) => {
        if (mark.type === commentMark && mark.attrs.commentId === commentId) {
          tr = tr.removeMark(pos, pos + node.nodeSize, commentMark)
          changed = true
        }
      })
    })

    if (changed) view.dispatch(tr)
  }

  destroy() {
    this.unsubscribe()
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
