import { Dialog } from '../../components/dialog';
import { Tabs } from '../../components/tabs';
import { createInput } from '../../components/input';
import { createUploadZone } from '../../components/upload-zone';
import type { InsertImageDialogI18n } from '../../../i18n';

export class InsertImageDialog {
  private dialog: Dialog;
  private imageUrl: string = '';
  private onSave: (url: string) => void;
  private previewContainer: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private i18n: InsertImageDialogI18n;

  constructor(
    onSave: (url: string) => void,
    i18n?: InsertImageDialogI18n,
    host?: HTMLElement | null,
  ) {
    this.onSave = onSave;
    this.i18n = i18n || {
      title: '插入图片',
      subtitle: '从URL或本地上传图片',
      closeDialogAriaLabel: '关闭对话框',
      tabUrl: '图片链接',
      tabUpload: '上传图片',
      urlLabel: '图片地址',
      urlPlaceholder: 'https://example.com/image.jpg',
      preview: '预览',
      invalidImage: '无效的图片链接',
      cancel: '取消',
      insert: '插入图片',
      uploadHint: '拖拽图片到此处或',
      uploadClick: '点击上传',
      uploadSupport: '支持 JPG, PNG, GIF, WebP 格式',
    };

    const urlTabContent = document.createElement('div');
    const urlInput = createInput({
      label: this.i18n.urlLabel,
      placeholder: this.i18n.urlPlaceholder,
      autoFocus: true,
      themeColor: 'purple',
      onChange: (val) => {
        this.imageUrl = val;
        this.updatePreview(val);
        this.updateSaveButton();
      },
    });
    urlTabContent.appendChild(urlInput);

    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'be-mt-4 be-p-4 be-rounded-xl';
    this.previewContainer.style.background = 'var(--surface-soft)';
    this.previewContainer.style.border = '1px solid var(--border-color)';
    this.previewContainer.style.display = 'none';
    urlTabContent.appendChild(this.previewContainer);

    const uploadTabContent = createUploadZone({
      onUpload: (files) => {
        if (files.length > 0) {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              this.imageUrl = e.target.result as string;
              this.onSave(this.imageUrl);
              this.dialog.close();
            }
          };
          reader.readAsDataURL(file);
        }
      },
      hintText: this.i18n.uploadHint,
      clickText: this.i18n.uploadClick,
      supportText: this.i18n.uploadSupport,
    });

    const tabs = new Tabs([
      { id: 'url', label: this.i18n.tabUrl, icon: 'link', content: urlTabContent },
      { id: 'upload', label: this.i18n.tabUpload, icon: 'upload', content: uploadTabContent },
    ]);

    const content = document.createElement('div');
    content.appendChild(tabs.getElement());

    const footer = document.createElement('div');
    footer.className = 'be-dialog-footer be-dialog-footer-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = this.i18n.cancel;
    cancelBtn.className = 'be-dialog-btn be-dialog-btn--secondary';
    cancelBtn.style.fontFamily = 'inherit';
    cancelBtn.onclick = () => this.dialog.close();

    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = this.i18n.insert;
    this.saveBtn.className = 'be-dialog-btn be-dialog-btn--primary';
    this.saveBtn.style.fontFamily = 'inherit';
    this.saveBtn.disabled = true;
    this.updateSaveButton();
    this.saveBtn.onclick = () => {
      if (this.imageUrl) {
        this.onSave(this.imageUrl);
        this.dialog.close();
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(this.saveBtn);

    this.dialog = new Dialog({
      title: this.i18n.title,
      subtitle: this.i18n.subtitle,
      closeAriaLabel: this.i18n.closeDialogAriaLabel,
      icon: 'image',
      iconBgClass: 'be-dialog-icon--primary',
      host,
      onClose: () => {},
      width: '520px',
    });

    this.dialog.setContent(content);
    this.dialog.appendFooter(footer);
  }

  private updatePreview(url: string) {
    if (!url) {
      this.previewContainer.style.display = 'none';
      return;
    }
    this.previewContainer.style.display = 'block';
    this.previewContainer.innerHTML = `
      <p class="be-text-xs be-mb-2 be-m-0" style="color:var(--text-muted)">${this.i18n.preview}</p>
      <img src="${url}" class="be-max-h-48 be-rounded-lg be-mx-auto be-block be-max-w-full" />
    `;
    const img = this.previewContainer.querySelector('img');
    if (img) {
      img.onerror = () => {
        img.src = '';
        img.alt = this.i18n.invalidImage;
      };
    }
  }

  private updateSaveButton() {
    const disabled = !this.imageUrl.trim();
    this.saveBtn.disabled = disabled;
    if (disabled) {
      this.saveBtn.classList.add('is-disabled');
    } else {
      this.saveBtn.classList.remove('is-disabled');
    }
  }

  public show() {
    this.dialog.show();
  }
}
