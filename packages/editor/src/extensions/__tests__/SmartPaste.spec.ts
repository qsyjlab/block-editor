import { describe, expect, it, vi } from "vitest";
import { handleSmartPaste, isInCodePasteContext } from "../SmartPaste";

function createEditorMock(options?: {
  codeBlockActive?: boolean;
  codeMarkActive?: boolean;
  parentIsCode?: boolean;
}) {
  const run = vi.fn();
  const insertContentViaChain = vi.fn(() => ({ run }));
  const focus = vi.fn(() => ({ insertContent: insertContentViaChain }));
  const chain = vi.fn(() => ({ focus }));
  const insertContentViaCommands = vi.fn();
  const isActive = vi.fn((name: string) => {
    if (name === "codeBlock") return Boolean(options?.codeBlockActive);
    if (name === "code") return Boolean(options?.codeMarkActive);
    return false;
  });

  return {
    state: {
      selection: {
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
    },
    __spies: {
      run,
      focus,
      chain,
      insertContentViaChain,
      insertContentViaCommands,
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
});

