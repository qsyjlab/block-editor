import { icons } from '../toolbar/icons'

export function createUploadZone(options: {
  onUpload: (files: FileList) => void
  accept?: string
  hintText?: string
  clickText?: string
  supportText?: string
}): HTMLElement {
  const container = document.createElement('div')
  container.className = 'be-upload-zone'

  const iconBox = document.createElement('div')
  iconBox.className = 'be-upload-zone__icon-box'

  if (icons.upload) {
    iconBox.innerHTML = icons.upload
    const svg = iconBox.querySelector('svg')
    if (svg) {
      svg.style.color = 'var(--primary-color)'
      svg.setAttribute('width', '28')
      svg.setAttribute('height', '28')
    }
  }
  container.appendChild(iconBox)

  const text = document.createElement('p')
  text.className = 'be-upload-zone__text'
  const hintText = options.hintText || 'Drag an image here or'
  const clickText = options.clickText || 'click to upload'
  text.innerHTML = `${hintText} <span class="be-upload-zone__text-action">${clickText}</span>`
  container.appendChild(text)

  const subtext = document.createElement('p')
  subtext.className = 'be-upload-zone__subtext'
  subtext.textContent = options.supportText || 'Supports JPG, PNG, GIF, WebP'
  container.appendChild(subtext)

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = options.accept || 'image/*'
  fileInput.className = 'be-hidden'
  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files.length > 0) {
      options.onUpload(fileInput.files)
    }
  }
  container.appendChild(fileInput)

  container.onclick = () => fileInput.click()

  container.ondragover = (e) => {
    e.preventDefault()
    container.classList.add('is-dragover')
  }

  container.ondragleave = (e) => {
    e.preventDefault()
    container.classList.remove('is-dragover')
  }

  container.ondrop = (e) => {
    e.preventDefault()
    container.classList.remove('is-dragover')
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      options.onUpload(e.dataTransfer.files)
    }
  }

  return container
}
