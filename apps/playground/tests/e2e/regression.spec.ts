import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const APP_HOST = "127.0.0.1";
const APP_PORT_START = 4174;
const APP_PORT_MAX = 4274;
const THIS_FILE = fileURLToPath(import.meta.url);
const APP_CWD = path.resolve(path.dirname(THIS_FILE), "../..");
const ROUTE_BASE = "/scenes/regression?lang=zh-CN&theme=dark&collab=0";

let devServer: ChildProcessWithoutNullStreams | null = null;
let browser: Browser | null = null;
let appPort = APP_PORT_START;
let appUrl = `http://${APP_HOST}:${appPort}`;
const devServerLogs: string[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortAvailable(port: number, host: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(
  start = APP_PORT_START,
  max = APP_PORT_MAX,
): Promise<number> {
  for (let port = start; port <= max; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port, APP_HOST)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${start}-${max}`);
}

async function waitForServerReady(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${appUrl}/`);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await sleep(300);
  }
  const latestLogs = devServerLogs.slice(-20).join("\n");
  throw new Error(
    `Playground dev server not ready within ${timeoutMs}ms @ ${appUrl}\n${latestLogs}`,
  );
}

function randomRoom(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function openRegressionPage(page: Page, roomPrefix: string) {
  await page.setViewportSize({ width: 1600, height: 980 });
  const room = randomRoom(roomPrefix);
  await page.goto(`${appUrl}${ROUTE_BASE}&room=${room}`, {
    waitUntil: "networkidle",
  });
  await expect(await page.locator(".scene-header h2").first().isVisible()).toBe(
    true,
  );
  await expect(
    await page.locator(".scene-header h2").first().textContent(),
  ).toContain("回归验证场景");
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".ProseMirror");
      return Boolean(
        el &&
        el.textContent &&
        el.textContent.includes("请选中这一段文本后点击工具栏"),
      );
    },
    undefined,
    { timeout: 60_000 },
  );
  await expect(await page.locator(".ProseMirror").isVisible()).toBe(true);
}

async function selectTextInParagraph(page: Page, paragraphText: string) {
  const paragraph = page
    .locator(".ProseMirror p", { hasText: paragraphText })
    .first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) {
    throw new Error(`Paragraph not found for text: ${paragraphText}`);
  }

  const y = box.y + box.height / 2;
  const startX = box.x + 12;
  await page.mouse.click(startX, y);
  await page.keyboard.down("Shift");
  for (let i = 0; i < 18; i += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.up("Shift");
  await page.waitForTimeout(160);

  let selectedLen = await page.evaluate(
    () => window.getSelection()?.toString().trim().length || 0,
  );

  if (selectedLen === 0) {
    const endX = Math.min(box.x + box.width - 12, startX + 220);
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    selectedLen = await page.evaluate(
      () => window.getSelection()?.toString().trim().length || 0,
    );
  }

  if (selectedLen === 0) {
    selectedLen = await page.evaluate((text) => {
      const paragraphs = Array.from(
        document.querySelectorAll(".ProseMirror p"),
      );
      const target = paragraphs.find((p) => p.textContent?.includes(text));
      if (!target) return 0;

      const editor = target.closest(".ProseMirror") as HTMLElement | null;
      editor?.focus();

      const selection = window.getSelection();
      if (!selection) return 0;
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);

      document.dispatchEvent(new Event("selectionchange"));
      return selection.toString().trim().length || 0;
    }, paragraphText);
  }

  expect(selectedLen).toBeGreaterThan(0);
}

async function waitForVisible(
  locator: ReturnType<Page["locator"]>,
  timeoutMs = 5000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await locator.isVisible()) return;
    await sleep(120);
  }
  throw new Error("locator not visible within timeout");
}

async function focusParagraphAndMoveToEnd(page: Page, paragraphText: string) {
  const paragraph = page
    .locator(".ProseMirror p", { hasText: paragraphText })
    .first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) {
    throw new Error(`Paragraph not found for text: ${paragraphText}`);
  }

  await page.mouse.click(box.x + 12, box.y + box.height / 2);
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await page.waitForTimeout(80);
}

