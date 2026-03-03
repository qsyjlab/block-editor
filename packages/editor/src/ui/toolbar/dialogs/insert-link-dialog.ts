import { Dialog } from '../../components/dialog';
import { createInput } from '../../components/input';

export class InsertLinkDialog {
  private dialog: Dialog;
  private url: string = '';
  private text: string = '';
  private onSave: (url: string, text: string) => void;
  private saveBtn: HTMLButtonElement;

  constructor(onSave: (url: string, text: string) => void, initialText: string = '') {
    this.onSave = onSave;
    this.text = initialText;
    
    const content = document.createElement('div');
    content.className = 'be-space-y-4';

    const urlInput = createInput({
        label: '链接地址',
        placeholder: 'https://example.com',
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
        label: '显示文本 <span class="be-text-gray-400 be-font-normal">(可选)</span>',
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
    footer.className = 'be-flex be-justify-end be-gap-3 be-mt-6 be-pt-4 be-border-t be-border-gray-100';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-text-gray-600 be-hover:bg-gray-100 be-rounded-xl be-transition-all';
    cancelBtn.onclick = () => this.dialog.close();
    
    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = '插入链接';
    this.saveBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-bg-gradient-to-r be-from-blue-500 be-to-blue-600 be-text-white be-rounded-xl be-hover:from-blue-600 be-hover:to-blue-700 be-disabled:from-gray-300 be-disabled:to-gray-300 be-disabled:cursor-not-allowed be-transition-all be-shadow-sm be-hover:shadow-md';
    this.saveBtn.disabled = true;
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
        icon: 'link', // reusing 'link' icon
        iconBgClass: 'be-bg-gradient-to-br be-from-blue-500 be-to-blue-600',
        onClose: () => {},
        width: '480px'
    });
    
    this.dialog.setContent(content);
    this.dialog.appendFooter(footer);
  }

  private updateSaveButton() {
      this.saveBtn.disabled = !this.url.trim();
  }

  public show() {
    this.dialog.show();
  }
}
