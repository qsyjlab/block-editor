import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const APP_HOST = '127.0.0.1'
const APP_PORT_START = 4174
const APP_PORT_MAX = 6174
const THIS_FILE = fileURLToPath(import.meta.url)
const APP_CWD = path.resolve(path.dirname(THIS_FILE), '../..')
const REGRESSION_ROUTE = '/scenes/regression?lang=zh-CN&theme=dark&collab=0'
const DRAG_SHOWCASE_ROUTE = '/scenes/drag-showcase?lang=zh-CN&theme=dark&collab=0'
const TABLE_SHOWCASE_ROUTE = '/scenes/table-showcase?lang=zh-CN&theme=dark&collab=0'

let devServer: ChildProcessWithoutNullStreams | null = null
let browser: Browser | null = null
let appPort = APP_PORT_START
let appUrl = `http://${APP_HOST}:${appPort}`
const devServerLogs: string[] = []

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isPortAvailable(port: number, host: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(false))
    server.listen(port, host, () => {
      server.close(() => resolve(true))
    })
  })
}

async function findAvailablePort(start = APP_PORT_START, max = APP_PORT_MAX): Promise<number> {
  for (let port = start; port <= max; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port, APP_HOST)) {
      return port
    }
  }
  throw new Error(`No available port found in range ${start}-${max}`)
}