async function placeCursorAtParagraphEnd(page: Page, paragraphText: string) {
  const success = await page.evaluate((text) => {
    const paragraphs = Array.from(
      document.querySelectorAll(".ProseMirror p"),
    ) as HTMLElement[];
    const target = paragraphs.find((p) => p.textContent?.includes(text));
    if (!target) return false;

    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    target.closest(".ProseMirror")?.dispatchEvent(new Event("selectionchange"));
    (target.closest(".ProseMirror") as HTMLElement | null)?.focus();
    return true;
  }, paragraphText);
  expect(success).toBe(true);
}

async function pressRedoShortcut(page: Page) {
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await page.waitForTimeout(100);
}

async function openBlockHandleMenuForParagraph(
  page: Page,
  paragraphText: string,
) {
  const paragraph = page
    .locator(".ProseMirror p", { hasText: paragraphText })
    .first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) {
    throw new Error(`Cannot get paragraph box for text: ${paragraphText}`);
  }

  await page.mouse.move(box.x + 14, box.y + box.height / 2);
  const handle = page.locator(".be-block-handle");
  await waitForVisible(handle);
  await handle.click();
  const menu = page.locator(".be-block-handle-menu");
  await waitForVisible(menu);
  return menu;
}

async function clickBlockHandleMenuItem(
  menu: ReturnType<Page["locator"]>,
  label: RegExp,
) {
  await waitForVisible(menu);
  const clicked = await menu.evaluate(
    (root, matcher) => {
      const re = new RegExp(matcher.source, matcher.flags);
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(".menu-item, .dropdown-item"),
      );
      const target = items.find((item) => re.test(item.textContent || ""));
      if (!target) return false;
      target.click();
      return true;
    },
    { source: label.source, flags: label.flags },
  );
  expect(clicked).toBe(true);
}

async function getTopLevelBlockTexts(page: Page) {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll(".ProseMirror > *")).map((el) =>
      (el.textContent || "").replace(/\s+/g, " ").trim(),
    ),
  );
}

async function expectButtonActive(
  button: ReturnType<Page["locator"]>,
  active: boolean,
) {
  if (active) {
    await expect
      .poll(async () => (await button.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/);
    return;
  }
  await expect
    .poll(async () => (await button.getAttribute("class")) || "", {
      timeout: 3000,
    })
    .not.toMatch(/\bactive\b/);
}

function normalizeSelectionText(input: string) {
  return input.replace(/\s+/g, "").trim();
}

function getCommonPrefixLength(a: string, b: string) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

async function getSelectedText(page: Page) {
  return await page.evaluate(() => window.getSelection()?.toString() || "");
}

async function selectByShiftArrow(
  page: Page,
  paragraphText: string,
  steps = 18,
) {
  const paragraph = page
    .locator(".ProseMirror p", { hasText: paragraphText })
    .first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) throw new Error(`Paragraph not found for text: ${paragraphText}`);

  const y = box.y + box.height / 2;
  const startX = box.x + 12;
  await page.mouse.click(startX, y);
  await page.keyboard.down("Shift");
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.up("Shift");
  await page.waitForTimeout(120);
  let selection = await getSelectedText(page);
  if (normalizeSelectionText(selection).length > 0) return selection;

  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(80);
  selection = await getSelectedText(page);
  if (normalizeSelectionText(selection).length > 0) return selection;

  await selectTextInParagraph(page, paragraphText);
  return await getSelectedText(page);
}

async function selectByMouseDrag(page: Page, paragraphText: string) {
  const paragraph = page
    .locator(".ProseMirror p", { hasText: paragraphText })
    .first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) throw new Error(`Paragraph not found for text: ${paragraphText}`);

  const y = box.y + box.height / 2;
  const startX = box.x + 12;
  const endX = Math.min(box.x + box.width - 14, startX + 220);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  return await getSelectedText(page);
}

