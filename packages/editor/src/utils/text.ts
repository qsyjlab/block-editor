/**
 * Slugify a string
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
}

/**
 * Count words in a string
 */
export const wordCount = (text: string): number => {
  return text.split(/\s+/).filter((w) => w !== '').length
}

/**
 * Strip HTML tags
 */
export const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
