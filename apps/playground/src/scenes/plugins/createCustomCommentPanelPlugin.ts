import type { CommentThread, EditorCore, EditorUIModuleMountContext } from '@block-editor/editor'
import { commentStore } from '@block-editor/editor'

export interface CustomCommentPanelPluginOptions {
  title?: string
  description?: string
}

function findCommentMarkPos(core: EditorCore, commentId: string): number | null {
  let foundPos: number | null = null
  core.editor.state.doc.descendants((node, pos) => {
    if (!node.isText || foundPos !== null) return true
    const matched = node.marks?.some(
      (mark) => mark.type.name === 'comment' && mark.attrs?.commentId === commentId,
    )
    if (matched) {
      foundPos = pos
      return false
    }
    return true
  })
  return foundPos
}

export function createCustomCommentPanelPlugin(options: CustomCommentPanelPluginOptions = {}) {
  return {
    mount: (ctx: EditorUIModuleMountContext) => {
      const { regionContainer, editorCore } = ctx
      if (!regionContainer) return

      regionContainer.innerHTML = ''
      regionContainer.style.cssText = `
        height: 100%;
        box-sizing: border-box;
        overflow: auto;
        border-left: 1px solid var(--border-color);
        background: var(--paper-bg);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `

      const i18n = editorCore.i18n.commentPanel
      let filter: 'all' | 'open' | 'resolved' = 'open'
      let pendingRange: { from: number; to: number } | null = null
      let pendingQuote = ''
      let currentThreads: CommentThread[] = []

      const title = document.createElement('div')
      title.style.cssText = 'font-size:16px;font-weight:700;color:var(--text-color);'
      title.textContent = options.title || '自定义评论区（完整示例）'

      const desc = document.createElement('div')
      desc.style.cssText = 'font-size:12px;color:var(--text-muted);line-height:1.5;'
      desc.textContent =
        options.description || '支持选区预填、创建评论、筛选、回复、解决/重开、删除、点击定位。'

      const filterRow = document.createElement('div')
      filterRow.style.cssText = 'display:flex;gap:6px;'

      const createFilterBtn = (label: string, value: typeof filter) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = label
        btn.style.cssText = `
          height: 30px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--surface-bg);
          color: var(--text-secondary);
          padding: 0 12px;
          cursor: pointer;
          font-size: 12px;
        `
        btn.addEventListener('click', () => {
          filter = value
          renderThreads()
          syncFilterStyle()
        })
        return btn
      }

      const btnOpen = createFilterBtn(i18n.filterOpen, 'open')
      const btnResolved = createFilterBtn(i18n.filterResolved, 'resolved')
      const btnAll = createFilterBtn(i18n.filterAll, 'all')
      filterRow.append(btnOpen, btnResolved, btnAll)

      const draftBox = document.createElement('div')
      draftBox.style.cssText =
        'border:1px solid var(--border-color);border-radius:10px;padding:8px;background:var(--surface-muted);'

      const quote = document.createElement('button')
      quote.type = 'button'
      quote.style.cssText =
        'display:none;width:100%;text-align:left;background:var(--surface-soft);border:1px dashed var(--border-color);border-radius:8px;padding:6px 8px;color:var(--text-secondary);font-size:12px;cursor:pointer;'
      quote.title = i18n.selectionQuoteTitle
      quote.addEventListener('click', () => {
        if (!pendingRange) return
        editorCore.editor.commands.setTextSelection({
          from: pendingRange.from,
          to: pendingRange.to,
        })
        editorCore.editor.commands.focus()
      })

      const textarea = document.createElement('textarea')
      textarea.placeholder = i18n.draftPlaceholder
      textarea.style.cssText =
        'width:100%;margin-top:8px;min-height:72px;border-radius:8px;border:1px solid var(--border-color);background:var(--surface-bg);color:var(--text-color);padding:10px;box-sizing:border-box;resize:vertical;'

      const createRow = document.createElement('div')
      createRow.style.cssText =
        'margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;'

      const hint = document.createElement('span')
      hint.style.cssText = 'font-size:12px;color:var(--text-muted);'

      const createBtn = document.createElement('button')
      createBtn.type = 'button'
      createBtn.textContent = i18n.createButton
      createBtn.style.cssText =
        'height:34px;border-radius:8px;border:1px solid var(--primary-color);background:var(--brand-solid-bg);color:var(--brand-solid-text);padding:0 14px;cursor:pointer;'

      createBtn.addEventListener('click', () => {
        const text = textarea.value.trim()
        if (!text) return
        if (!pendingRange || pendingRange.from >= pendingRange.to) return

        const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        editorCore.editor.commands.setTextSelection({
          from: pendingRange.from,
          to: pendingRange.to,
        })
        editorCore.editor.chain().focus().setComment(id).run()
        commentStore.addThread(id, text, i18n.currentUser, pendingQuote)

        textarea.value = ''
        pendingRange = null
        pendingQuote = ''
        syncSelectionState()
        renderThreads()
      })

      createRow.append(hint, createBtn)
      draftBox.append(quote, textarea, createRow)

      const list = document.createElement('div')
      list.style.cssText = 'display:flex;flex-direction:column;gap:8px;'

      const getFilteredThreads = () => {
        if (filter === 'all') return currentThreads
        if (filter === 'resolved') return currentThreads.filter((thread) => thread.resolved)
        return currentThreads.filter((thread) => !thread.resolved)
      }

      const syncFilterStyle = () => {
        const sync = (btn: HTMLButtonElement, active: boolean) => {
          btn.style.borderColor = active ? 'var(--primary-color)' : 'var(--border-color)'
          btn.style.color = active ? 'var(--primary-color)' : 'var(--text-secondary)'
          btn.style.background = active
            ? 'color-mix(in srgb, var(--primary-color) 12%, var(--surface-bg))'
            : 'var(--surface-bg)'
        }
        sync(btnOpen, filter === 'open')
        sync(btnResolved, filter === 'resolved')
        sync(btnAll, filter === 'all')
      }

      const renderThreads = () => {
        currentThreads = commentStore.getAll()
        list.innerHTML = ''
        const rows = getFilteredThreads()

        if (rows.length === 0) {
          const empty = document.createElement('div')
          empty.style.cssText =
            'font-size:12px;color:var(--text-muted);text-align:center;padding:18px 0;border:1px dashed var(--border-color);border-radius:8px;'
          empty.textContent = filter === 'resolved' ? i18n.emptyResolved : i18n.emptyNoComments
          list.appendChild(empty)
          return
        }

        rows.forEach((thread) => {
          const item = document.createElement('div')
          item.dataset.commentId = thread.id
          item.style.cssText =
            'border:1px solid var(--border-color);border-radius:10px;padding:10px;background:var(--surface-bg);display:flex;flex-direction:column;gap:8px;'

          const head = document.createElement('div')
          head.style.cssText =
            'display:flex;align-items:center;justify-content:space-between;gap:8px;'
          head.innerHTML = `<strong style="font-size:13px;color:var(--text-color);">${thread.author}</strong>`

          const action = document.createElement('div')
          action.style.cssText = 'display:flex;gap:6px;'

          const jump = document.createElement('button')
          jump.type = 'button'
          jump.textContent = i18n.threadJumpTitle
          jump.style.cssText =
            'height:28px;border-radius:8px;border:1px solid var(--border-color);background:var(--surface-soft);color:var(--text-secondary);padding:0 8px;cursor:pointer;font-size:12px;'
          jump.onclick = () => {
            const pos = findCommentMarkPos(editorCore, thread.id)
            if (pos === null) return
            const safe = Math.max(1, Math.min(pos + 1, editorCore.editor.state.doc.content.size))
            editorCore.editor.commands.setTextSelection(safe)
            editorCore.editor.commands.focus()
          }
          action.appendChild(jump)

          const stateBtn = document.createElement('button')
          stateBtn.type = 'button'
          stateBtn.textContent = thread.resolved ? i18n.reopenAction : i18n.resolveAction
          stateBtn.style.cssText =
            'height:28px;border-radius:8px;border:1px solid var(--border-color);background:var(--surface-soft);color:var(--text-secondary);padding:0 8px;cursor:pointer;font-size:12px;'
          stateBtn.onclick = () => {
            if (thread.resolved) commentStore.reopen(thread.id)
            else commentStore.resolve(thread.id)
          }
          action.appendChild(stateBtn)

          const delBtn = document.createElement('button')
          delBtn.type = 'button'
          delBtn.textContent = i18n.deleteAction
          delBtn.style.cssText =
            'height:28px;border-radius:8px;border:1px solid color-mix(in srgb, var(--danger-color) 50%, var(--border-color));background:var(--surface-soft);color:var(--danger-color);padding:0 8px;cursor:pointer;font-size:12px;'
          delBtn.onclick = () => commentStore.delete(thread.id)
          action.appendChild(delBtn)

          head.appendChild(action)

          const quoteEl = document.createElement('button')
          quoteEl.type = 'button'
          quoteEl.style.cssText =
            'display:block;width:100%;text-align:left;border:1px dashed var(--border-color);background:var(--surface-soft);color:var(--text-secondary);border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer;'
          quoteEl.textContent = `${i18n.selectionQuotePrefix}${thread.quoteText || i18n.selectionHintEmpty}`
          quoteEl.onclick = jump.onclick

          const body = document.createElement('div')
          body.style.cssText = 'font-size:13px;line-height:1.6;color:var(--text-color);'
          body.textContent = thread.text

          const replyRow = document.createElement('div')
          replyRow.style.cssText = 'display:flex;gap:6px;'
          const replyInput = document.createElement('input')
          replyInput.placeholder = i18n.replyPlaceholder
          replyInput.style.cssText =
            'flex:1;height:30px;border-radius:8px;border:1px solid var(--border-color);background:var(--surface-bg);color:var(--text-color);padding:0 10px;'
          const replyBtn = document.createElement('button')
          replyBtn.type = 'button'
          replyBtn.textContent = i18n.replyButton
          replyBtn.style.cssText =
            'height:30px;border-radius:8px;border:1px solid var(--primary-color);background:var(--brand-solid-bg);color:var(--brand-solid-text);padding:0 10px;cursor:pointer;font-size:12px;'
          replyBtn.onclick = () => {
            const text = replyInput.value.trim()
            if (!text) return
            commentStore.addReply(thread.id, text, i18n.currentUser)
          }
          replyRow.append(replyInput, replyBtn)

          const replies = document.createElement('div')
          replies.style.cssText = 'display:flex;flex-direction:column;gap:4px;'
          thread.replies.forEach((reply) => {
            const line = document.createElement('div')
            line.style.cssText =
              'font-size:12px;color:var(--text-secondary);background:var(--surface-soft);border-radius:8px;padding:6px 8px;'
            line.textContent = `${reply.author}: ${reply.text}`
            replies.appendChild(line)
          })

          item.append(head, quoteEl, body, replies, replyRow)
          list.appendChild(item)
        })
      }

      const syncSelectionState = () => {
        const selection = editorCore.editor.state.selection
        if (selection.empty) {
          hint.textContent = i18n.selectionHintEmpty
          quote.style.display = 'none'
          return
        }
        pendingRange = { from: selection.from, to: selection.to }
        pendingQuote = editorCore.editor.state.doc
          .textBetween(selection.from, selection.to, ' ')
          .trim()
          .slice(0, 100)
        hint.textContent = i18n.selectionHintReady
        quote.style.display = 'block'
        quote.textContent = `${i18n.selectionQuotePrefix}${pendingQuote}`
      }

      const onUpdate = () => {
        syncSelectionState()
        renderThreads()
        syncFilterStyle()
      }

      const unsubscribeComments = commentStore.on(onUpdate)
      editorCore.events.on('selectionUpdate', syncSelectionState)
      editorCore.events.on('update', renderThreads)
      syncSelectionState()
      renderThreads()
      syncFilterStyle()

      regionContainer.append(title, desc, filterRow, draftBox, list)

      return {
        setVisible: (visible: boolean) => {
          regionContainer.style.display = visible ? 'flex' : 'none'
        },
        focusThread: (commentId: string) => {
          const item = regionContainer.querySelector(
            `[data-comment-id="${commentId}"]`,
          ) as HTMLElement | null
          item?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          if (item) {
            item.style.boxShadow = '0 0 0 2px var(--primary-color)'
            setTimeout(() => {
              item.style.boxShadow = ''
            }, 1200)
          }
        },
        unmount: () => {
          unsubscribeComments()
          editorCore.events.off('selectionUpdate', syncSelectionState)
          editorCore.events.off('update', renderThreads)
          regionContainer.innerHTML = ''
        },
      }
    },
  }
}