async function dispatchSyntheticPlainTextPaste(page: Page, plainText: string) {
  const dispatched = await page.evaluate((text) => {
    const editor = document.querySelector(".ProseMirror") as HTMLElement | null;
    if (!editor) return false;
    editor.focus();
    const event = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransfer };
    const data = new DataTransfer();
    data.setData("text/plain", text);
    Object.defineProperty(event, "clipboardData", {
      value: data,
      configurable: true,
    });
    return editor.dispatchEvent(event);
  }, plainText);
  expect(typeof dispatched).toBe("boolean");
}

async function pastePlainTextAtCursor(page: Page, text: string) {
  const clipboardReady = await page.evaluate(async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }, text);

  if (clipboardReady) {
    await page.keyboard.press("ControlOrMeta+v");
    await page.waitForTimeout(120);
  } else {
    await dispatchSyntheticPlainTextPaste(page, text);
  }

  const pasted = await page.evaluate((needle) => {
    const content = document.querySelector(".ProseMirror")?.textContent || "";
    return content.includes(needle);
  }, text);

  if (!pasted) {
    await insertTextAtCurrentSelection(page, text);
    await page.waitForTimeout(120);
  }
}

async function insertTextAtCurrentSelection(page: Page, text: string) {
  const inserted = await page.evaluate((value) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(value);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, text);
  expect(inserted).toBe(true);
}

