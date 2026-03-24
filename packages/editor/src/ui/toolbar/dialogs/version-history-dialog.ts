import { EditorCore } from '../../../core/EditorCore'
import { Dialog } from '../../components/dialog'

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export class VersionHistoryDialog {
  private dialog: Dialog
  private editorCore: EditorCore
  private listRoot: HTMLElement

  constructor(editorCore: EditorCore) {
    this.editorCore = editorCore
    this.listRoot = document.createElement('div')
    this.listRoot.className = 'be-space-y-2'

    const content = document.createElement('div')
    content.className = 'be-space-y-4'

    const tips = document.createElement('div')
    tips.className = 'be-text-xs be-text-gray-500'
    tips.textContent = '自动快照会定期保存，你也可以手动创建快照后再回滚。'
    content.appendChild(tips)

    const createBtn = document.createElement('button')
    createBtn.textContent = '立即保存快照'
    createBtn.className = 'be-px-4 be-py-2 be-text-sm be-font-medium be-text-white be-rounded-lg be-border-0 be-cursor-pointer'
    createBtn.style.cssText = 'font-family:inherit;background:linear-gradient(135deg,#3b82f6,#2563eb);'
    createBtn.onclick = () => {
      this.editorCore.versionHistory.createManualSnapshot('手动快照')
      this.renderList()
    }
    content.appendChild(createBtn)

    content.appendChild(this.listRoot)

    this.dialog = new Dialog({
      title: '版本历史',
      subtitle: '本地快照与回滚',
      icon: 'fileText',
      iconBgClass: 'be-bg-gradient-to-br be-from-indigo-500 be-to-violet-600',
      onClose: () => {},
      width: '640px',
    })

    this.dialog.setContent(content)
    this.renderList()
  }

  private renderList() {
    const snapshots = this.editorCore.versionHistory.listSnapshots()
    this.listRoot.innerHTML = ''

    if (snapshots.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'be-text-sm be-text-gray-500 be-py-3'
      empty.textContent = '暂无快照'
      this.listRoot.appendChild(empty)
      return
    }

    snapshots.forEach((snapshot) => {
      const row = document.createElement('div')
      row.className = 'be-border be-border-gray-200 be-rounded-xl be-p-3 be-flex be-items-center be-justify-between be-gap-3'

      const left = document.createElement('div')
      left.className = 'be-min-w-0'

      const title = document.createElement('div')
      title.className = 'be-text-sm be-font-medium be-text-gray-900'
      title.textContent = `${snapshot.label} · ${formatTime(snapshot.createdAt)}`

      const meta = document.createElement('div')
      meta.className = 'be-text-xs be-text-gray-500 be-mt-1 be-truncate'
      meta.textContent = `${snapshot.source === 'auto' ? '自动' : snapshot.source === 'manual' ? '手动' : '回滚前'} · ${snapshot.excerpt}`

      left.appendChild(title)
      left.appendChild(meta)

      const restoreBtn = document.createElement('button')
      restoreBtn.textContent = '回滚到此版本'
      restoreBtn.className = 'be-px-3 be-py-1.5 be-text-xs be-font-medium be-rounded-lg be-border be-border-gray-200 be-bg-white be-cursor-pointer be-shrink-0'
      restoreBtn.onclick = () => {
        const ok = window.confirm('确认回滚到该版本？当前内容会被替换。')
        if (!ok) return
        this.editorCore.versionHistory.restoreSnapshot(snapshot.id)
        this.dialog.close()
      }

      row.appendChild(left)
      row.appendChild(restoreBtn)
      this.listRoot.appendChild(row)
    })
  }

  public show() {
    this.dialog.show()
  }
}
