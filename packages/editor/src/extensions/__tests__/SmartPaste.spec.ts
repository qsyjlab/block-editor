import { describe, expect, it, vi } from "vitest";
import { handleSmartPaste, isInCodePasteContext } from "../SmartPaste";

function createEditorMock(options?: {
  codeBlockActive?: boolean;
  codeMarkActive?: boolean;
  parentIsCode?: boolean;
  selectionEmpty?: boolean;
  setLinkReturns?: boolean;
  setImageReturns?: boolean;
}) {
  const run = vi.fn();
  const insertContentViaChain = vi.fn(() => ({ run }));
  const focus = vi.fn(() => ({ insertContent: insertContentViaChain }));
  const chain = vi.fn(() => ({ focus }));
  const insertContentViaCommands = vi.fn();
  const setLink = vi.fn(() => options?.setLinkReturns ?? true);
  const setImage = vi.fn(() => options?.setImageReturns ?? true);
  const isActive = vi.fn((name: string) => {
    if (name === "codeBlock") return Boolean(options?.codeBlockActive);
    if (name === "code") return Boolean(options?.codeMarkActive);
    return false;
  });

  return {
    state: {
      selection: {
        empty: options?.selectionEmpty ?? true,
        $from: {
          parent: {
            type: {
              spec: {
                code: Boolean(options?.parentIsCode),
              },
            },
          },
        },
      },
    },
    isActive,
    chain,
    commands: {
      insertContent: insertContentViaCommands,
      setLink,
      setImage,
    },
    __spies: {
      run,
      focus,
      chain,
      insertContentViaChain,
      insertContentViaCommands,
      setLink,
      setImage,
      isActive,
    },
  };
}

function createPasteEventMock(plainText: string, htmlText = "") {
  const getData = vi.fn((type: string) =>
    type === "text/plain" ? plainText : type === "text/html" ? htmlText : "",
  );
  const preventDefault = vi.fn();
  return {
    clipboardData: { getData },
    preventDefault,
    __spies: { getData, preventDefault },
  };
}

