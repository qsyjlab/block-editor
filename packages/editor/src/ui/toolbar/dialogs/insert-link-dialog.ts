import { Dialog } from '../../components/dialog'
import { createInput } from '../../components/input'
import { resolveEditorI18n } from '../../../i18n'
import type { InsertLinkDialogI18n } from '../../../i18n'

export class InsertLinkDialog {
  private dialog: Dialog
  private url: string = ''
  private text: string = ''
  private onSave: (url: string, text: string) => void
  private saveBtn: HTMLButtonElement
  private i18n: InsertLinkDialogI18n

  constructor(
    onSave: (url: string, text: string) => void,
    initialText: string = '',
    initialUrl: string = '',
    i18n?: InsertLinkDialogI18n,
    host?: HTMLElement | null,
  ) {
    this.onSave = onSave
    this.text = initialText
    this.url = initialUrl
    this.i18n = i18n || resolveEditorI18n('en-US').dialogs.insertLink

    const content = document.createElement('div')
    content.className = 'be-space-y-4'

    const urlInput = createInput({
      label: this.i18n.urlLabel,
      placeholder: this.i18n.urlPlaceholder,
      value: initialUrl,
      autoFocus: true,
      icon: 'externalLink',
      themeColor: 'blue',
      onChange: (val) => {
        this.url = val
        this.updateSaveButton()
      },
    })
    content.appendChild(urlInput)

    const textInput = createInput({
      label: `${this.i18n.textLabel} <span class="be-input-label-muted">${this.i18n.textOptionalHint}</span>`,
      placeholder: this.i18n.textPlaceholder,
      value: initialText,
      themeColor: 'blue',
      onChange: (val) => {
        this.text = val
      },
    })
    content.appendChild(textInput)

    const footer = document.createElement('div')
    footer.className = 'be-dialog-footer be-dialog-footer-row'

    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = this.i18n.cancel
    cancelBtn.className = 'be-dialog-btn be-dialog-btn--secondary'
    cancelBtn.style.fontFamily = 'inherit'
    cancelBtn.onclick = () => this.dialog.close()

    this.saveBtn = document.createElement('button')
    this.saveBtn.textContent = initialUrl ? this.i18n.update : this.i18n.insert
    this.saveBtn.className = 'be-dialog-btn be-dialog-btn--primary'
    this.saveBtn.style.cssText = 'font-family:inherit;'
    this.saveBtn.disabled = !this.url.trim()
    this.updateSaveButton()
    this.saveBtn.onclick = () => {
      if (this.url) {
        this.onSave(this.url, this.text || this.url)
        this.dialog.close()
      }
    }

    footer.appendChild(cancelBtn)
    footer.appendChild(this.saveBtn)

    this.dialog = new Dialog({
      title: this.i18n.title,
      subtitle: this.i18n.subtitle,
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: 'link',
      iconBgClass: 'be-dialog-icon--primary',
      host,
      onClose: () => {},
      width: '480px',
    })

    this.dialog.setContent(content)
    this.dialog.appendFooter(footer)
  }

  private updateSaveButton() {
    const disabled = !this.url.trim()
    this.saveBtn.disabled = disabled
    if (disabled) {
      this.saveBtn.classList.add('is-disabled')
    } else {
      this.saveBtn.classList.remove('is-disabled')
    }
  }

  public show() {
    this.dialog.show()
  }
}
