import { EditorCore } from '../../../core/EditorCore'
import { SnapshotDiffLine } from '../../../core/VersionHistory'
import { Dialog } from '../../components/dialog'
import type { VersionHistoryDialogI18n } from '../../../i18n'
import { resolveEditorI18n } from '../../../i18n'

function formatTime(ts: number, locale: string) {
  return new Date(ts).toLocaleString(locale, {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function sourceLabel(source: 'auto' | 'manual' | 'restore', i18n: VersionHistoryDialogI18n) {
  if (source === 'auto') return i18n.sourceAuto
  if (source === 'manual') return i18n.sourceManual
  return i18n.sourceRestore
}

const DEFAULT_VERSION_HISTORY_I18N: VersionHistoryDialogI18n =
  resolveEditorI18n('en-US').dialogs.versionHistory

export class VersionHistoryDialog {
  private dialog: Dialog
  private editorCore: EditorCore
  private listRoot: HTMLElement
  private activeSnapshotId: string | null = null
  private expandedSnapshotId: string | null = null
  private readonly i18n: VersionHistoryDialogI18n
  private readonly locale: string

  constructor(editorCore: EditorCore, i18n?: VersionHistoryDialogI18n, locale: string = 'zh-CN') {
    this.editorCore = editorCore
    this.i18n = i18n || DEFAULT_VERSION_HISTORY_I18N
    this.locale = locale
    this.listRoot = document.createElement('div')
    this.listRoot.className = 'be-space-y-2'

    const content = document.createElement('div')
    content.className = 'be-space-y-4'

    const tips = document.createElement('div')
    tips.className = 'be-text-xs'
    tips.style.color = 'var(--text-muted)'
    tips.textContent = this.i18n.tips
    content.appendChild(tips)

    const createBtn = document.createElement('button')
    createBtn.textContent = this.i18n.saveSnapshot
    createBtn.className = 'be-dialog-btn be-dialog-btn--primary'
    createBtn.style.cssText = 'font-family:inherit;padding:8px 16px;border-radius:10px;'
    createBtn.onclick = () => {
      this.editorCore.versionHistory.createManualSnapshot(this.i18n.manualSnapshotLabel)
      this.renderList()
    }
    content.appendChild(createBtn)

    content.appendChild(this.listRoot)

    this.dialog = new Dialog({
      title: this.i18n.title,
      subtitle: this.i18n.subtitle,
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: 'fileText',
      iconBgClass: 'be-dialog-icon--primary',
      host: (this.editorCore.editor.options.element as HTMLElement).closest(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null,
      onClose: () => {},
      width: '860px',
    })

    this.dialog.setContent(content)
    this.renderList()
  }

  private renderList() {
    const snapshots = this.editorCore.versionHistory.listSnapshots()
    this.listRoot.innerHTML = ''

    if (snapshots.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'be-text-sm be-py-3'
      empty.style.color = 'var(--text-muted)'
      empty.textContent = this.i18n.noSnapshots
      this.listRoot.appendChild(empty)
      this.activeSnapshotId = null
      return
    }

    if (this.activeSnapshotId && !snapshots.some((s) => s.id === this.activeSnapshotId)) {
      this.activeSnapshotId = null
    }
    if (this.expandedSnapshotId && !snapshots.some((s) => s.id === this.expandedSnapshotId)) {
      this.expandedSnapshotId = null
    }

    snapshots.forEach((snapshot, index) => {
      const expanded = this.expandedSnapshotId === snapshot.id
      const previousSnapshot = this.resolveBaseSnapshotForDiff(snapshots, index)
      const previousSnapshotId = previousSnapshot?.id

      const row = document.createElement('div')
      row.className = 'be-rounded-xl be-overflow-hidden'
      row.style.border = '1px solid var(--border-color)'
      if (snapshot.id === this.activeSnapshotId) {
        row.style.borderColor = 'color-mix(in srgb, var(--primary-color) 45%, var(--border-color))'
      }

      const header = document.createElement('div')
      header.style.display = 'flex'
      header.style.alignItems = 'center'
      header.style.justifyContent = 'space-between'
      header.style.gap = '12px'
      header.style.padding = '10px 12px'
      header.style.cursor = 'pointer'
      header.style.background = expanded ? 'var(--surface-soft)' : 'var(--paper-bg)'
      header.addEventListener('click', () => {
        this.activeSnapshotId = snapshot.id
        this.expandedSnapshotId = expanded ? null : snapshot.id
        this.renderList()
      })

      const left = document.createElement('div')
      left.className = 'be-min-w-0'
      left.style.display = 'flex'
      left.style.flexDirection = 'column'

      const title = document.createElement('div')
      title.className = 'be-text-sm be-font-medium'
      title.style.color = 'var(--text-color)'
      title.textContent = `${expanded ? '▾' : '▸'} ${snapshot.label} · ${formatTime(snapshot.createdAt, this.locale)}`

      const stats = this.getDiffStats(snapshot.id, previousSnapshotId)

      const meta = document.createElement('div')
      meta.className = 'be-text-xs be-mt-1 be-truncate'
      meta.style.color = 'var(--text-muted)'
      meta.textContent = `${sourceLabel(snapshot.source, this.i18n)} · ${snapshot.authorName} · +${stats.added}/-${stats.deleted}/~${stats.modified} · ${snapshot.excerpt}`

      left.appendChild(title)
      left.appendChild(meta)

      const actionWrap = document.createElement('div')
      actionWrap.className = 'be-flex be-items-center be-gap-2 be-shrink-0'

      const detailBtn = document.createElement('button')
      detailBtn.type = 'button'
      detailBtn.textContent = expanded ? this.i18n.collapse : this.i18n.viewChanges
      detailBtn.className = 'be-dialog-btn be-dialog-btn--secondary'
      detailBtn.style.cssText = 'padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;'
      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.activeSnapshotId = snapshot.id
        this.expandedSnapshotId = expanded ? null : snapshot.id
        this.renderList()
      })

      const restoreBtn = document.createElement('button')
      restoreBtn.type = 'button'
      restoreBtn.textContent = this.i18n.restoreToThis
      restoreBtn.className = 'be-dialog-btn be-dialog-btn--secondary'
      restoreBtn.style.cssText =
        'padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;'
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const ok = window.confirm(this.i18n.restoreConfirm)
        if (!ok) return
        this.editorCore.versionHistory.restoreSnapshot(snapshot.id)
        this.dialog.close()
      })

      actionWrap.appendChild(detailBtn)
      actionWrap.appendChild(restoreBtn)
      header.appendChild(left)
      header.appendChild(actionWrap)
      row.appendChild(header)

      if (expanded) {
        const previewWrap = document.createElement('div')
        previewWrap.style.borderTop = '1px solid var(--border-color)'
        previewWrap.style.background = 'var(--paper-bg)'

        const previewHeader = document.createElement('div')
        previewHeader.style.padding = '6px 10px'
        previewHeader.style.fontSize = '12px'
        previewHeader.style.color = 'var(--text-secondary)'
        previewHeader.style.background = 'var(--surface-soft)'
        previewHeader.style.borderBottom = '1px solid var(--border-color)'
        const previousLabel = previousSnapshot?.label || this.i18n.blankBase
        previewHeader.textContent = this.i18n.restoreCompareTip(previousLabel)
        previewWrap.appendChild(previewHeader)

        const lines = this.getPreviewDiffLines(snapshot.id, previousSnapshotId)
        if (lines.length === 0) {
          const empty = document.createElement('div')
          empty.style.padding = '10px'
          empty.style.fontSize = '12px'
          empty.style.color = 'var(--text-muted)'
          empty.textContent = this.i18n.noChanges
          previewWrap.appendChild(empty)
        } else {
          lines.forEach((line) => {
            const lineRow = document.createElement('div')
            lineRow.style.display = 'grid'
            lineRow.style.gridTemplateColumns = '44px 1fr 44px 1fr'
            lineRow.style.alignItems = 'start'
            lineRow.style.fontSize = '12px'
            lineRow.style.fontFamily =
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            lineRow.style.borderBottom =
              '1px solid color-mix(in srgb, var(--border-color) 70%, transparent)'

            const oldNo = document.createElement('div')
            oldNo.style.padding = '3px 8px'
            oldNo.style.color = 'var(--text-muted)'
            oldNo.textContent = line.oldLineNumber === null ? '' : String(line.oldLineNumber)

            const oldText = document.createElement('div')
            oldText.style.padding = '3px 8px'
            oldText.style.whiteSpace = 'nowrap'
            oldText.style.overflow = 'hidden'
            oldText.style.textOverflow = 'ellipsis'
            oldText.style.color = 'var(--text-color)'
            oldText.style.borderRight = '1px solid var(--border-color)'
            oldText.textContent = line.type === 'added' ? '' : line.oldText

            const newNo = document.createElement('div')
            newNo.style.padding = '3px 8px'
            newNo.style.color = 'var(--text-muted)'
            newNo.textContent = line.newLineNumber === null ? '' : String(line.newLineNumber)

            const newText = document.createElement('div')
            newText.style.padding = '3px 8px'
            newText.style.whiteSpace = 'nowrap'
            newText.style.overflow = 'hidden'
            newText.style.textOverflow = 'ellipsis'
            newText.style.color = 'var(--text-color)'
            newText.textContent = line.type === 'deleted' ? '' : line.newText

            if (line.type === 'deleted') {
              oldNo.style.background =
                'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
              oldText.style.background =
                'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
            } else if (line.type === 'added') {
              newNo.style.background =
                'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
              newText.style.background =
                'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
            } else {
              oldNo.style.background =
                'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
              oldText.style.background =
                'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
              newNo.style.background =
                'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
              newText.style.background =
                'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
            }

            lineRow.appendChild(oldNo)
            lineRow.appendChild(oldText)
            lineRow.appendChild(newNo)
            lineRow.appendChild(newText)
            previewWrap.appendChild(lineRow)
          })

          const footer = document.createElement('div')
          footer.style.padding = '8px 10px'
          footer.style.background = 'var(--paper-bg)'

          const fullBtn = document.createElement('button')
          fullBtn.type = 'button'
          fullBtn.textContent = this.i18n.fullDiff
          fullBtn.className = 'be-dialog-btn be-dialog-btn--secondary'
          fullBtn.style.cssText =
            'padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;'
          fullBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.openFullDiffDialog(snapshot.id, previousSnapshotId)
          })
          footer.appendChild(fullBtn)
          previewWrap.appendChild(footer)
        }

        row.appendChild(previewWrap)
      }

      this.listRoot.appendChild(row)
    })
  }

  private resolveBaseSnapshotForDiff(
    snapshots: ReturnType<EditorCore['versionHistory']['listSnapshots']>,
    index: number,
  ) {
    const current = snapshots[index]
    if (!current) return null

    const immediate = snapshots[index + 1] || null
    if (!immediate) return null

    for (let i = index + 1; i < snapshots.length; i += 1) {
      const candidate = snapshots[i]
      if (!candidate) continue
      const diff = this.editorCore.versionHistory.getSnapshotDiff(current.id, candidate.id)
      if (!diff) continue
      const hasChange = diff.lines.some((line) => line.type !== 'context')
      if (hasChange) return candidate
    }

    return immediate
  }

  private getDiffStats(snapshotId: string, previousSnapshotId?: string) {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(snapshotId, previousSnapshotId)
    if (!diff) return { added: 0, deleted: 0, modified: 0 }
    return {
      added: diff.lines.filter((line) => line.type === 'added').length,
      deleted: diff.lines.filter((line) => line.type === 'deleted').length,
      modified: diff.lines.filter((line) => line.type === 'modified').length,
    }
  }

  private getPreviewDiffLines(snapshotId: string, previousSnapshotId?: string): SnapshotDiffLine[] {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(snapshotId, previousSnapshotId)
    if (!diff) return []
    return diff.lines.filter((line) => line.type !== 'context').slice(0, 3)
  }

  private openFullDiffDialog(snapshotId: string, previousSnapshotId?: string) {
    const diff = this.editorCore.versionHistory.getSnapshotDiff(snapshotId, previousSnapshotId)
    if (!diff) return

    const changed = diff.lines.filter((line) => line.type !== 'context')

    const content = document.createElement('div')
    content.style.maxHeight = '70vh'
    content.style.overflow = 'auto'
    content.style.border = '1px solid var(--border-color)'
    content.style.borderRadius = '8px'
    content.style.background = 'var(--paper-bg)'

    const head = document.createElement('div')
    head.style.padding = '6px 10px'
    head.style.fontSize = '12px'
    head.style.color = 'var(--text-secondary)'
    head.style.background = 'var(--surface-soft)'
    head.style.borderBottom = '1px solid var(--border-color)'
    head.textContent = this.i18n.fullDiffHeader(diff.baseSnapshot?.label || this.i18n.blankBase)
    content.appendChild(head)

    if (changed.length === 0) {
      const empty = document.createElement('div')
      empty.style.padding = '10px'
      empty.style.fontSize = '12px'
      empty.style.color = 'var(--text-muted)'
      empty.textContent = this.i18n.noChanges
      content.appendChild(empty)
    } else {
      const stats = {
        added: changed.filter((line) => line.type === 'added').length,
        deleted: changed.filter((line) => line.type === 'deleted').length,
        modified: changed.filter((line) => line.type === 'modified').length,
      }

      const summary = document.createElement('div')
      summary.style.padding = '6px 10px'
      summary.style.fontSize = '12px'
      summary.style.color = 'var(--text-secondary)'
      summary.style.borderBottom = '1px solid var(--border-color)'
      summary.textContent = `+${stats.added}  -${stats.deleted}  ~${stats.modified}`
      content.appendChild(summary)

      const splitHead = document.createElement('div')
      splitHead.style.display = 'grid'
      splitHead.style.gridTemplateColumns = '56px 1fr 56px 1fr'
      splitHead.style.borderBottom = '1px solid var(--border-color)'
      splitHead.style.background = 'var(--surface-soft)'
      splitHead.style.fontSize = '12px'
      splitHead.style.color = 'var(--text-secondary)'

      const oldHeadNo = document.createElement('div')
      oldHeadNo.style.padding = '6px 8px'
      oldHeadNo.textContent = this.i18n.oldLine
      const oldHead = document.createElement('div')
      oldHead.style.padding = '6px 8px'
      oldHead.textContent = diff.baseSnapshot?.label || this.i18n.oldVersion
      const newHeadNo = document.createElement('div')
      newHeadNo.style.padding = '6px 8px'
      newHeadNo.textContent = this.i18n.newLine
      const newHead = document.createElement('div')
      newHead.style.padding = '6px 8px'
      newHead.textContent = diff.currentSnapshot.label

      splitHead.appendChild(oldHeadNo)
      splitHead.appendChild(oldHead)
      splitHead.appendChild(newHeadNo)
      splitHead.appendChild(newHead)
      content.appendChild(splitHead)

      diff.lines.forEach((line) => {
        const row = document.createElement('div')
        row.style.display = 'grid'
        row.style.gridTemplateColumns = '44px 1fr 44px 1fr'
        row.style.fontSize = '12px'
        row.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
        row.style.borderBottom =
          '1px solid color-mix(in srgb, var(--border-color) 70%, transparent)'

        const oldNo = document.createElement('div')
        oldNo.style.padding = '3px 8px'
        oldNo.style.color = 'var(--text-muted)'
        oldNo.textContent = line.oldLineNumber === null ? '' : String(line.oldLineNumber)

        const oldText = document.createElement('div')
        oldText.style.padding = '3px 8px'
        oldText.style.whiteSpace = 'pre-wrap'
        oldText.style.wordBreak = 'break-word'
        oldText.style.color = 'var(--text-color)'
        oldText.style.borderRight = '1px solid var(--border-color)'
        oldText.textContent = line.type === 'added' ? '' : line.oldText

        const newNo = document.createElement('div')
        newNo.style.padding = '3px 8px'
        newNo.style.color = 'var(--text-muted)'
        newNo.textContent = line.newLineNumber === null ? '' : String(line.newLineNumber)

        const newText = document.createElement('div')
        newText.style.padding = '3px 8px'
        newText.style.whiteSpace = 'pre-wrap'
        newText.style.wordBreak = 'break-word'
        newText.style.color = 'var(--text-color)'
        newText.textContent = line.type === 'deleted' ? '' : line.newText

        if (line.type === 'deleted') {
          oldNo.style.background = 'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
          oldText.style.background = 'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
        } else if (line.type === 'added') {
          newNo.style.background = 'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
          newText.style.background = 'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
        } else if (line.type === 'context') {
          oldNo.style.background = 'var(--paper-bg)'
          oldText.style.background = 'var(--paper-bg)'
          newNo.style.background = 'var(--paper-bg)'
          newText.style.background = 'var(--paper-bg)'
        } else {
          oldNo.style.background = 'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
          oldText.style.background = 'color-mix(in srgb, var(--danger-color) 20%, var(--paper-bg))'
          newNo.style.background = 'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
          newText.style.background = 'color-mix(in srgb, var(--success-color) 24%, var(--paper-bg))'
        }

        row.appendChild(oldNo)
        row.appendChild(oldText)
        row.appendChild(newNo)
        row.appendChild(newText)
        content.appendChild(row)
      })
    }

    const modal = new Dialog({
      title: this.i18n.completeDiffTitle,
      subtitle: this.i18n.fullDiffSubtitle(
        diff.currentSnapshot.label,
        diff.baseSnapshot?.label || this.i18n.blankBase,
        formatTime(diff.currentSnapshot.createdAt, this.locale),
      ),
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: 'fileText',
      iconBgClass: 'be-dialog-icon--primary',
      host: (this.editorCore.editor.options.element as HTMLElement).closest(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null,
      onClose: () => {},
      width: '70%',
    })
    modal.setContent(content)
    modal.show()
  }

  public show() {
    this.dialog.show()
  }
}