async function waitForServerReady(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${appUrl}/`)
      if (res.ok) return
    } catch {
      // server not ready yet
    }
    await sleep(300)
  }
  const latestLogs = devServerLogs.slice(-20).join('\n')
  throw new Error(
    `Playground dev server not ready within ${timeoutMs}ms @ ${appUrl}\n${latestLogs}`,
  )
}

function randomRoom(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function openRegressionPage(page: Page, roomPrefix: string) {
  await openScenePage(
    page,
    roomPrefix,
    REGRESSION_ROUTE,
    '回归验证场景',
    '请选中这一段文本后点击工具栏',
  )
}

async function openDragShowcasePage(page: Page, roomPrefix: string) {
  await openScenePage(page, roomPrefix, DRAG_SHOWCASE_ROUTE, '拖拽专项场景', '拖拽源段落 A')
}

async function openTableShowcasePage(page: Page, roomPrefix: string) {
  await openScenePage(page, roomPrefix, TABLE_SHOWCASE_ROUTE, '表格专项场景', '表格 handle')
}

async function openScenePage(
  page: Page,
  roomPrefix: string,
  routePathWithQuery: string,
  expectedTitle: string,
  readyText: string,
) {
  await page.setViewportSize({ width: 1600, height: 980 })
  const room = randomRoom(roomPrefix)
  await page.goto(`${appUrl}${routePathWithQuery}&room=${room}`, {
    waitUntil: 'networkidle',
  })
  await expect(await page.locator('.scene-header h2').first().isVisible()).toBe(true)
  await expect(await page.locator('.scene-header h2').first().textContent()).toContain(
    expectedTitle,
  )
  await page.waitForFunction(
    (text) => {
      const el = document.querySelector('.ProseMirror')
      return Boolean(el && el.textContent && el.textContent.includes(text))
    },
    readyText,
    { timeout: 60_000 },
  )
  await expect(await page.locator('.ProseMirror').isVisible()).toBe(true)
}

async function selectTextInParagraph(page: Page, paragraphText: string) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) {
    throw new Error(`Paragraph not found for text: ${paragraphText}`)
  }

  const y = box.y + box.height / 2
  const startX = box.x + 12
  await page.mouse.click(startX, y)
  await page.keyboard.down('Shift')
  for (let i = 0; i < 18; i += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await page.keyboard.up('Shift')
  await page.waitForTimeout(160)

  let selectedLen = await page.evaluate(() => window.getSelection()?.toString().trim().length || 0)

  if (selectedLen === 0) {
    const endX = Math.min(box.x + box.width - 12, startX + 220)
    await page.mouse.move(startX, y)
    await page.mouse.down()
    await page.mouse.move(endX, y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(120)
    selectedLen = await page.evaluate(() => window.getSelection()?.toString().trim().length || 0)
  }

  if (selectedLen === 0) {
    selectedLen = await page.evaluate((text) => {
      const paragraphs = Array.from(document.querySelectorAll('.ProseMirror p'))
      const target = paragraphs.find((p) => p.textContent?.includes(text))
      if (!target) return 0

      const editor = target.closest('.ProseMirror') as HTMLElement | null
      editor?.focus()

      const selection = window.getSelection()
      if (!selection) return 0
      const range = document.createRange()
      range.selectNodeContents(target)
      selection.removeAllRanges()
      selection.addRange(range)

      document.dispatchEvent(new Event('selectionchange'))
      return selection.toString().trim().length || 0
    }, paragraphText)
  }

  expect(selectedLen).toBeGreaterThan(0)
}

async function waitForVisible(locator: ReturnType<Page['locator']>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await locator.isVisible()) return
    await sleep(120)
  }
  throw new Error('locator not visible within timeout')
}

async function isBlockHandleVisible(page: Page) {
  return await page.evaluate(() => {
    const handle = document.querySelector('.be-block-handle') as HTMLElement | null
    if (!handle) return false
    const style = getComputedStyle(handle)
    return style.display !== 'none' && style.opacity !== '0'
  })
}

async function revealBlockHandleForSelector(page: Page, selector: string, timeoutMs = 5000) {
  const handle = page.locator('.be-block-handle').first()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const rect = await page.evaluate((input) => {
      const root = document.querySelector('.ProseMirror') as HTMLElement | null
      const target = document.querySelector(input) as HTMLElement | null
      if (!root || !target) return null

      let block: HTMLElement | null = target
      while (block && block.parentElement && block.parentElement !== root) {
        block = block.parentElement
      }
      if (!block || block.parentElement !== root) return null

      const box = block.getBoundingClientRect()
      return {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }
    }, selector)

    if (rect) {
      const candidatePoints: [number, number][] = [
        [rect.left + 16, rect.top + rect.height / 2],
        [rect.left + 10, rect.top + Math.min(rect.height - 8, 12)],
        [rect.left + Math.min(60, rect.width / 2), rect.top + rect.height / 2],
        [rect.left + Math.min(24, rect.width - 6), rect.top + Math.max(8, rect.height - 10)],
      ]
      for (const [x, y] of candidatePoints) {
        await page.mouse.move(x, y)
        await sleep(90)
        if (await handle.isVisible()) return handle
      }
    }

    await sleep(120)
  }
  throw new Error(`block handle not visible for selector: ${selector}`)
}

async function focusParagraphAndMoveToEnd(page: Page, paragraphText: string) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) {
    throw new Error(`Paragraph not found for text: ${paragraphText}`)
  }

  await page.mouse.click(box.x + 12, box.y + box.height / 2)
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await page.waitForTimeout(80)
}

async function placeCursorAtParagraphEnd(page: Page, paragraphText: string) {
  const success = await page.evaluate((text) => {
    const paragraphs = Array.from(document.querySelectorAll('.ProseMirror p')) as HTMLElement[]
    const target = paragraphs.find((p) => p.textContent?.includes(text))
    if (!target) return false

    const selection = window.getSelection()
    if (!selection) return false
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
    target.closest('.ProseMirror')?.dispatchEvent(new Event('selectionchange'))
    ;(target.closest('.ProseMirror') as HTMLElement | null)?.focus()
    return true
  }, paragraphText)
  expect(success).toBe(true)
}

async function pressRedoShortcut(page: Page) {
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await page.waitForTimeout(100)
}

async function openBlockHandleMenuForParagraph(page: Page, paragraphText: string) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) {
    throw new Error(`Cannot get paragraph box for text: ${paragraphText}`)
  }

  await page.mouse.move(box.x + 14, box.y + box.height / 2)
  const handle = page.locator('.be-block-handle')
  await waitForVisible(handle)
  await handle.click()
  const menu = page.locator('.be-block-handle-menu')
  await waitForVisible(menu)
  return menu
}

async function clickBlockHandleMenuItem(menu: ReturnType<Page['locator']>, label: RegExp) {
  await waitForVisible(menu)
  const clicked = await menu.evaluate(
    (root, matcher) => {
      const re = new RegExp(matcher.source, matcher.flags)
      const items = Array.from(root.querySelectorAll<HTMLElement>('.menu-item, .dropdown-item'))
      const target = items.find((item) => re.test(item.textContent || ''))
      if (!target) return false
      target.click()
      return true
    },
    { source: label.source, flags: label.flags },
  )
  expect(clicked).toBe(true)
}

async function dragCurrentBlockHandleToTargetParagraph(
  page: Page,
  targetParagraphId: string,
  placement: 'before' | 'after' = 'before',
) {
  return await page.evaluate(
    ({ id, targetPlacement }) => {
      const handleEl = document.querySelector('.be-block-handle') as HTMLElement | null
      const target = document.getElementById(id) as HTMLElement | null
      if (!handleEl || !target) return { feedback: false, dropped: false }

      const dataTransfer = new DataTransfer()
      handleEl.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      )

      const rect = target.getBoundingClientRect()
      const clientY = targetPlacement === 'after' ? rect.bottom - 4 : rect.top + 6
      target.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: rect.left + 20,
          clientY,
        }),
      )
      const feedback = target.classList.contains('be-block-drop-target')

      target.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: rect.left + 20,
          clientY,
        }),
      )
      handleEl.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      )
      return { feedback, dropped: true }
    },
    { id: targetParagraphId, targetPlacement: placement },
  )
}

async function getTopLevelBlockTexts(page: Page) {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ProseMirror > *')).map((el) =>
      (el.textContent || '').replace(/\s+/g, ' ').trim(),
    ),
  )
}

async function getTopBlockIndexByText(page: Page, needle: string) {
  return await page.evaluate((text) => {
    const blocks = Array.from(document.querySelectorAll('.ProseMirror > *'))
    return blocks.findIndex((block) => (block.textContent || '').includes(text))
  }, needle)
}

async function getTopBlockIndexBySelector(page: Page, selector: string) {
  return await page.evaluate((input) => {
    const root = document.querySelector('.ProseMirror')
    const target = document.querySelector(input) as HTMLElement | null
    if (!root || !target) return -1

    let current: HTMLElement | null = target
    while (current && current.parentElement && current.parentElement !== root) {
      current = current.parentElement
    }
    if (!current || current.parentElement !== root) return -1
    return Array.from(root.children).indexOf(current)
  }, selector)
}

async function getSelectionTopBlockIndex(page: Page) {
  return await page.evaluate(() => {
    const selection = window.getSelection()
    if (!selection || !selection.anchorNode) return -1
    let current: HTMLElement | null =
      selection.anchorNode.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : (selection.anchorNode as HTMLElement | null)
    const root = document.querySelector('.ProseMirror') as HTMLElement | null
    if (!current || !root) return -1
    while (current && current.parentElement && current.parentElement !== root) {
      current = current.parentElement
    }
    if (!current || current.parentElement !== root) return -1
    const blocks = Array.from(root.children)
    return blocks.indexOf(current)
  })
}

async function focusParagraphEndForPaste(
  page: Page,
  paragraphText: string,
  expectedBlockIndex: number,
) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) throw new Error(`Paragraph not found for text: ${paragraphText}`)

  for (let i = 0; i < 3; i += 1) {
    await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2)
    await page.keyboard.press('End')
    await page.waitForTimeout(80)
    const selectionIndex = await getSelectionTopBlockIndex(page)
    if (selectionIndex === expectedBlockIndex) return
  }

  throw new Error('Unable to place selection at target paragraph for paste test')
}

async function expectButtonActive(button: ReturnType<Page['locator']>, active: boolean) {
  if (active) {
    await expect
      .poll(async () => (await button.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/)
    return
  }
  await expect
    .poll(async () => (await button.getAttribute('class')) || '', {
      timeout: 3000,
    })
    .not.toMatch(/\bactive\b/)
}

function normalizeSelectionText(input: string) {
  return input.replace(/\s+/g, '').trim()
}

function getCommonPrefixLength(a: string, b: string) {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) i += 1
  return i
}

async function getSelectedText(page: Page) {
  return await page.evaluate(() => window.getSelection()?.toString() || '')
}

async function selectByShiftArrow(page: Page, paragraphText: string, steps = 18) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) throw new Error(`Paragraph not found for text: ${paragraphText}`)

  const y = box.y + box.height / 2
  const startX = box.x + 12
  await page.mouse.click(startX, y)
  await page.keyboard.down('Shift')
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await page.keyboard.up('Shift')
  await page.waitForTimeout(120)
  let selection = await getSelectedText(page)
  if (normalizeSelectionText(selection).length > 0) return selection

  await page.keyboard.down('Shift')
  await page.keyboard.press('End')
  await page.keyboard.up('Shift')
  await page.waitForTimeout(80)
  selection = await getSelectedText(page)
  if (normalizeSelectionText(selection).length > 0) return selection

  await selectTextInParagraph(page, paragraphText)
  return await getSelectedText(page)
}

async function selectByMouseDrag(page: Page, paragraphText: string) {
  const paragraph = page.locator('.ProseMirror p', { hasText: paragraphText }).first()
  await paragraph.scrollIntoViewIfNeeded()
  const box = await paragraph.boundingBox()
  if (!box) throw new Error(`Paragraph not found for text: ${paragraphText}`)

  const y = box.y + box.height / 2
  const startX = box.x + 12
  const endX = Math.min(box.x + box.width - 14, startX + 220)
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(endX, y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  return await getSelectedText(page)
}

async function selectTextInTableCell(page: Page, cellText: string, steps = 4) {
  const cell = page.locator('.ProseMirror table td', { hasText: cellText }).first()
  await cell.scrollIntoViewIfNeeded()
  const box = await cell.boundingBox()
  if (!box) throw new Error(`Table cell not found for text: ${cellText}`)

  const y = box.y + box.height / 2
  const startX = box.x + 10
  await page.mouse.click(startX, y)
  await page.keyboard.down('Shift')
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await page.keyboard.up('Shift')
  await page.waitForTimeout(120)

  let selectedLen = await page.evaluate(() => window.getSelection()?.toString().trim().length || 0)

  if (selectedLen === 0) {
    selectedLen = await page.evaluate((text) => {
      const cells = Array.from(document.querySelectorAll('.ProseMirror table td'))
      const target = cells.find((td) => td.textContent?.includes(text))
      if (!target) return 0
      const selection = window.getSelection()
      if (!selection) return 0
      const range = document.createRange()
      range.selectNodeContents(target)
      selection.removeAllRanges()
      selection.addRange(range)
      document.dispatchEvent(new Event('selectionchange'))
      return selection.toString().trim().length || 0
    }, cellText)
  }

  expect(selectedLen).toBeGreaterThan(0)
  return cell
}

async function triggerTopToolbarCommand(page: Page, command: string): Promise<'direct' | 'more'> {
  const directBtn = page.locator(`.toolbar button[data-command="${command}"]`).first()
  if (await directBtn.isVisible()) {
    await directBtn.click()
    return 'direct'
  }

  const moreBtn = page.locator('.toolbar .more-btn').first()
  if (!(await moreBtn.isVisible())) {
    throw new Error(`Top toolbar command not found: ${command}`)
  }

  await moreBtn.click()
  const moreMenu = page.locator('.toolbar-more-menu')
  await waitForVisible(moreMenu)
  const commandBtn = page.locator(`.toolbar-more-menu button[data-command="${command}"]`).first()
  await waitForVisible(commandBtn)
  await commandBtn.click()
  return 'more'
}

async function pastePlainTextAtCursor(page: Page, text: string) {
  let permissionGranted = true
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: appUrl,
    })
  } catch {
    permissionGranted = false
  }

  if (!permissionGranted) {
    return { inserted: false, method: 'none' as const }
  }

  const clipboardReady = await page.evaluate(async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      return (await navigator.clipboard.readText()) === value
    } catch {
      return false
    }
  }, text)

  if (!clipboardReady) {
    return { inserted: false, method: 'none' as const }
  }

  await page.keyboard.press('ControlOrMeta+v')
  await page.waitForTimeout(150)

  const pasted = await page.evaluate((needle) => {
    const content = document.querySelector('.ProseMirror')?.textContent || ''
    return content.includes(needle)
  }, text)

  return { inserted: pasted, method: 'clipboard' as const }
}

async function focusCodeBlockEndByText(page: Page, codeText: string) {
  const code = page.locator('.code-block-wrapper code', { hasText: codeText }).first()
  await code.scrollIntoViewIfNeeded()
  const box = await code.boundingBox()
  if (!box) throw new Error(`Code block not found for text: ${codeText}`)

  for (let i = 0; i < 4; i += 1) {
    const clickX = Math.min(box.x + box.width - 12, box.x + 420)
    const clickY = box.y + Math.min(box.height - 10, 18)
    await page.mouse.click(clickX, clickY)
    await page.keyboard.press('End')
    await page.waitForTimeout(80)
    const probe = await getCodeBlockProbe(page, '__probe__')
    if (probe.selectionInsideCode) {
      return
    }
  }

  throw new Error('Unable to place selection inside code block')
}

async function getCodeBlockProbe(page: Page, pastedText: string) {
  return await page.evaluate((needle) => {
    const code = document.querySelector('.code-block-wrapper code') as HTMLElement | null
    const codeText = code?.textContent || ''
    const afterParagraph = document.querySelector('#be-code-after-paragraph') as HTMLElement | null
    const afterText = afterParagraph?.textContent || ''
    const selection = window.getSelection()
    let selectionInsideCode = false
    if (selection?.anchorNode) {
      const anchorEl =
        selection.anchorNode.nodeType === Node.TEXT_NODE
          ? selection.anchorNode.parentElement
          : (selection.anchorNode as HTMLElement | null)
      selectionInsideCode = Boolean(anchorEl?.closest('.code-block-wrapper'))
    }
    return {
      codeText,
      codeContains: codeText.includes(needle),
      afterContains: afterText.includes(needle),
      selectionInsideCode,
    }
  }, pastedText)
}

async function insertTextAtCurrentSelection(page: Page, text: string) {
  const inserted = await page.evaluate((value) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return false
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const node = document.createTextNode(value)
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    return true
  }, text)
  expect(inserted).toBe(true)
}

async function selectLinkByHref(page: Page, href: string) {
  const selected = await page.evaluate((targetHref) => {
    const link = document.querySelector(
      `.ProseMirror a[href="${targetHref}"]`,
    ) as HTMLAnchorElement | null
    if (!link || !link.firstChild) return false
    const selection = window.getSelection()
    if (!selection) return false
    const range = document.createRange()
    range.selectNodeContents(link)
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    return true
  }, href)
  expect(selected).toBe(true)
}

describe('regression e2e (H2)', () => {
  beforeAll(async () => {
    appPort = await findAvailablePort()
    appUrl = `http://${APP_HOST}:${appPort}`

    devServer = spawn('pnpm', ['exec', 'vite', '--host', APP_HOST, '--port', String(appPort)], {
      cwd: APP_CWD,
      stdio: 'pipe',
      env: { ...process.env },
    })

    devServer.stdout.on('data', (chunk) => {
      devServerLogs.push(chunk.toString())
      if (devServerLogs.length > 120) devServerLogs.shift()
    })

    devServer.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      devServerLogs.push(text)
      if (devServerLogs.length > 120) devServerLogs.shift()
      if (text.includes('EADDRINUSE')) {
        throw new Error(`Port ${appPort} already in use`)
      }
    })

    await waitForServerReady()
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
    if (devServer && !devServer.killed) {
      devServer.kill('SIGTERM')
    }
  })

  test('H2.1 评论：创建 + 选区引用预填 + 行内点击联动', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-comment')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const selectionToolbar = page.locator('.be-selection-tooltip')
    await waitForVisible(selectionToolbar)

    const addCommentBtn = page
      .locator('.be-selection-tooltip button[data-command="addComment"]')
      .first()
    await addCommentBtn.click()

    const quotePreview = page.locator('.comment-selection-quote')
    await waitForVisible(quotePreview)
    await expect(await quotePreview.textContent()).toContain('|')

    const draftInput = page.locator('.comment-draft-input textarea')
    await waitForVisible(draftInput)
    await draftInput.fill('e2e: 评论联动验证')
    const createBtn = page.locator('.comment-create-btn').first()
    await waitForVisible(createBtn)
    await createBtn.click()

    const createdThread = page.locator('.comment-item', { hasText: 'e2e: 评论联动验证' }).first()
    await waitForVisible(createdThread)

    const mark = page.locator('.ProseMirror [data-comment-id]').first()
    await waitForVisible(mark)
    const markId = await mark.getAttribute('data-comment-id')
    expect(markId).toBeTruthy()
    await mark.click()

    await expect(await page.locator(`.comment-item[data-comment-id="${markId}"]`).isVisible()).toBe(
      true,
    )
    await page.close()
  })

  test('H2.2 链接：插入 + 悬浮预览 + 锚点跳转', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-link')

    await selectTextInParagraph(page, '在这里继续测试行内评论点击是否可定位到评论线程')
    const selectionToolbar = page.locator('.be-selection-tooltip')
    await waitForVisible(selectionToolbar)
    await page.locator('.be-selection-tooltip button[data-command="setLink"]').first().click()

    const dialog = page.locator('.be-dialog')
    await waitForVisible(dialog)
    await expect(await dialog.textContent()).toMatch(/插入链接|Insert Link/i)

    const urlInput = dialog.locator('input.be-input-control').first()
    await urlInput.fill('#be-regression-anchor')
    await dialog.locator('.be-dialog-btn--primary').first().click()

    const insertedLink = page.locator('.ProseMirror a[href="#be-regression-anchor"]').first()
    await waitForVisible(insertedLink)

    const anchorLink = page.getByRole('link', { name: '跳转到锚点块' }).first()
    await anchorLink.hover()
    await waitForVisible(page.locator('.be-link-preview-tooltip'))

    await anchorLink.click()
    await expect(page.url()).toMatch(/#be-regression-anchor$/)
    await page.close()
  })

  test('H2.3 表格工具栏：显示 + 文案 + 行操作', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-table')

    const table = page.locator('.ProseMirror table').first()
    await waitForVisible(table)
    const rowCountBefore = await page.locator('.ProseMirror table tr').count()

    await page.locator('.ProseMirror table td', { hasText: '张三' }).first().click()
    const tableMenu = page.locator('.table-bubble-menu')
    await waitForVisible(tableMenu)
    await expect((await tableMenu.getAttribute('aria-label')) || '').toMatch(
      /表格工具栏|table toolbar/i,
    )

    const rowOpsTrigger = tableMenu
      .locator('[data-tooltip="行操作"], [data-tooltip="Row Operations"]')
      .first()
    await waitForVisible(rowOpsTrigger)
    await rowOpsTrigger.click()
    await page
      .locator('.toolbar-dropdown-menu .dropdown-item', {
        hasText: /上方插入行|Insert Row Above/i,
      })
      .first()
      .click()

    const rowCountAfter = await page.locator('.ProseMirror table tr').count()
    expect(rowCountAfter).toBeGreaterThan(rowCountBefore)
    await page.close()
  })

  test('H2.4 block handle：可见 + 菜单可打开 + 暗黑样式', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-handle')

    const paragraph = page.locator('.ProseMirror p').first()
    const box = await paragraph.boundingBox()
    if (!box) throw new Error('Cannot get paragraph box for block handle test')
    await page.mouse.move(box.x + 14, box.y + box.height / 2)

    const handle = page.locator('.be-block-handle')
    await waitForVisible(handle)
    await handle.click()

    const menu = page.locator('.be-block-handle-menu')
    await waitForVisible(menu)
    await expect(await menu.textContent()).toMatch(/上移一块|Move Up/i)
    await expect(await menu.textContent()).toMatch(/删除块|Delete Block/i)

    const bgColor = await menu.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
    await page.close()
  })

  test('H2.5 selection tooltip：选区显示 + 加粗命令可用', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-selection-tooltip')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const tooltip = page.locator('.be-selection-tooltip')
    await waitForVisible(tooltip)

    const boldBtn = tooltip.locator('button[data-command="toggleBold"]').first()
    await waitForVisible(boldBtn)
    await boldBtn.click()
    await expect
      .poll(async () => (await boldBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/)
    await page.close()
  })

  test('B5 主题主色联动冒烟：修改 --primary-color 后激活态样式联动', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'b5-token-smoke')

    const createBtn = page.locator('.comment-create-btn').first()
    await waitForVisible(createBtn)

    const beforeStyle = await createBtn.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement)
      return {
        primaryVar: style.getPropertyValue('--primary-color').trim(),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      }
    })

    await page.evaluate(() => {
      document.documentElement.style.setProperty('--primary-color', '#ff4d4f')
      document.documentElement.style.setProperty('--primary-hover', '#ff7875')
      const root = document.querySelector('[data-be-ui-root="true"]') as HTMLElement | null
      root?.style.setProperty('--primary-color', '#ff4d4f')
      root?.style.setProperty('--primary-hover', '#ff7875')
    })
    await page.waitForTimeout(260)

    const afterStyle = await createBtn.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement)
      return {
        primaryVar: style.getPropertyValue('--primary-color').trim(),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      }
    })
    const changed =
      afterStyle.primaryVar !== beforeStyle.primaryVar ||
      afterStyle.backgroundColor !== beforeStyle.backgroundColor ||
      afterStyle.borderColor !== beforeStyle.borderColor ||
      afterStyle.color !== beforeStyle.color
    expect(changed).toBe(true)
    await page.close()
  })

  test('H2.6 撤销重做：输入后可回退并恢复', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-undo-redo')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    await focusParagraphAndMoveToEnd(page, targetText)
    await page.keyboard.type(' e2e-undo-redo')
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain('e2e-undo-redo')

    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .not.toContain('e2e-undo-redo')

    await pressRedoShortcut(page)
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain('e2e-undo-redo')

    await page.close()
  })

  test('H2.7 快捷键一致性：Cmd/Ctrl+B 与工具栏加粗行为一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-shortcut-bold')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const tooltip = page.locator('.be-selection-tooltip')
    await waitForVisible(tooltip)
    const boldBtn = tooltip.locator('button[data-command="toggleBold"]').first()
    await waitForVisible(boldBtn)

    await boldBtn.click()
    await expect
      .poll(async () => (await boldBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/)

    await page.keyboard.press('ControlOrMeta+b')
    await expect
      .poll(async () => (await boldBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .not.toMatch(/\bactive\b/)

    await page.close()
  })

  test('H2.8 Shift+Enter：段落内插入软换行', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-soft-break')

    const targetText = '请将鼠标移到左侧块手柄'
    const paragraphCountBefore = await page.locator('.ProseMirror p').count()

    await focusParagraphAndMoveToEnd(page, targetText)
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('软换行断言')
    await page.waitForTimeout(120)

    const editorHtml = (await page.locator('.ProseMirror').innerHTML()) || ''
    expect(editorHtml).toContain('软换行断言')
    expect(editorHtml).toMatch(/<br\s*\/?>/i)
    const paragraphCountAfter = await page.locator('.ProseMirror p').count()
    expect(paragraphCountAfter).toBe(paragraphCountBefore)

    await page.close()
  })

  test('H2.9 删除块后编辑不中断：无空焦点状态', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-delete-block-focus')

    const paragraphCountBefore = await page.locator('.ProseMirror p').count()
    const menu = await openBlockHandleMenuForParagraph(page, '请将鼠标移到左侧块手柄')
    await clickBlockHandleMenuItem(menu, /删除块|Delete Block/i)

    await expect
      .poll(async () => await page.locator('.ProseMirror p').count(), {
        timeout: 3000,
      })
      .toBe(paragraphCountBefore - 1)

    await page.keyboard.type('delete-after-focus-check')
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain('delete-after-focus-check')

    await page.close()
  })

  test('H2.10 格式化撤销重做：斜体命令可撤销并恢复', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-format-undo-redo')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    await selectTextInParagraph(page, targetText)
    const tooltip = page.locator('.be-selection-tooltip')
    await waitForVisible(tooltip)
    const italicBtn = tooltip.locator('button[data-command="toggleItalic"]').first()
    await waitForVisible(italicBtn)
    await italicBtn.click()
    await expect
      .poll(async () => (await italicBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/)

    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(async () => (await italicBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .not.toMatch(/\bactive\b/)

    await pressRedoShortcut(page)
    await expect
      .poll(async () => (await italicBtn.getAttribute('class')) || '', {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/)

    await page.close()
  })

  test('H2.11 块移动顺序：上移/下移可逆且顺序正确', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-block-move-order')

    const targetText = '请将鼠标移到左侧块手柄'
    const before = await getTopLevelBlockTexts(page)
    const beforeIndex = before.findIndex((text) => text.includes(targetText))
    expect(beforeIndex).toBeGreaterThan(0)
    const previousBlockText = before[beforeIndex - 1] || ''

    const upMenu = await openBlockHandleMenuForParagraph(page, targetText)
    await clickBlockHandleMenuItem(upMenu, /上移一块|Move Up/i)

    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(targetText))
      })
      .toBe(beforeIndex - 1)
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current[beforeIndex] || ''
      })
      .toContain(previousBlockText)

    const downMenu = await openBlockHandleMenuForParagraph(page, targetText)
    await clickBlockHandleMenuItem(downMenu, /下移一块|Move Down/i)

    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(targetText))
      })
      .toBe(beforeIndex)

    await page.close()
  })

  test('H2.12 连续中文输入：长串文本不丢字（输入稳定性冒烟）', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-input-stability-smoke')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const phrase = '中文连续输入验证abc123XYZ输入不中断'
    await focusParagraphAndMoveToEnd(page, targetText)
    await page.keyboard.type(` ${phrase}`)

    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(phrase)

    const occurrenceCount = await page.evaluate((needle) => {
      const text = document.querySelector('.ProseMirror')?.textContent || ''
      return text.split(needle).length - 1
    }, phrase)
    expect(occurrenceCount).toBe(1)

    await page.close()
  })

  test('H2.13 输入不中断压测：触发 UI 重算后仍可连续输入', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-input-rerender-stress')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const partA = '输入压测A'
    const partB = '输入压测B'
    const combined = `${partA}${partB}`

    await focusParagraphAndMoveToEnd(page, targetText)
    await page.keyboard.type(partA)

    await page.evaluate(() => {
      for (let i = 0; i < 6; i += 1) {
        window.dispatchEvent(new Event('resize'))
        document.dispatchEvent(new Event('selectionchange'))
      }
      const root = document.querySelector('[data-be-ui-root="true"]') as HTMLElement | null
      root?.style.setProperty('--primary-color', '#4f7cff')
      root?.style.setProperty('--primary-hover', '#6f8fff')
      root?.style.setProperty('--primary-color', '#527dff')
      root?.style.setProperty('--primary-hover', '#7394ff')
    })

    await page.keyboard.type(partB)

    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(combined)

    const occurrenceCount = await page.evaluate((needle) => {
      const text = document.querySelector('.ProseMirror')?.textContent || ''
      return text.split(needle).length - 1
    }, combined)
    expect(occurrenceCount).toBe(1)

    await page.close()
  })

  test('H2.14 IME 组合输入模拟：composition 事件链路不丢字', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-ime-composition-sim')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const phrase = '组合输入法验证'
    await focusParagraphAndMoveToEnd(page, targetText)

    const inserted = await page.evaluate((text) => {
      const editor = document.querySelector('.ProseMirror') as HTMLElement | null
      if (!editor) return false
      editor.focus()
      editor.dispatchEvent(new CompositionEvent('compositionstart', { data: text[0] || '' }))
      editor.dispatchEvent(new CompositionEvent('compositionupdate', { data: text }))
      const insertedByCommand =
        typeof document.execCommand === 'function' &&
        document.execCommand('insertText', false, text)
      if (!insertedByCommand) {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return false
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const node = document.createTextNode(text)
        range.insertNode(node)
        range.setStartAfter(node)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      editor.dispatchEvent(new CompositionEvent('compositionend', { data: text }))
      return true
    }, phrase)
    expect(inserted).toBe(true)

    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(phrase)

    await page.close()
  })

  test('H2.15 快捷键一致性扩展：Cmd/Ctrl+I 与斜体按钮行为一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-shortcut-italic')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const tooltip = page.locator('.be-selection-tooltip')
    await waitForVisible(tooltip)

    const italicBtn = tooltip.locator('button[data-command="toggleItalic"]').first()
    await waitForVisible(italicBtn)
    await italicBtn.click()
    await expectButtonActive(italicBtn, true)

    await page.keyboard.press('ControlOrMeta+i')
    await expectButtonActive(italicBtn, false)

    await page.close()
  })

  test('H2.16 选区一致性：Shift 扩选与鼠标拖选结果一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-selection-parity')

    const targetText = '请选中这一段文本后点击工具栏'
    const shiftSelection = normalizeSelectionText(await selectByShiftArrow(page, targetText, 20))
    expect(shiftSelection.length).toBeGreaterThan(0)

    await page.mouse.click(24, 24)
    const dragSelection = normalizeSelectionText(await selectByMouseDrag(page, targetText))
    expect(dragSelection.length).toBeGreaterThan(0)

    const prefixLen = getCommonPrefixLength(shiftSelection, dragSelection)
    expect(prefixLen).toBeGreaterThanOrEqual(6)
    await page.close()
  })

  test('H2.17 工具栏一致性：顶部与选区工具栏加粗命令结果一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-toolbar-parity')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const selectionTooltip = page.locator('.be-selection-tooltip')
    await waitForVisible(selectionTooltip)

    const topBoldBtn = page.locator('.toolbar button[data-command="toggleBold"]').first()
    await waitForVisible(topBoldBtn)
    const selectionBoldBtn = selectionTooltip.locator('button[data-command="toggleBold"]').first()
    await waitForVisible(selectionBoldBtn)

    await topBoldBtn.click()
    await expectButtonActive(selectionBoldBtn, true)

    await selectionBoldBtn.click()
    await expectButtonActive(selectionBoldBtn, false)

    await page.close()
  })

  test('H2.18 粘贴落点：粘贴后仍留在当前段落连续编辑', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-paste-caret')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const paragraphCountBefore = await page.locator('.ProseMirror p').count()
    const targetBlockIndexBefore = await getTopBlockIndexByText(page, targetText)
    expect(targetBlockIndexBefore).toBeGreaterThanOrEqual(0)

    const pasted = '粘贴落点验证'
    const tail = 'TAIL'

    await focusParagraphEndForPaste(page, targetText, targetBlockIndexBefore)
    const pasteResult = await pastePlainTextAtCursor(page, pasted)
    expect(pasteResult.method).toBe('clipboard')
    expect(pasteResult.inserted).toBe(true)

    const pastedBlockIndex = await getTopBlockIndexByText(page, pasted)
    expect(pastedBlockIndex).toBe(targetBlockIndexBefore)

    const selectionBlockIndex = await getSelectionTopBlockIndex(page)
    expect(selectionBlockIndex).toBe(targetBlockIndexBefore)

    await insertTextAtCurrentSelection(page, tail)
    const combinedBlockIndex = await getTopBlockIndexByText(page, `${pasted}${tail}`)
    expect(combinedBlockIndex).toBe(targetBlockIndexBefore)

    const paragraphCountAfter = await page.locator('.ProseMirror p').count()
    expect(paragraphCountAfter).toBe(paragraphCountBefore)

    await page.close()
  })

  test('H2.19 代码块编辑不中断：复制 + 粘贴后光标仍在代码块内', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-codeblock-paste-focus')

    const codeBlock = page.locator('.code-block-wrapper').first()
    await waitForVisible(codeBlock)

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: appUrl,
    })

    const copyBtn = codeBlock
      .locator('.code-block-action-btn')
      .filter({ hasText: /复制|Copy/i })
      .first()
    await waitForVisible(copyBtn)
    await copyBtn.click()

    const copiedText = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return ''
      }
    })
    expect(copiedText).toContain('buildRegressionResult')

    const pasted = 'const regressionCodePaste = true;'
    await focusCodeBlockEndByText(page, 'buildRegressionResult')
    const pasteResult = await pastePlainTextAtCursor(page, pasted)
    expect(pasteResult.method).toBe('clipboard')
    expect(pasteResult.inserted).toBe(true)

    const probe = await getCodeBlockProbe(page, pasted)
    expect(probe.codeContains).toBe(true)
    expect(probe.afterContains).toBe(false)
    expect(probe.selectionInsideCode).toBe(true)

    await insertTextAtCurrentSelection(page, ' //tail')
    const probeAfterTail = await getCodeBlockProbe(page, `${pasted} //tail`)
    expect(probeAfterTail.codeContains).toBe(true)
    expect(probeAfterTail.selectionInsideCode).toBe(true)

    await page.close()
  })

  test('H2.20 评论链路一致性：顶部工具栏与选区工具栏均可预填且不自动保存', async () => {
    if (!browser) throw new Error('browser not initialized')
    const targetParagraph = '请选中这一段文本后点击工具栏'

    const pageBySelection = await browser.newPage()
    await openRegressionPage(pageBySelection, 'h2-comment-path-selection')
    const beforeBySelection = await pageBySelection.locator('.comment-item').count()
    await selectTextInParagraph(pageBySelection, targetParagraph)
    const selectionToolbar = pageBySelection.locator('.be-selection-tooltip')
    await waitForVisible(selectionToolbar)
    await selectionToolbar.locator('button[data-command="addComment"]').first().click()
    const quotePreviewBySelection = pageBySelection.locator('.comment-selection-quote')
    await waitForVisible(quotePreviewBySelection)
    const quoteTextBySelection = (await quotePreviewBySelection.textContent()) || ''
    expect(quoteTextBySelection).toContain('|')
    expect(quoteTextBySelection).toMatch(/选中这一段文本后点击工具栏/)
    const afterBySelection = await pageBySelection.locator('.comment-item').count()
    expect(afterBySelection).toBe(beforeBySelection)
    await pageBySelection.close()

    const pageByTop = await browser.newPage()
    await openRegressionPage(pageByTop, 'h2-comment-path-top')
    const beforeByTop = await pageByTop.locator('.comment-item').count()
    await selectTextInParagraph(pageByTop, targetParagraph)
    const route = await triggerTopToolbarCommand(pageByTop, 'addComment')
    expect(['direct', 'more']).toContain(route)
    const quotePreviewByTop = pageByTop.locator('.comment-selection-quote')
    await waitForVisible(quotePreviewByTop)
    const quoteTextByTop = (await quotePreviewByTop.textContent()) || ''
    expect(quoteTextByTop).toContain('|')
    expect(quoteTextByTop).toMatch(/选中这一段文本后点击工具栏/)
    const afterByTop = await pageByTop.locator('.comment-item').count()
    expect(afterByTop).toBe(beforeByTop)
    await pageByTop.close()
  })

  test('H2.21 表格工具栏与快捷键：Ctrl/Cmd+B 在单元格内与按钮行为一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-table-shortcut-parity')

    await selectTextInTableCell(page, '张三')
    const tableMenu = page.locator('.table-bubble-menu')
    await waitForVisible(tableMenu)

    const boldBtn = tableMenu.locator('button[data-command="toggleBold"]').first()
    await waitForVisible(boldBtn)

    await boldBtn.click()
    await expectButtonActive(boldBtn, true)

    await page.keyboard.press('ControlOrMeta+b')
    await expectButtonActive(boldBtn, false)

    await page.keyboard.press('ControlOrMeta+b')
    await expectButtonActive(boldBtn, true)

    await page.close()
  })

  test('H2.22 撤销重做跨块：块移动 + 文本输入可按顺序撤销恢复', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h2-undo-redo-cross-block')

    const moveTarget = '请将鼠标移到左侧块手柄'
    const textTarget = '在这里继续测试行内评论点击是否可定位到评论线程'
    const typed = ' cross-block-undo-redo'

    const before = await getTopLevelBlockTexts(page)
    const beforeIndex = before.findIndex((text) => text.includes(moveTarget))
    expect(beforeIndex).toBeGreaterThan(0)

    const upMenu = await openBlockHandleMenuForParagraph(page, moveTarget)
    await clickBlockHandleMenuItem(upMenu, /上移一块|Move Up/i)
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(moveTarget))
      })
      .toBe(beforeIndex - 1)

    await focusParagraphAndMoveToEnd(page, textTarget)
    await page.keyboard.type(typed)
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(typed.trim())

    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .not.toContain(typed.trim())
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(moveTarget))
      })
      .toBe(beforeIndex - 1)

    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(moveTarget))
      })
      .toBe(beforeIndex)

    await pressRedoShortcut(page)
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page)
        return current.findIndex((text) => text.includes(moveTarget))
      })
      .toBe(beforeIndex - 1)

    await pressRedoShortcut(page)
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(typed.trim())

    await page.close()
  })

  test('H3.1 评论线程：回复流程 + 解决/重开状态切换一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-comment-reply-resolve')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const selectionToolbar = page.locator('.be-selection-tooltip')
    await waitForVisible(selectionToolbar)
    await selectionToolbar.locator('button[data-command="addComment"]').first().click()

    const draftInput = page.locator('.comment-draft-input textarea')
    await waitForVisible(draftInput)
    await draftInput.fill('h3: comment thread workflow')
    const createBtn = page.locator('.comment-create-btn').first()
    await createBtn.click()

    const thread = page.locator('.comment-item', { hasText: 'h3: comment thread workflow' }).first()
    await waitForVisible(thread)

    const replyInput = thread.locator('.comment-reply-input input').first()
    await waitForVisible(replyInput)
    await replyInput.fill('h3: reply content')
    await thread.locator('.comment-reply-send-btn').first().click()
    await expect
      .poll(async () => (await thread.textContent()) || '', { timeout: 3000 })
      .toContain('h3: reply content')

    await thread.locator('.comment-action-btn--success').first().click()
    await expect
      .poll(
        async () =>
          await page.locator('.comment-item', { hasText: 'h3: comment thread workflow' }).count(),
        { timeout: 3000 },
      )
      .toBe(0)

    const resolvedFilter = page
      .locator('.comment-filter-btn', { hasText: /已解决|Resolved/i })
      .first()
    await resolvedFilter.click()
    const resolvedThread = page
      .locator('.comment-item', { hasText: 'h3: comment thread workflow' })
      .first()
    await waitForVisible(resolvedThread)
    await resolvedThread.locator('.comment-action-btn--primary').first().click()

    const openFilter = page.locator('.comment-filter-btn', { hasText: /未解决|Open/i }).first()
    await openFilter.click()
    const reopenedThread = page
      .locator('.comment-item', { hasText: 'h3: comment thread workflow' })
      .first()
    await waitForVisible(reopenedThread)
    await expect
      .poll(async () => await reopenedThread.locator('.comment-action-btn--success').count(), {
        timeout: 3000,
      })
      .toBe(1)
    await expect(await reopenedThread.locator('.comment-reply-send-btn').count()).toBe(1)

    await page.close()
  })

  test('H3.2 工具栏下拉：键盘导航与 Esc 关闭一致', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-toolbar-dropdown-keyboard')

    const trigger = page
      .locator('.toolbar .toolbar-dropdown-wrapper .toolbar-dropdown-trigger')
      .first()
    await waitForVisible(trigger)
    await trigger.focus()
    await page.keyboard.press('Enter')

    const menu = page.locator('.toolbar-dropdown-menu').first()
    await waitForVisible(menu)
    await expect(await trigger.getAttribute('aria-expanded')).toBe('true')

    await page.keyboard.press('ArrowDown')
    await expect
      .poll(async () => await menu.locator('.dropdown-item.keyboard-focus').count(), {
        timeout: 3000,
      })
      .toBeGreaterThan(0)

    await page.keyboard.press('Escape')
    await expect.poll(async () => await menu.isVisible(), { timeout: 3000 }).toBe(false)
    await expect(await trigger.getAttribute('aria-expanded')).toBe('false')

    await page.close()
  })

  test('H3.3 暗黑模式弹层：tooltip/dropdown 对比度可读', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-dark-tooltip-dropdown')

    await selectTextInParagraph(page, '请选中这一段文本后点击工具栏')
    const tooltipBar = page.locator('.be-selection-tooltip')
    await waitForVisible(tooltipBar)

    const underlineBtn = tooltipBar.locator('button[data-command="toggleUnderline"]').first()
    await waitForVisible(underlineBtn)
    await underlineBtn.hover()
    const globalTooltip = page.locator('.global-tooltip.visible').first()
    await waitForVisible(globalTooltip)
    const tooltipStyles = await globalTooltip.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement)
      return {
        bg: style.backgroundColor,
        color: style.color,
        border: style.borderColor,
      }
    })
    expect(tooltipStyles.bg).not.toBe('rgb(255, 255, 255)')
    expect(tooltipStyles.bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(tooltipStyles.color).not.toBe(tooltipStyles.bg)
    expect(tooltipStyles.border).not.toBe('rgba(0, 0, 0, 0)')

    const dropdownTrigger = page
      .locator('.toolbar .toolbar-dropdown-wrapper .toolbar-dropdown-trigger')
      .first()
    await dropdownTrigger.click()
    const dropdownMenu = page.locator('.toolbar-dropdown-menu').first()
    await waitForVisible(dropdownMenu)
    const dropdownStyles = await dropdownMenu.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement)
      const firstItem = (el as HTMLElement).querySelector('.dropdown-item') as HTMLElement | null
      const itemStyle = firstItem ? getComputedStyle(firstItem) : null
      return {
        bg: style.backgroundColor,
        border: style.borderColor,
        itemColor: itemStyle?.color || '',
      }
    })
    expect(dropdownStyles.bg).not.toBe('rgb(255, 255, 255)')
    expect(dropdownStyles.bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(dropdownStyles.itemColor).not.toBe(dropdownStyles.bg)
    expect(dropdownStyles.border).not.toBe('rgba(0, 0, 0, 0)')

    await page.close()
  })

  test('H3.4 粘贴撤销：粘贴后 Undo 可恢复到粘贴前', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-paste-undo')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const targetBlockIndexBefore = await getTopBlockIndexByText(page, targetText)
    expect(targetBlockIndexBefore).toBeGreaterThanOrEqual(0)

    const pasted = 'paste-undo-check'
    await focusParagraphEndForPaste(page, targetText, targetBlockIndexBefore)
    const pasteResult = await pastePlainTextAtCursor(page, pasted)
    expect(pasteResult.method).toBe('clipboard')
    expect(pasteResult.inserted).toBe(true)
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .toContain(pasted)

    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(async () => (await page.locator('.ProseMirror').textContent()) || '', { timeout: 3000 })
      .not.toContain(pasted)

    await page.close()
  })

  test('H3.5 链接编辑：更新地址/文本并支持撤销重做', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-link-edit-undo-redo')

    await selectTextInParagraph(page, '在这里继续测试行内评论点击是否可定位到评论线程')
    const firstRoute = await triggerTopToolbarCommand(page, 'addLink')
    expect(['direct', 'more']).toContain(firstRoute)
    let dialog = page.locator('.be-dialog').first()
    await waitForVisible(dialog)
    await dialog.locator('input.be-input-control').first().fill('#be-regression-anchor')
    await dialog.locator('input.be-input-control').nth(1).fill('初始链接')
    await dialog.locator('.be-dialog-btn--primary').first().click()
    const initialLink = page
      .locator('.ProseMirror a[href="#be-regression-anchor"]', { hasText: '初始链接' })
      .first()
    await waitForVisible(initialLink)

    await selectLinkByHref(page, '#be-regression-anchor')
    const secondRoute = await triggerTopToolbarCommand(page, 'addLink')
    expect(['direct', 'more']).toContain(secondRoute)
    dialog = page.locator('.be-dialog').first()
    await waitForVisible(dialog)
    await dialog.locator('input.be-input-control').first().fill('#be-code-after-paragraph')
    await dialog.locator('input.be-input-control').nth(1).fill('更新链接')
    await dialog.locator('.be-dialog-btn--primary').first().click()

    const updatedLink = page
      .locator('.ProseMirror a[href="#be-code-after-paragraph"]', {
        hasText: '更新链接',
      })
      .first()
    await waitForVisible(updatedLink)

    await page.locator('.ProseMirror').first().click()
    await page.keyboard.press('ControlOrMeta+z')
    await expect
      .poll(
        async () =>
          await page
            .locator('.ProseMirror a[href="#be-code-after-paragraph"]', {
              hasText: '更新链接',
            })
            .count(),
        { timeout: 3000 },
      )
      .toBe(0)

    await pressRedoShortcut(page)
    await expect
      .poll(
        async () =>
          await page
            .locator('.ProseMirror a[href="#be-code-after-paragraph"]', {
              hasText: '更新链接',
            })
            .count(),
        { timeout: 3000 },
      )
      .toBeGreaterThan(0)

    await page.close()
  })

  test('H3.6 块复制：duplicate block 生成结构一致副本', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-duplicate-block')

    const targetText = '请将鼠标移到左侧块手柄'
    const countBefore = await page.locator('.ProseMirror p', { hasText: targetText }).count()
    const menu = await openBlockHandleMenuForParagraph(page, targetText)
    await clickBlockHandleMenuItem(menu, /复制块|Duplicate Block/i)
    await expect
      .poll(async () => await page.locator('.ProseMirror p', { hasText: targetText }).count(), {
        timeout: 3000,
      })
      .toBe(countBefore + 1)

    await page.close()
  })

  test('H3.7 粘贴图片链接：空选区自动转图片节点', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-image-url-paste')

    const targetText = '在这里继续测试行内评论点击是否可定位到评论线程'
    const targetBlockIndexBefore = await getTopBlockIndexByText(page, targetText)
    expect(targetBlockIndexBefore).toBeGreaterThanOrEqual(0)

    const imageUrl = 'https://example.com/h3-smart-paste-image.png'
    await focusParagraphEndForPaste(page, targetText, targetBlockIndexBefore)
    const pasteResult = await pastePlainTextAtCursor(page, imageUrl)
    expect(pasteResult.method).toBe('clipboard')

    await expect
      .poll(async () => await page.locator(`.ProseMirror img[src="${imageUrl}"]`).count(), {
        timeout: 3000,
      })
      .toBeGreaterThan(0)

    await expect(await page.locator(`.ProseMirror a[href="${imageUrl}"]`).count()).toBe(0)

    await page.close()
  })

  test('H3.8 块拖拽排序：手柄拖拽可重排且目标有高亮反馈', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-block-drag-reorder')

    const sourceText = '请将鼠标移到左侧块手柄'
    const targetText = '请选中这一段文本后点击工具栏'
    const sourceBefore = await getTopBlockIndexByText(page, sourceText)
    const targetBefore = await getTopBlockIndexByText(page, targetText)
    expect(sourceBefore).toBeGreaterThan(targetBefore)

    const sourceParagraph = page.locator('.ProseMirror p', { hasText: sourceText }).first()
    await sourceParagraph.scrollIntoViewIfNeeded()
    const sourceBox = await sourceParagraph.boundingBox()
    if (!sourceBox) throw new Error('Cannot resolve source paragraph box')
    await page.mouse.move(sourceBox.x + 14, sourceBox.y + sourceBox.height / 2)

    const handle = page.locator('.be-block-handle')
    await waitForVisible(handle)
    await expect(await handle.getAttribute('draggable')).toBe('true')

    const dragFeedbackVisible = await page.evaluate((text) => {
      const paragraphs = Array.from(document.querySelectorAll('.ProseMirror p')) as HTMLElement[]
      const target = paragraphs.find((p) => p.textContent?.includes(text))
      const handleEl = document.querySelector('.be-block-handle') as HTMLElement | null
      if (!target || !handleEl) return false
      const dataTransfer = new DataTransfer()
      handleEl.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      )
      const rect = target.getBoundingClientRect()
      target.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: rect.left + 20,
          clientY: rect.top + 6,
        }),
      )
      const hasFeedback = target.classList.contains('be-block-drop-target')
      target.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: rect.left + 20,
          clientY: rect.top + 6,
        }),
      )
      handleEl.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      )
      return hasFeedback
    }, targetText)
    expect(dragFeedbackVisible).toBe(true)

    await expect
      .poll(async () => await getTopBlockIndexByText(page, sourceText), {
        timeout: 3000,
      })
      .toBeLessThan(sourceBefore)

    await page.close()
  })

  test('H3.9 图片节点：对齐切换与说明编辑保持稳定', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-image-align-caption')

    const figure = page.locator('.ProseMirror .be-image-figure').first()
    await waitForVisible(figure)
    const image = figure.locator('img').first()
    await waitForVisible(image)

    await image.click()
    const alignBar = figure.locator('div button[data-align]').first()
    await waitForVisible(alignBar)
    const textSelectionToolbarVisible = await page.evaluate(() => {
      const toolbar = document.querySelector(
        '.tippy-box[data-theme~="be-selection-toolbar"]',
      ) as HTMLElement | null
      if (!toolbar) return false
      return getComputedStyle(toolbar).visibility !== 'hidden'
    })
    expect(textSelectionToolbarVisible).toBe(false)
    const rightAligned = await page.evaluate(() => {
      const figure = document.querySelector('.ProseMirror .be-image-figure') as HTMLElement | null
      const btn = figure?.querySelector('button[data-align="right"]') as HTMLButtonElement | null
      if (!figure || !btn) return false
      btn.click()
      return figure.getAttribute('data-align') === 'right'
    })
    expect(rightAligned).toBe(true)

    const captionEnabled = await page.evaluate(() =>
      Boolean(document.querySelector('.ProseMirror .be-image-caption')),
    )
    if (captionEnabled) {
      const captionUpdated = await page.evaluate(() => {
        const caption = document.querySelector(
          '.ProseMirror .be-image-figure .be-image-caption',
        ) as HTMLElement | null
        if (!caption) return false
        caption.focus()
        caption.textContent = 'h3 image caption stable'
        caption.dispatchEvent(new Event('input', { bubbles: true }))
        return caption.textContent === 'h3 image caption stable'
      })
      expect(captionUpdated).toBe(true)

      await expect
        .poll(
          async () =>
            await page.evaluate(() => {
              const caption = document.querySelector(
                '.ProseMirror .be-image-figure .be-image-caption',
              ) as HTMLElement | null
              return caption?.textContent || ''
            }),
          { timeout: 3000 },
        )
        .toContain('h3 image caption stable')
    }
    await page.locator('.scene-header h2').first().click()

    await image.click()
    const leftAligned = await page.evaluate(() => {
      const figure = document.querySelector('.ProseMirror .be-image-figure') as HTMLElement | null
      const btn = figure?.querySelector('button[data-align="left"]') as HTMLButtonElement | null
      if (!figure || !btn) return false
      btn.click()
      return figure.getAttribute('data-align') === 'left'
    })
    expect(leftAligned).toBe(true)
    if (captionEnabled) {
      const finalCaption = await page.evaluate(() => {
        const caption = document.querySelector(
          '.ProseMirror .be-image-figure .be-image-caption',
        ) as HTMLElement | null
        return caption?.textContent || ''
      })
      expect(finalCaption).toContain('h3 image caption stable')
    }

    const previewButton = figure
      .locator('button[aria-label="预览图片"], button[data-tooltip="预览图片"]')
      .first()
    await waitForVisible(previewButton)
    await previewButton.click()
    const previewOverlay = page.locator('.be-image-viewer-overlay')
    await waitForVisible(previewOverlay)
    await expect(await previewOverlay.locator('img').first().isVisible()).toBe(true)
    await page.keyboard.press('Escape')
    await expect
      .poll(async () => await page.locator('.be-image-viewer-overlay').count(), {
        timeout: 3000,
      })
      .toBe(0)

    await page.close()
  })

  test('H3.10 代码块语言切换：单击菜单项即可生效', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-code-language-single-click')

    const codeBlock = page.locator('.code-block-wrapper').first()
    await waitForVisible(codeBlock)
    const trigger = codeBlock.locator('.code-block-lang-select').first()
    await trigger.click()
    const menu = codeBlock.locator('.lang-dropdown-menu.show').first()
    await waitForVisible(menu)

    const targetLanguage = await page.evaluate(() => {
      const menu = document.querySelector(
        '.code-block-wrapper .lang-dropdown-menu.show',
      ) as HTMLElement | null
      if (!menu) return ''
      const item = Array.from(menu.querySelectorAll<HTMLElement>('.lang-item')).find(
        (node) =>
          !node.classList.contains('active') &&
          ['typescript', 'javascript', 'python', 'json'].includes((node.textContent || '').trim()),
      )
      if (!item) return ''
      const value = (item.textContent || '').trim()
      item.click()
      return value
    })
    expect(targetLanguage.length).toBeGreaterThan(0)

    await expect
      .poll(
        async () =>
          (
            (await codeBlock.locator('.code-block-lang-select .lang-name').first().textContent()) ||
            ''
          ).trim(),
        { timeout: 5000 },
      )
      .toBe(targetLanguage)

    await page.close()
  })

  test('H3.11 表格 handle：可稳定点击并触发整表高亮', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-table-handle-highlight')

    const table = page.locator('.ProseMirror table').first()
    await waitForVisible(table)
    await table.locator('td').first().hover()
    const handle = page.locator('.be-table-handle').first()
    await waitForVisible(handle)

    await handle.click()
    await expect
      .poll(async () => ((await table.getAttribute('class')) || '').includes('be-table-selected'), {
        timeout: 3000,
      })
      .toBe(true)

    await page.close()
  })

  test('H3.12 图片块拖拽：重排后不新增空段落', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openDragShowcasePage(page, 'h3-image-drag-no-empty-paragraph')

    const sourceImage = page.locator('.ProseMirror img[alt="drag-image-source"]').first()
    await waitForVisible(sourceImage)
    const sourceBefore = await getTopBlockIndexBySelector(
      page,
      '.ProseMirror img[alt="drag-image-source"]',
    )
    const targetBefore = await getTopBlockIndexBySelector(page, '.ProseMirror #drag-target-anchor')
    expect(sourceBefore).toBeGreaterThanOrEqual(0)
    expect(targetBefore).toBeGreaterThanOrEqual(0)

    const emptyParagraphBefore = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('.ProseMirror > p')).filter((p) => {
          const hasImage = Boolean(p.querySelector('img'))
          const text = (p.textContent || '').trim()
          return !hasImage && text.length === 0
        }).length,
    )

    await revealBlockHandleForSelector(page, '.ProseMirror img[alt="drag-image-source"]')

    const dragResult = await dragCurrentBlockHandleToTargetParagraph(
      page,
      'drag-target-anchor',
      'after',
    )
    expect(dragResult.feedback).toBe(true)

    await expect
      .poll(
        async () => {
          const imageAfter = await getTopBlockIndexBySelector(
            page,
            '.ProseMirror img[alt="drag-image-source"]',
          )
          const targetAfter = await getTopBlockIndexBySelector(
            page,
            '.ProseMirror #drag-target-anchor',
          )
          return imageAfter > targetAfter
        },
        { timeout: 3000 },
      )
      .toBe(true)

    const emptyParagraphAfter = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('.ProseMirror > p')).filter((p) => {
          const hasImage = Boolean(p.querySelector('img'))
          const text = (p.textContent || '').trim()
          return !hasImage && text.length === 0
        }).length,
    )
    expect(emptyParagraphAfter).toBe(emptyParagraphBefore)

    await page.close()
  })

  test('H3.13 拖拽专项：引用与代码块拖拽均有落点反馈', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openDragShowcasePage(page, 'h3-drag-showcase-feedback')

    const quoteSource = page.locator('.ProseMirror #drag-source-quote').first()
    await quoteSource.scrollIntoViewIfNeeded()
    const quoteBox = await quoteSource.boundingBox()
    if (!quoteBox) throw new Error('Cannot resolve quote source box')
    await page.mouse.move(quoteBox.x + 14, quoteBox.y + quoteBox.height / 2)
    await waitForVisible(page.locator('.be-block-handle'))
    const quoteDrag = await dragCurrentBlockHandleToTargetParagraph(
      page,
      'drag-target-anchor',
      'after',
    )
    expect(quoteDrag.feedback).toBe(true)

    const codeSource = page
      .locator('.ProseMirror .code-block-wrapper', { hasText: 'drag_showcase_code' })
      .first()
    await codeSource.scrollIntoViewIfNeeded()
    const codeBox = await codeSource.boundingBox()
    if (!codeBox) throw new Error('Cannot resolve code source box')
    await page.mouse.move(codeBox.x + 14, codeBox.y + codeBox.height / 2)
    await waitForVisible(page.locator('.be-block-handle'))
    const codeDrag = await dragCurrentBlockHandleToTargetParagraph(
      page,
      'drag-target-anchor',
      'before',
    )
    expect(codeDrag.feedback).toBe(true)

    await page.close()
  })

  test('H3.17 多选块 + 任意 handle 拖拽：整组选中块一起移动', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openDragShowcasePage(page, 'h3-marquee-group-drag')

    await revealBlockHandleForSelector(page, '.ProseMirror #drag-source-heading')
    await page.evaluate(() => {
      const handle = document.querySelector('.be-block-handle') as HTMLElement | null
      if (!handle) return
      handle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
          button: 0,
        }),
      )
      handle.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
          button: 0,
        }),
      )
    })

    await revealBlockHandleForSelector(page, '.ProseMirror #drag-source-paragraph')
    await page.evaluate(() => {
      const handle = document.querySelector('.be-block-handle') as HTMLElement | null
      if (!handle) return
      handle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
          button: 0,
        }),
      )
      handle.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
          button: 0,
        }),
      )
    })
    await page.waitForTimeout(120)

    const heading = page.locator('.ProseMirror #drag-source-heading').first()
    await heading.scrollIntoViewIfNeeded()
    const headingBox = await heading.boundingBox()
    if (!headingBox) throw new Error('Cannot resolve heading source box')
    await page.mouse.move(headingBox.x + 12, headingBox.y + headingBox.height / 2)
    await waitForVisible(page.locator('.be-block-handle'))

    const dragResult = await dragCurrentBlockHandleToTargetParagraph(
      page,
      'drag-target-anchor',
      'after',
    )
    expect(dragResult.feedback).toBe(true)

    await expect
      .poll(
        async () => {
          const headingAfter = await getTopBlockIndexBySelector(
            page,
            '.ProseMirror #drag-source-heading',
          )
          const paragraphAfter = await getTopBlockIndexBySelector(
            page,
            '.ProseMirror #drag-source-paragraph',
          )
          const targetAfter = await getTopBlockIndexBySelector(
            page,
            '.ProseMirror #drag-target-anchor',
          )
          return (
            headingAfter > targetAfter &&
            paragraphAfter > targetAfter &&
            headingAfter < paragraphAfter
          )
        },
        { timeout: 4000 },
      )
      .toBe(true)

    await page.close()
  })

  test('H3.14 表格专项：表格与块 handle 边界可区分', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openTableShowcasePage(page, 'h3-table-showcase-boundary')

    const mainTable = page.locator('.ProseMirror table').first()
    await waitForVisible(mainTable)
    await mainTable.locator('td').first().hover()

    const tableHandle = page.locator('.be-table-handle').first()
    await waitForVisible(tableHandle)
    const blockHandleVisibleInTable = await page.evaluate(() => {
      const handle = document.querySelector('.be-block-handle') as HTMLElement | null
      if (!handle) return false
      const style = getComputedStyle(handle)
      return style.display !== 'none' && style.opacity !== '0'
    })
    expect(blockHandleVisibleInTable).toBe(false)

    await tableHandle.click()
    await expect
      .poll(
        async () => ((await mainTable.getAttribute('class')) || '').includes('be-table-selected'),
        { timeout: 3000 },
      )
      .toBe(true)

    const paragraph = page
      .locator('.ProseMirror p', {
        hasText: '中间段落：用于验证离开表格区域后块级 handle 的回归展示。',
      })
      .first()
    await paragraph.scrollIntoViewIfNeeded()
    const paragraphBox = await paragraph.boundingBox()
    if (!paragraphBox) throw new Error('Cannot resolve mid paragraph box')
    await page.mouse.move(paragraphBox.x + 14, paragraphBox.y + paragraphBox.height / 2)

    const blockHandle = page.locator('.be-block-handle').first()
    await waitForVisible(blockHandle)
    await expect(await blockHandle.isVisible()).toBe(true)

    await page.close()
  })

  test('H3.15 图片操作边界：图片操作区与块 handle 可区分', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-image-boundary')

    const figure = page.locator('.ProseMirror .be-image-figure').first()
    const image = figure.locator('img[data-be-image-preview="true"]').first()
    await waitForVisible(image)

    const imageBox = await image.boundingBox()
    if (!imageBox) throw new Error('Cannot resolve image box')
    await page.mouse.move(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2)
    await expect.poll(async () => await isBlockHandleVisible(page), { timeout: 3000 }).toBe(false)

    await revealBlockHandleForSelector(page, '.ProseMirror .be-image-figure')

    await image.click()
    await waitForVisible(figure.locator('.be-image-align-bar').first())
    await page.mouse.move(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2)
    await expect.poll(async () => await isBlockHandleVisible(page), { timeout: 3000 }).toBe(false)

    await page.close()
  })

  test('H3.16 代码块语言连续切换：连续 3 次不残留加载态', async () => {
    if (!browser) throw new Error('browser not initialized')
    const page = await browser.newPage()
    await openRegressionPage(page, 'h3-code-language-sequence')

    const codeBlock = page.locator('.code-block-wrapper').first()
    await waitForVisible(codeBlock)
    const trigger = codeBlock.locator('.code-block-lang-select').first()

    const sequence = ['typescript', 'python', 'json']
    for (const language of sequence) {
      await trigger.click()
      const menu = codeBlock.locator('.lang-dropdown-menu.show').first()
      await waitForVisible(menu)
      const clicked = await page.evaluate((lang) => {
        const menu = document.querySelector(
          '.code-block-wrapper .lang-dropdown-menu.show',
        ) as HTMLElement | null
        if (!menu) return false
        const item = Array.from(menu.querySelectorAll<HTMLElement>('.lang-item')).find(
          (node) => (node.textContent || '').trim().toLowerCase() === lang,
        )
        if (!item) return false
        item.click()
        return true
      }, language)
      expect(clicked).toBe(true)
      await expect
        .poll(
          async () =>
            (
              (await codeBlock
                .locator('.code-block-lang-select .lang-name')
                .first()
                .textContent()) || ''
            )
              .trim()
              .toLowerCase(),
          { timeout: 5000 },
        )
        .toBe(language)
    }

    await expect
      .poll(
        async () =>
          (await codeBlock.locator('.code-block-lang-select').first().getAttribute('class')) || '',
        { timeout: 5000 },
      )
      .not.toMatch(/\bis-loading\b/)
    await expect(await codeBlock.locator('.lang-dropdown-menu.show').count()).toBe(0)

    await page.close()
  })
})
