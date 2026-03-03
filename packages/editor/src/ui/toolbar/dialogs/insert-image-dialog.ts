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
    
    // Create Tabs Content
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
    this.previewContainer.className = 'be-mt-4 be-p-4 be-bg-gray-50 be-rounded-xl be-hidden';
    urlTabContent.appendChild(this.previewContainer);

    const uploadTabContent = createUploadZone({
        onUpload: (files) => {
             // Placeholder for upload logic
             // In a real app, we would upload to server here
             if (files.length > 0) {
                 const file = files[0];
                 const reader = new FileReader();
                 reader.onload = (e) => {
                     if (e.target?.result) {
                         this.imageUrl = e.target.result as string;
                         // We might want to switch to URL tab to show it, or just handle it here
                         // For now, let's just save it directly or show preview
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
    footer.className = 'be-flex be-justify-end be-gap-3 be-mt-6 be-pt-4 be-border-t be-border-gray-100';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-text-gray-600 be-hover:bg-gray-100 be-rounded-xl be-transition-all';
    cancelBtn.onclick = () => this.dialog.close();
    
    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = '插入图片';
    this.saveBtn.className = 'be-px-5 be-py-2.5 be-text-sm be-font-medium be-bg-gradient-to-r be-from-purple-500 be-to-pink-500 be-text-white be-rounded-xl be-hover:from-purple-600 be-hover:to-pink-600 be-disabled:from-gray-300 be-disabled:to-gray-300 be-disabled:cursor-not-allowed be-transition-all be-shadow-sm be-hover:shadow-md';
    this.saveBtn.disabled = true;
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
        onClose: () => {}, // Dialog handles destroy
        width: '520px'
    });
    
    this.dialog.setContent(content);
    this.dialog.appendFooter(footer);
  }

  private updatePreview(url: string) {
      if (!url) {
          this.previewContainer.classList.add('be-hidden');
          return;
      }
      this.previewContainer.classList.remove('be-hidden');
      this.previewContainer.innerHTML = `
        <p class="be-text-xs be-text-gray-500 be-mb-2">预览</p>
        <img src="${url}" class="be-max-h-48 be-rounded-lg be-mx-auto" />
      `;
      const img = this.previewContainer.querySelector('img');
      if (img) {
          img.onerror = () => {
              // img.style.display = 'none';
              img.src = '';
              img.alt = '无效的图片链接';
          }
      }
  }

  private updateSaveButton() {
      this.saveBtn.disabled = !this.imageUrl.trim();
  }

  public show() {
    this.dialog.show();
  }
}
