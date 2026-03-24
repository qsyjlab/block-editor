import { Dialog } from '../../components/dialog';
import { createInput } from '../../components/input';

export class InsertLinkDialog {
  private dialog: Dialog;
  private url: string = '';
  private text: string = '';
  private onSave: (url: string, text: string) => void;
  private saveBtn: HTMLButtonElement;

  constructor(onSave: (url: string, text: string) => void, initialText: string = '', initialUrl: string = '') {
    this.onSave = onSave;
    this.text = initialText;
    this.url = initialUrl;

    const content = document.createElement('div');
    content.className = 'be-space-y-4';

    const urlInput = createInput({
      label: '链接地址',
      placeholder: 'https://example.com',
      value: initialUrl,
      autoFocus: true,
      icon: 'externalLink',
      themeColor: 'blue',
      onChange: (val) => {
        this.url = val;
        this.updateSaveButton();
      }
    });
    content.appendChild(urlInput);

    const textInput = createInput({
      label: '显示文本 <span style="color:#9ca3af;font-weight:400">(可选)</span>',
      placeholder: '链接文本',
      value: initialText,
      themeColor: 'blue',
      onChange: (val) => {
        this.text = val;
      }
    });
    content.appendChild(textInput);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'be-flex be-justify-end be-gap-3 be-mt-6 be-pt-4 be-border-t be-border-gray-100 be-shrink-0';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-text-gray-600 be-bg-transparent be-border be-border-gray-200 be-rounded-xl be-cursor-pointer be-transition-all';
    cancelBtn.style.fontFamily = 'inherit';
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#f9fafb'; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = ''; });
    cancelBtn.onclick = () => this.dialog.close();

    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = initialUrl ? '更新链接' : '插入链接';
    this.saveBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-text-white be-rounded-xl be-cursor-pointer be-transition-all be-border-0';
    this.saveBtn.style.cssText = `font-family:inherit;background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 1px 3px rgba(59,130,246,0.3);`;
    this.saveBtn.disabled = !this.url.trim();
    this.updateSaveButton();
    this.saveBtn.addEventListener('mouseenter', () => {
      if (!this.saveBtn.disabled) this.saveBtn.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)';
    });
    this.saveBtn.addEventListener('mouseleave', () => {
      if (!this.saveBtn.disabled) this.saveBtn.style.boxShadow = '0 1px 3px rgba(59,130,246,0.3)';
    });
    this.saveBtn.onclick = () => {
      if (this.url) {
        this.onSave(this.url, this.text || this.url);
        this.dialog.close();
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(this.saveBtn);

    this.dialog = new Dialog({
      title: '插入链接',
      subtitle: '添加超链接到你的文档',
      icon: 'link',
      iconBgClass: 'be-bg-gradient-to-br be-from-blue-500 be-to-blue-600',
      onClose: () => {},
      width: '480px'
    });

    this.dialog.setContent(content);
    this.dialog.appendFooter(footer);
  }

  private updateSaveButton() {
    const disabled = !this.url.trim();
    this.saveBtn.disabled = disabled;
    if (disabled) {
      this.saveBtn.style.background = '#e5e7eb';
      this.saveBtn.style.color = '#9ca3af';
      this.saveBtn.style.cursor = 'not-allowed';
      this.saveBtn.style.boxShadow = 'none';
    } else {
      this.saveBtn.style.background = 'linear-gradient(135deg,#3b82f6,#2563eb)';
      this.saveBtn.style.color = 'white';
      this.saveBtn.style.cursor = 'pointer';
      this.saveBtn.style.boxShadow = '0 1px 3px rgba(59,130,246,0.3)';
    }
  }

  public show() {
    this.dialog.show();
  }
}
