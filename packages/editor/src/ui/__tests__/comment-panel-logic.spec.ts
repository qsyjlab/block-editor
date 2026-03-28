import { describe, expect, it } from "vitest";
import {
  buildCreateCommentDraft,
  buildSelectionSnapshot,
  resolvePendingSelection,
} from "../comment-panel-logic";

describe("comment-panel-logic", () => {
  it("should build normalized selection snapshot for quote prefill", () => {
    const snapshot = buildSelectionSnapshot(
      { from: 3, to: 12 },
      "  hello\n   world  ",
    );
    expect(snapshot).toEqual({
      from: 3,
      to: 12,
      preview: "hello world",
    });
  });

  it("should truncate long preview text", () => {
    const source = "a".repeat(85);
    const snapshot = buildSelectionSnapshot({ from: 1, to: 86 }, source, 80);
    expect(snapshot?.preview).toBe(`${"a".repeat(80)}...`);
  });

  it("should resolve pending selection by preferring current selection", () => {
    const pending = resolvePendingSelection(
      { from: 10, to: 20, preview: "current" },
      { from: 1, to: 5, preview: "last" },
    );
    expect(pending).toEqual({ from: 10, to: 20, preview: "current" });
  });

  it("should fallback to last known selection when current is empty", () => {
    const pending = resolvePendingSelection(null, {
      from: 6,
      to: 18,
      preview: "cached",
    });
    expect(pending).toEqual({ from: 6, to: 18, preview: "cached" });
  });

  it("should require non-empty input before save confirmation", () => {
    const draft = buildCreateCommentDraft({
      draftText: "   ",
      currentRange: { from: 2, to: 8 },
      pendingRange: null,
      pendingPreview: "quote",
    });
    expect(draft).toBeNull();
  });

  it("should return null when no selectable range exists", () => {
    const draft = buildCreateCommentDraft({
      draftText: "comment body",
      currentRange: null,
      pendingRange: null,
      pendingPreview: "",
    });
    expect(draft).toBeNull();
  });

  it("should create draft payload with pending range and quote", () => {
    const draft = buildCreateCommentDraft({
      draftText: "  final text  ",
      currentRange: null,
      pendingRange: { from: 12, to: 22 },
      pendingPreview: "selected quote",
    });
    expect(draft).toEqual({
      text: "final text",
      range: { from: 12, to: 22 },
      quoteText: "selected quote",
    });
  });
});