describe("SmartPaste", () => {
  it("should detect code paste context from codeBlock active state", () => {
    const editor = createEditorMock({ codeBlockActive: true });
    expect(isInCodePasteContext(editor as any)).toBe(true);
  });

  it("should bypass smart paste in code context", () => {
    const editor = createEditorMock({ parentIsCode: true });
    const event = createPasteEventMock("https://example.com");

    const handled = handleSmartPaste(editor as any, event as any);

    expect(handled).toBe(false);
    expect(event.__spies.preventDefault).not.toHaveBeenCalled();
    expect(editor.__spies.chain).not.toHaveBeenCalled();
    expect(editor.__spies.insertContentViaCommands).not.toHaveBeenCalled();
  });

  it("should transform plain URL to link outside code context", () => {
    const editor = createEditorMock();
    const event = createPasteEventMock("https://example.com/path");

    const handled = handleSmartPaste(editor as any, event as any);

    expect(handled).toBe(true);
    expect(event.__spies.preventDefault).toHaveBeenCalledTimes(1);
    expect(editor.__spies.chain).toHaveBeenCalledTimes(1);
    expect(editor.__spies.focus).toHaveBeenCalledTimes(1);
    expect(editor.__spies.insertContentViaChain).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
        text: "https://example.com/path",
      }),
    );
    expect(editor.__spies.run).toHaveBeenCalledTimes(1);
  });

  it("should set link mark when plain URL is pasted over selected text", () => {
    const editor = createEditorMock({ selectionEmpty: false });
    const event = createPasteEventMock("https://example.com/selected-target");

    const handled = handleSmartPaste(editor as any, event as any);

    expect(handled).toBe(true);
    expect(event.__spies.preventDefault).toHaveBeenCalledTimes(1);
    expect(editor.__spies.setLink).toHaveBeenCalledWith({
      href: "https://example.com/selected-target",
      target: "_blank",
    });
    expect(editor.__spies.insertContentViaChain).not.toHaveBeenCalled();
    expect(editor.__spies.setImage).not.toHaveBeenCalled();
  });

  it("should transform plain image URL to image node outside code context", () => {
    const editor = createEditorMock();
    const event = createPasteEventMock("https://example.com/demo-image.png?x=1");

    const handled = handleSmartPaste(editor as any, event as any);

    expect(handled).toBe(true);
    expect(event.__spies.preventDefault).toHaveBeenCalledTimes(1);
    expect(editor.__spies.setImage).toHaveBeenCalledWith({
      src: "https://example.com/demo-image.png?x=1",
    });
    expect(editor.__spies.insertContentViaChain).not.toHaveBeenCalled();
  });

  it("should sanitize dangerous HTML and insert cleaned content", () => {
    class FakeDOMParser {
      parseFromString(html: string) {
        const state = { html };
        const parseParagraph = () => {
          const match = state.html.match(/<p([^>]*)>([\s\S]*?)<\/p>/i);
          if (!match) return null;
          const rawAttrs = match[1] || "";
          const text = match[2] || "";
          const attrs: Record<string, string> = {};
          rawAttrs.replace(
            /(\w[\w-]*)="([^"]*)"/g,
            (_full, key: string, value: string) => {
              attrs[key] = value;
              return "";
            },
          );
          return { attrs, text };
        };
        const writeParagraph = (attrs: Record<string, string>, text: string) => {
          const attrText = Object.entries(attrs)
            .map(([key, value]) => ` ${key}="${value}"`)
            .join("");
          state.html = state.html.replace(
            /<p[^>]*>[\s\S]*?<\/p>/i,
            `<p${attrText}>${text}</p>`,
          );
        };

        const body = {
          get innerHTML() {
            return state.html;
          },
          set innerHTML(value: string) {
            state.html = value;
          },
        };

        const querySelectorAll = (selector: string) => {
          if (selector === "script") {
            if (!/<script[\s\S]*?<\/script>/i.test(state.html)) return [];
            return [
              {
                remove: () => {
                  state.html = state.html.replace(
                    /<script[\s\S]*?<\/script>/gi,
                    "",
                  );
                },
              },
            ];
          }

          if (selector === "[style]") {
            const paragraph = parseParagraph();
            if (!paragraph || !paragraph.attrs.style) return [];
            return [
              {
                getAttribute: (name: string) =>
                  name === "style" ? paragraph.attrs.style : null,
                setAttribute: (name: string, value: string) => {
                  if (name !== "style") return;
                  const current = parseParagraph();
                  if (!current) return;
                  current.attrs.style = value;
                  writeParagraph(current.attrs, current.text);
                },
                removeAttribute: (name: string) => {
                  const current = parseParagraph();
                  if (!current) return;
                  delete current.attrs[name];
                  writeParagraph(current.attrs, current.text);
                },
              },
            ];
          }

          if (selector === "[class]") {
            const paragraph = parseParagraph();
            if (!paragraph || !paragraph.attrs.class) return [];
            return [
              {
                removeAttribute: (name: string) => {
                  const current = parseParagraph();
                  if (!current) return;
                  delete current.attrs[name];
                  writeParagraph(current.attrs, current.text);
                },
              },
            ];
          }

          return [];
        };

        return {
          body,
          querySelectorAll,
        };
      }
    }

    vi.stubGlobal("DOMParser", FakeDOMParser as any);
    const editor = createEditorMock();
    const dirtyHtml =
      '<p class="x" style="font-size:16px;color:red;position:absolute">hello</p><script>alert(1)</script>';
    const event = createPasteEventMock("hello", dirtyHtml);

    const handled = handleSmartPaste(editor as any, event as any);

    expect(handled).toBe(true);
    expect(event.__spies.preventDefault).toHaveBeenCalledTimes(1);
    expect(editor.__spies.insertContentViaCommands).toHaveBeenCalledTimes(1);
    const inserted = editor.__spies.insertContentViaCommands.mock.calls[0][0] as string;
    expect(inserted).toMatch(
      /<p style="font-size:\s*16px;\s*color:\s*red">hello<\/p>/,
    );
    expect(inserted).not.toContain("script");
    expect(inserted).not.toContain("class=");
    expect(inserted).not.toContain("position:absolute");
    vi.unstubAllGlobals();
  });
});