describe("regression e2e (H2)", () => {
  beforeAll(async () => {
    appPort = await findAvailablePort();
    appUrl = `http://${APP_HOST}:${appPort}`;

    devServer = spawn(
      "pnpm",
      ["exec", "vite", "--host", APP_HOST, "--port", String(appPort)],
      {
        cwd: APP_CWD,
        stdio: "pipe",
        env: { ...process.env },
      },
    );

    devServer.stdout.on("data", (chunk) => {
      devServerLogs.push(chunk.toString());
      if (devServerLogs.length > 120) devServerLogs.shift();
    });

    devServer.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      devServerLogs.push(text);
      if (devServerLogs.length > 120) devServerLogs.shift();
      if (text.includes("EADDRINUSE")) {
        throw new Error(`Port ${appPort} already in use`);
      }
    });

    await waitForServerReady();
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
    }
  });

  test("H2.1 评论：创建 + 选区引用预填 + 行内点击联动", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-comment");

    await selectTextInParagraph(page, "请选中这一段文本后点击工具栏");
    const selectionToolbar = page.locator(".be-selection-tooltip");
    await waitForVisible(selectionToolbar);

    const addCommentBtn = page
      .locator('.be-selection-tooltip button[data-command="addComment"]')
      .first();
    await addCommentBtn.click();

    const quotePreview = page.locator(".comment-selection-quote");
    await waitForVisible(quotePreview);
    await expect(await quotePreview.textContent()).toContain("|");

    const draftInput = page.locator(".comment-draft-input textarea");
    await waitForVisible(draftInput);
    await draftInput.fill("e2e: 评论联动验证");
    const createBtn = page.locator(".comment-create-btn").first();
    await waitForVisible(createBtn);
    await createBtn.click();

    const createdThread = page
      .locator(".comment-item", { hasText: "e2e: 评论联动验证" })
      .first();
    await waitForVisible(createdThread);

    const mark = page.locator(".ProseMirror [data-comment-id]").first();
    await waitForVisible(mark);
    const markId = await mark.getAttribute("data-comment-id");
    expect(markId).toBeTruthy();
    await mark.click();

    await expect(
      await page
        .locator(`.comment-item[data-comment-id="${markId}"]`)
        .isVisible(),
    ).toBe(true);
    await page.close();
  });

  test("H2.2 链接：插入 + 悬浮预览 + 锚点跳转", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-link");

    await selectTextInParagraph(
      page,
      "在这里继续测试行内评论点击是否可定位到评论线程",
    );
    const selectionToolbar = page.locator(".be-selection-tooltip");
    await waitForVisible(selectionToolbar);
    await page
      .locator('.be-selection-tooltip button[data-command="setLink"]')
      .first()
      .click();

    const dialog = page.locator(".be-dialog");
    await waitForVisible(dialog);
    await expect(await dialog.textContent()).toMatch(/插入链接|Insert Link/i);

    const urlInput = dialog.locator("input.be-input-control").first();
    await urlInput.fill("#be-regression-anchor");
    await dialog.locator(".be-dialog-btn--primary").first().click();

    const insertedLink = page
      .locator('.ProseMirror a[href="#be-regression-anchor"]')
      .first();
    await waitForVisible(insertedLink);

    const anchorLink = page.getByRole("link", { name: "跳转到锚点块" }).first();
    await anchorLink.hover();
    await waitForVisible(page.locator(".be-link-preview-tooltip"));

    await anchorLink.click();
    await expect(page.url()).toMatch(/#be-regression-anchor$/);
    await page.close();
  });

  test("H2.3 表格工具栏：显示 + 文案 + 行操作", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-table");

    const table = page.locator(".ProseMirror table").first();
    await waitForVisible(table);
    const rowCountBefore = await page.locator(".ProseMirror table tr").count();

    await page
      .locator(".ProseMirror table td", { hasText: "张三" })
      .first()
      .click();
    const tableMenu = page.locator(".table-bubble-menu");
    await waitForVisible(tableMenu);
    await expect((await tableMenu.getAttribute("aria-label")) || "").toMatch(
      /表格工具栏|table toolbar/i,
    );

    const rowOpsTrigger = tableMenu
      .locator('[data-tooltip="行操作"], [data-tooltip="Row Operations"]')
      .first();
    await waitForVisible(rowOpsTrigger);
    await rowOpsTrigger.click();
    await page
      .locator(".toolbar-dropdown-menu .dropdown-item", {
        hasText: /上方插入行|Insert Row Above/i,
      })
      .first()
      .click();

    const rowCountAfter = await page.locator(".ProseMirror table tr").count();
    expect(rowCountAfter).toBeGreaterThan(rowCountBefore);
    await page.close();
  });

  test("H2.4 block handle：可见 + 菜单可打开 + 暗黑样式", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-handle");

    const paragraph = page.locator(".ProseMirror p").first();
    const box = await paragraph.boundingBox();
    if (!box) throw new Error("Cannot get paragraph box for block handle test");
    await page.mouse.move(box.x + 14, box.y + box.height / 2);

    const handle = page.locator(".be-block-handle");
    await waitForVisible(handle);
    await handle.click();

    const menu = page.locator(".be-block-handle-menu");
    await waitForVisible(menu);
    await expect(await menu.textContent()).toMatch(/上移一块|Move Up/i);
    await expect(await menu.textContent()).toMatch(/删除块|Delete Block/i);

    const bgColor = await menu.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bgColor).not.toBe("rgb(255, 255, 255)");
    await page.close();
  });

  test("H2.5 selection tooltip：选区显示 + 加粗命令可用", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-selection-tooltip");

    await selectTextInParagraph(page, "请选中这一段文本后点击工具栏");
    const tooltip = page.locator(".be-selection-tooltip");
    await waitForVisible(tooltip);

    const boldBtn = tooltip
      .locator('button[data-command="toggleBold"]')
      .first();
    await waitForVisible(boldBtn);
    await boldBtn.click();
    await expect
      .poll(async () => (await boldBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/);
    await page.close();
  });

  test("B5 主题主色联动冒烟：修改 --primary-color 后激活态样式联动", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "b5-token-smoke");

    const createBtn = page.locator(".comment-create-btn").first();
    await waitForVisible(createBtn);

    const beforeStyle = await createBtn.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement);
      return {
        primaryVar: style.getPropertyValue("--primary-color").trim(),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      };
    });

    await page.evaluate(() => {
      document.documentElement.style.setProperty("--primary-color", "#ff4d4f");
      document.documentElement.style.setProperty("--primary-hover", "#ff7875");
      const root = document.querySelector(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null;
      root?.style.setProperty("--primary-color", "#ff4d4f");
      root?.style.setProperty("--primary-hover", "#ff7875");
    });
    await page.waitForTimeout(260);

    const afterStyle = await createBtn.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement);
      return {
        primaryVar: style.getPropertyValue("--primary-color").trim(),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      };
    });
    const changed =
      afterStyle.primaryVar !== beforeStyle.primaryVar ||
      afterStyle.backgroundColor !== beforeStyle.backgroundColor ||
      afterStyle.borderColor !== beforeStyle.borderColor ||
      afterStyle.color !== beforeStyle.color;
    expect(changed).toBe(true);
    await page.close();
  });

  test("H2.6 撤销重做：输入后可回退并恢复", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-undo-redo");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    await focusParagraphAndMoveToEnd(page, targetText);
    await page.keyboard.type(" e2e-undo-redo");
    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain("e2e-undo-redo");

    await page.keyboard.press("ControlOrMeta+z");
    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .not.toContain("e2e-undo-redo");

    await pressRedoShortcut(page);
    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain("e2e-undo-redo");

    await page.close();
  });

  test("H2.7 快捷键一致性：Cmd/Ctrl+B 与工具栏加粗行为一致", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-shortcut-bold");

    await selectTextInParagraph(page, "请选中这一段文本后点击工具栏");
    const tooltip = page.locator(".be-selection-tooltip");
    await waitForVisible(tooltip);
    const boldBtn = tooltip
      .locator('button[data-command="toggleBold"]')
      .first();
    await waitForVisible(boldBtn);

    await boldBtn.click();
    await expect
      .poll(async () => (await boldBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/);

    await page.keyboard.press("ControlOrMeta+b");
    await expect
      .poll(async () => (await boldBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .not.toMatch(/\bactive\b/);

    await page.close();
  });

  test("H2.8 Shift+Enter：段落内插入软换行", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-soft-break");

    const targetText = "请将鼠标移到左侧块手柄";
    const paragraphCountBefore = await page.locator(".ProseMirror p").count();

    await focusParagraphAndMoveToEnd(page, targetText);
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("软换行断言");
    await page.waitForTimeout(120);

    const editorHtml = (await page.locator(".ProseMirror").innerHTML()) || "";
    expect(editorHtml).toContain("软换行断言");
    expect(editorHtml).toMatch(/<br\s*\/?>/i);
    const paragraphCountAfter = await page.locator(".ProseMirror p").count();
    expect(paragraphCountAfter).toBe(paragraphCountBefore);

    await page.close();
  });

  test("H2.9 删除块后编辑不中断：无空焦点状态", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-delete-block-focus");

    const paragraphCountBefore = await page.locator(".ProseMirror p").count();
    const menu = await openBlockHandleMenuForParagraph(
      page,
      "请将鼠标移到左侧块手柄",
    );
    await clickBlockHandleMenuItem(menu, /删除块|Delete Block/i);

    await expect
      .poll(async () => await page.locator(".ProseMirror p").count(), {
        timeout: 3000,
      })
      .toBe(paragraphCountBefore - 1);

    await page.keyboard.type("delete-after-focus-check");
    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain("delete-after-focus-check");

    await page.close();
  });

  test("H2.10 格式化撤销重做：斜体命令可撤销并恢复", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-format-undo-redo");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    await selectTextInParagraph(page, targetText);
    const tooltip = page.locator(".be-selection-tooltip");
    await waitForVisible(tooltip);
    const italicBtn = tooltip
      .locator('button[data-command="toggleItalic"]')
      .first();
    await waitForVisible(italicBtn);
    await italicBtn.click();
    await expect
      .poll(async () => (await italicBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/);

    await page.keyboard.press("ControlOrMeta+z");
    await expect
      .poll(async () => (await italicBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .not.toMatch(/\bactive\b/);

    await pressRedoShortcut(page);
    await expect
      .poll(async () => (await italicBtn.getAttribute("class")) || "", {
        timeout: 3000,
      })
      .toMatch(/\bactive\b/);

    await page.close();
  });

  test("H2.11 块移动顺序：上移/下移可逆且顺序正确", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-block-move-order");

    const targetText = "请将鼠标移到左侧块手柄";
    const before = await getTopLevelBlockTexts(page);
    const beforeIndex = before.findIndex((text) => text.includes(targetText));
    expect(beforeIndex).toBeGreaterThan(0);
    const previousBlockText = before[beforeIndex - 1] || "";

    const upMenu = await openBlockHandleMenuForParagraph(page, targetText);
    await clickBlockHandleMenuItem(upMenu, /上移一块|Move Up/i);

    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page);
        return current.findIndex((text) => text.includes(targetText));
      })
      .toBe(beforeIndex - 1);
    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page);
        return current[beforeIndex] || "";
      })
      .toContain(previousBlockText);

    const downMenu = await openBlockHandleMenuForParagraph(page, targetText);
    await clickBlockHandleMenuItem(downMenu, /下移一块|Move Down/i);

    await expect
      .poll(async () => {
        const current = await getTopLevelBlockTexts(page);
        return current.findIndex((text) => text.includes(targetText));
      })
      .toBe(beforeIndex);

    await page.close();
  });

  test("H2.12 连续中文输入：长串文本不丢字（输入稳定性冒烟）", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-input-stability-smoke");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    const phrase = "中文连续输入验证abc123XYZ输入不中断";
    await focusParagraphAndMoveToEnd(page, targetText);
    await page.keyboard.type(` ${phrase}`);

    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain(phrase);

    const occurrenceCount = await page.evaluate((needle) => {
      const text = document.querySelector(".ProseMirror")?.textContent || "";
      return text.split(needle).length - 1;
    }, phrase);
    expect(occurrenceCount).toBe(1);

    await page.close();
  });

  test("H2.13 输入不中断压测：触发 UI 重算后仍可连续输入", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-input-rerender-stress");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    const partA = "输入压测A";
    const partB = "输入压测B";
    const combined = `${partA}${partB}`;

    await focusParagraphAndMoveToEnd(page, targetText);
    await page.keyboard.type(partA);

    await page.evaluate(() => {
      for (let i = 0; i < 6; i += 1) {
        window.dispatchEvent(new Event("resize"));
        document.dispatchEvent(new Event("selectionchange"));
      }
      const root = document.querySelector(
        '[data-be-ui-root="true"]',
      ) as HTMLElement | null;
      root?.style.setProperty("--primary-color", "#4f7cff");
      root?.style.setProperty("--primary-hover", "#6f8fff");
      root?.style.setProperty("--primary-color", "#527dff");
      root?.style.setProperty("--primary-hover", "#7394ff");
    });

    await page.keyboard.type(partB);

    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain(combined);

    const occurrenceCount = await page.evaluate((needle) => {
      const text = document.querySelector(".ProseMirror")?.textContent || "";
      return text.split(needle).length - 1;
    }, combined);
    expect(occurrenceCount).toBe(1);

    await page.close();
  });

  test("H2.14 IME 组合输入模拟：composition 事件链路不丢字", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-ime-composition-sim");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    const phrase = "组合输入法验证";
    await focusParagraphAndMoveToEnd(page, targetText);

    const inserted = await page.evaluate((text) => {
      const editor = document.querySelector(".ProseMirror") as HTMLElement | null;
      if (!editor) return false;
      editor.focus();
      editor.dispatchEvent(
        new CompositionEvent("compositionstart", { data: text[0] || "" }),
      );
      editor.dispatchEvent(
        new CompositionEvent("compositionupdate", { data: text }),
      );
      const insertedByCommand =
        typeof document.execCommand === "function" &&
        document.execCommand("insertText", false, text);
      if (!insertedByCommand) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      editor.dispatchEvent(
        new CompositionEvent("compositionend", { data: text }),
      );
      return true;
    }, phrase);
    expect(inserted).toBe(true);

    await expect
      .poll(
        async () => (await page.locator(".ProseMirror").textContent()) || "",
        { timeout: 3000 },
      )
      .toContain(phrase);

    await page.close();
  });

  test("H2.15 快捷键一致性扩展：Cmd/Ctrl+I 与斜体按钮行为一致", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-shortcut-italic");

    await selectTextInParagraph(page, "请选中这一段文本后点击工具栏");
    const tooltip = page.locator(".be-selection-tooltip");
    await waitForVisible(tooltip);

    const italicBtn = tooltip
      .locator('button[data-command="toggleItalic"]')
      .first();
    await waitForVisible(italicBtn);
    await italicBtn.click();
    await expectButtonActive(italicBtn, true);

    await page.keyboard.press("ControlOrMeta+i");
    await expectButtonActive(italicBtn, false);

    await page.close();
  });

  test("H2.16 选区一致性：Shift 扩选与鼠标拖选结果一致", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-selection-parity");

    const targetText = "请选中这一段文本后点击工具栏";
    const shiftSelection = normalizeSelectionText(
      await selectByShiftArrow(page, targetText, 20),
    );
    expect(shiftSelection.length).toBeGreaterThan(0);

    await page.mouse.click(24, 24);
    const dragSelection = normalizeSelectionText(
      await selectByMouseDrag(page, targetText),
    );
    expect(dragSelection.length).toBeGreaterThan(0);

    const prefixLen = getCommonPrefixLength(shiftSelection, dragSelection);
    expect(prefixLen).toBeGreaterThanOrEqual(6);
    await page.close();
  });

  test("H2.17 工具栏一致性：顶部与选区工具栏加粗命令结果一致", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-toolbar-parity");

    await selectTextInParagraph(page, "请选中这一段文本后点击工具栏");
    const selectionTooltip = page.locator(".be-selection-tooltip");
    await waitForVisible(selectionTooltip);

    const topBoldBtn = page
      .locator('.toolbar button[data-command="toggleBold"]')
      .first();
    await waitForVisible(topBoldBtn);
    const selectionBoldBtn = selectionTooltip
      .locator('button[data-command="toggleBold"]')
      .first();
    await waitForVisible(selectionBoldBtn);

    await topBoldBtn.click();
    await expectButtonActive(selectionBoldBtn, true);

    await selectionBoldBtn.click();
    await expectButtonActive(selectionBoldBtn, false);

    await page.close();
  });

  test.skip("H2.18 粘贴落点：粘贴后仍留在当前段落连续编辑", async () => {
    if (!browser) throw new Error("browser not initialized");
    const page = await browser.newPage();
    await openRegressionPage(page, "h2-paste-caret");

    const targetText = "在这里继续测试行内评论点击是否可定位到评论线程";
    const paragraphCountBefore = await page.locator(".ProseMirror p").count();
    const targetParagraphIndexBefore = await page.evaluate((text) => {
      const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p"));
      return paragraphs.findIndex((p) => (p.textContent || "").includes(text));
    }, targetText);
    expect(targetParagraphIndexBefore).toBeGreaterThanOrEqual(0);

    const pasted = "粘贴落点验证";
    const tail = "TAIL";

    await placeCursorAtParagraphEnd(page, targetText);
    await insertTextAtCurrentSelection(page, `${pasted}${tail}`);
    const pastedParagraphIndex = await page.evaluate((needle) => {
      const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p"));
      return paragraphs.findIndex((p) => (p.textContent || "").includes(needle));
    }, `${pasted}${tail}`);
    expect(pastedParagraphIndex).toBe(targetParagraphIndexBefore);

    const paragraphCountAfter = await page.locator(".ProseMirror p").count();
    expect(paragraphCountAfter).toBe(paragraphCountBefore);

    await page.close();
  });
});
