/**
 * 图片来源选择：本地文件优先（对齐飞书），取消选择时可回退 URL 输入。
 */
export function pickImageSource(options?: { allowUrlFallback?: boolean }): Promise<string | null> {
  const allowUrlFallback = options?.allowUrlFallback ?? true
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'

    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      input.remove()
      resolve(value)
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        // 用户取消文件选择 → 可选回退到 URL 输入
        if (allowUrlFallback) {
          const url = window.prompt('输入图片 URL（留空取消）')
          finish(url && url.trim() ? url.trim() : null)
        } else {
          finish(null)
        }
        return
      }
      const reader = new FileReader()
      reader.onload = () => finish(reader.result as string)
      reader.onerror = () => finish(null)
      reader.readAsDataURL(file)
    })

    // 取消对话框在部分浏览器不触发 change；focus 回来时若未选文件则结算
    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (settled) return
          if (input.files && input.files.length > 0) return
          input.remove()
          if (allowUrlFallback) {
            const url = window.prompt('输入图片 URL（留空取消）')
            finish(url && url.trim() ? url.trim() : null)
          } else {
            finish(null)
          }
        }, 300)
      },
      { once: true },
    )

    document.body.appendChild(input)
    input.click()
  })
}
