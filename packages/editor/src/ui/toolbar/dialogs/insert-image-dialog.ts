import { Dialog } from '../../components/dialog';
import { Tabs } from '../../components/tabs';
import { createInput } from '../../components/input';
import { createUploadZone } from '../../components/upload-zone';

export class InsertImageDialog {
  private dialog: Dialog;
  private imageUrl: string = '';
  private onSave: (url: string) => void;
  private previewContainer: HTMLElement;
  private saveBtn: HTMLButtonElement;

  constructor(onSave: (url: string) => void) {
    this.onSave = onSave;

    // URL tab content
    const urlTabContent = document.createElement('div');
    const urlInput = createInput({
      label: '图片地址',
      placeholder: 'https://example.com/image.jpg',
      autoFocus: true,
      themeColor: 'purple',
      onChange: (val) => {
        this.imageUrl = val;
        this.updatePreview(val);
        this.updateSaveButton();
      }
    });
    urlTabContent.appendChild(urlInput);

    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'be-mt-4 be-p-4 be-bg-gray-50 be-rounded-xl';
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
      }
    });

    const tabs = new Tabs([
      { id: 'url', label: '图片链接', icon: 'link', content: urlTabContent },
      { id: 'upload', label: '上传图片', icon: 'upload', content: uploadTabContent }
    ]);

    const content = document.createElement('div');
    content.appendChild(tabs.getElement());

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
    this.saveBtn.textContent = '插入图片';
    this.saveBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-text-white be-rounded-xl be-cursor-pointer be-transition-all be-border-0';
    this.saveBtn.style.fontFamily = 'inherit';
    this.saveBtn.disabled = true;
    this.updateSaveButton();
    this.saveBtn.addEventListener('mouseenter', () => {
      if (!this.saveBtn.disabled) this.saveBtn.style.boxShadow = '0 4px 12px rgba(139,92,246,0.4)';
    });
    this.saveBtn.addEventListener('mouseleave', () => {
      if (!this.saveBtn.disabled) this.saveBtn.style.boxShadow = '0 1px 3px rgba(139,92,246,0.3)';
    });
    this.saveBtn.onclick = () => {
      if (this.imageUrl) {
        this.onSave(this.imageUrl);
        this.dialog.close();
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(this.saveBtn);

    this.dialog = new Dialog({
      title: '插入图片',
      subtitle: '从URL或本地上传图片',
      icon: 'image',
      iconBgClass: 'be-bg-gradient-to-br be-from-purple-500 be-to-pink-500',
      onClose: () => {},
      width: '520px'
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
      <p class="be-text-xs be-text-gray-500 be-mb-2 be-m-0">预览</p>
      <img src="${url}" class="be-max-h-48 be-rounded-lg be-mx-auto be-block be-max-w-full" />
    `;
    const img = this.previewContainer.querySelector('img');
    if (img) {
      img.onerror = () => {
        img.src = '';
        img.alt = '无效的图片链接';
      };
    }
  }

  private updateSaveButton() {
    const disabled = !this.imageUrl.trim();
    this.saveBtn.disabled = disabled;
    if (disabled) {
      this.saveBtn.style.background = '#e5e7eb';
      this.saveBtn.style.color = '#9ca3af';
      this.saveBtn.style.cursor = 'not-allowed';
      this.saveBtn.style.boxShadow = 'none';
    } else {
      this.saveBtn.style.background = 'linear-gradient(135deg,#8b5cf6,#ec4899)';
      this.saveBtn.style.color = 'white';
      this.saveBtn.style.cursor = 'pointer';
      this.saveBtn.style.boxShadow = '0 1px 3px rgba(139,92,246,0.3)';
    }
  }

  public show() {
    this.dialog.show();
  }
}
