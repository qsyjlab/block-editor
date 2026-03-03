import { icons } from '../toolbar/icons';

export function createUploadZone(options: {
    onUpload: (files: FileList) => void;
    accept?: string;
}): HTMLElement {
    const container = document.createElement('div');
    container.className = 'be-border-2 be-border-dashed be-border-gray-300 be-rounded-xl be-p-12 be-text-center be-hover:border-purple-400 be-transition-colors be-cursor-pointer';
    
    const iconBox = document.createElement('div');
    iconBox.className = 'be-w-16 be-h-16 be-bg-gradient-to-br be-from-purple-100 be-to-pink-100 be-rounded-2xl be-flex be-items-center be-justify-center be-mx-auto be-mb-4';
    
    if (icons.upload) {
        iconBox.innerHTML = icons.upload;
        const svg = iconBox.querySelector('svg');
        if (svg) {
            svg.classList.add('be-text-purple-600');
            svg.setAttribute('width', '28');
            svg.setAttribute('height', '28');
        }
    }
    container.appendChild(iconBox);

    const text = document.createElement('p');
    text.className = 'be-text-sm be-text-gray-600 be-mb-2';
    text.innerHTML = '拖拽图片到此处或 <span class="be-text-purple-600 be-font-medium">点击上传</span>';
    container.appendChild(text);

    const subtext = document.createElement('p');
    subtext.className = 'be-text-xs be-text-gray-400';
    subtext.textContent = '支持 JPG, PNG, GIF, WebP 格式';
    container.appendChild(subtext);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = options.accept || 'image/*';
    fileInput.className = 'be-hidden';
    fileInput.onchange = () => {
        if (fileInput.files && fileInput.files.length > 0) {
            options.onUpload(fileInput.files);
        }
    };
    container.appendChild(fileInput);

    container.onclick = () => fileInput.click();

    container.ondragover = (e) => {
        e.preventDefault();
        container.classList.add('be-border-purple-500', 'be-bg-purple-50');
    };

    container.ondragleave = (e) => {
        e.preventDefault();
        container.classList.remove('be-border-purple-500', 'be-bg-purple-50');
    };

    container.ondrop = (e) => {
        e.preventDefault();
        container.classList.remove('be-border-purple-500', 'be-bg-purple-50');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            options.onUpload(e.dataTransfer.files);
        }
    };

    return container;
}
