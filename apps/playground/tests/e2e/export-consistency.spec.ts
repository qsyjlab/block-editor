import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const APP_HOST = '127.0.0.1'
const APP_PORT_START = 4374
const APP_PORT_MAX = 6374
const THIS_FILE = fileURLToPath(import.meta.url)
const APP_CWD = path.resolve(path.dirname(THIS_FILE), '../..')
const DEFAULT_ROUTE = '/scenes/default?lang=zh-CN&theme=light&collab=0'

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
  throw new Error(`Playground dev server not ready within ${timeoutMs}ms @ ${appUrl}\n${latestLogs}`)
}

const SAMPLE_CONTENT = `
<h1>导出一致性验收样本</h1>
<h2>表格章节</h2>
<table>
  <tr><th>姓名</th><th>年龄</th><th>城市</th></tr>
  <tr><td>张三</td><td>28</td><td>北京</td></tr>
  <tr><td>李四</td><td></td><td>上海</td></tr>
</table>
<p>表格后的普通段落，用于填充 PDF 页面内容。</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>已完成事项</p></li>
  <li data-type="taskItem" data-checked="false"><p>未完成事项</p></li>
</ul>
`

async function openDefaultPage(page: Page) {
  await page.setViewportSize({ width: 1600, height: 980 })
  await page.goto(`${appUrl}${DEFAULT_ROUTE}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 60_000 })
  await page.waitForFunction(() => {
    const handle = (window as unknown as { __blockEditor?: { core?: unknown } }).__blockEditor
    return Boolean(handle?.core)
  }, { timeout: 60_000 })
}

async function setSampleContent(page: Page) {
  await page.evaluate((html) => {
    const handle = (window as unknown as {
      __blockEditor?: { core: { editor: { commands: { setContent: (c: string) => void } } } }
    }).__blockEditor
    handle?.core.editor.commands.setContent(html)
  }, SAMPLE_CONTENT)
  await page.waitForFunction(() => {
    const el = document.querySelector('.ProseMirror')
    return Boolean(el && el.textContent?.includes('导出一致性验收样本'))
  }, { timeout: 30_000 })
}

describe('export consistency e2e (EXP-001 / EXP-002 / EXP-004)', () => {
  beforeAll(async () => {
    appPort = await findAvailablePort()
    appUrl = `http://${APP_HOST}:${appPort}`

    devServer = spawn(
      process.execPath,
      [
        path.join(APP_CWD, 'node_modules', 'vite', 'bin', 'vite.js'),
        '--host',
        APP_HOST,
        '--port',
        String(appPort),
      ],
      {
        cwd: APP_CWD,
        stdio: 'pipe',
        env: { ...process.env },
      },
    )

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
    // 环境限制：CI 镜像未预置 playwright 浏览器且下载受限，优先使用系统 Edge/Chrome
    browser = await chromium
      .launch({ headless: true, channel: 'msedge' })
      .catch(async () => chromium.launch({ headless: true, channel: 'chrome' }))
      .catch(async () => chromium.launch({ headless: true }))
  }, 180_000)

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
    if (devServer && !devServer.killed) {
      devServer.kill('SIGTERM')
    }
  })

  test('EXP-001 Markdown 导出：表格输出为 GFM 而不是原始 HTML', async ({ }) => {
    if (!browser) throw new Error('browser not initialized')
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    await openDefaultPage(page)
    await setSampleContent(page)

    const markdown = await page.evaluate(() => {
      const handle = (
        window as unknown as {
          __blockEditor?: {
            core: { exporter: { toMarkdownText: () => Promise<string> } }
          }
        }
      ).__blockEditor
      return handle!.core.exporter.toMarkdownText()
    })

    expect(markdown).toContain('# 导出一致性验收样本')
    expect(markdown).toContain('| 姓名 | 年龄 | 城市 |')
    expect(markdown).toContain('| --- | --- | --- |')
    expect(markdown).toContain('| 张三 | 28 | 北京 |')
    expect(markdown).toMatch(/-\s+\[x\] 已完成事项/)
    expect(markdown).toMatch(/-\s+\[ \] 未完成事项/)
    expect(markdown).not.toContain('<table')
    expect(markdown).not.toContain('```')

    await context.close()
  })

  test('EXP-002 PDF 导出：内容非空白且包含渲染图像流', async () => {
    if (!browser) throw new Error('browser not initialized')
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    await openDefaultPage(page)
    await setSampleContent(page)

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await page.evaluate(() => {
      const handle = (
        window as unknown as {
          __blockEditor?: { core: { exporter: { exportToPdf: () => Promise<void> } } }
        }
      ).__blockEditor
      return handle!.core.exporter.exportToPdf()
    })
    const download = await downloadPromise
    const filePath = await download.path()
    expect(filePath).toBeTruthy()

    const buffer = fs.readFileSync(filePath as string)
    const asText = buffer.toString('latin1')

    expect(asText.startsWith('%PDF-')).toBe(true)
    // 空白 PDF 只有文本流；html2canvas 渲染出的内容以 JPEG 图像嵌入（DCTDecode）
    expect(asText).toContain('DCTDecode')
    // 空白页 PDF 通常 < 10KB；含图像内容页应明显更大
    expect(buffer.byteLength).toBeGreaterThan(15_000)
    await context.close()
  })

  test('EXP-004 导出后再导入：表格仍是表格节点', async () => {
    if (!browser) throw new Error('browser not initialized')
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    await openDefaultPage(page)
    await setSampleContent(page)

    const nodeTypes = await page.evaluate(async () => {
      const handle = (
        window as unknown as {
          __blockEditor?: {
            core: {
              exporter: { toMarkdownText: () => Promise<string> }
              markdownImporter: { importText: (md: string) => void }
              editor: { getJSON: () => unknown }
            }
          }
        }
      ).__blockEditor
      const core = handle!.core
      const markdown = await core.exporter.toMarkdownText()
      core.markdownImporter.importText(markdown)
      const types = new Set<string>()
      JSON.stringify(core.editor.getJSON(), (key, value) => {
        if (value && typeof value === 'object' && (value as { type?: string }).type) {
          types.add((value as { type: string }).type)
        }
        return value
      })
      return Array.from(types)
    })

    expect(nodeTypes).toContain('table')
    expect(nodeTypes).toContain('tableHeader')
    expect(nodeTypes).toContain('tableCell')
    expect(nodeTypes).not.toContain('codeBlock')
    await context.close()
  })
})
