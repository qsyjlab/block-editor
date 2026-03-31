export interface CommentRange {
  from: number
  to: number
}

export interface SelectionSnapshot extends CommentRange {
  preview: string
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function buildSelectionSnapshot(
  range: CommentRange | null,
  selectedText: string,
  maxLen = 80,
): SelectionSnapshot | null {
  if (!range) return null
  const normalized = normalizeText(selectedText)
  if (!normalized) return null
  const preview = normalized.length > maxLen ? `${normalized.slice(0, maxLen)}...` : normalized
  return {
    from: range.from,
    to: range.to,
    preview,
  }
}

export function resolvePendingSelection(
  current: SelectionSnapshot | null,
  lastKnown: SelectionSnapshot | null,
): SelectionSnapshot | null {
  return current || lastKnown
}

export function buildCreateCommentDraft(args: {
  draftText: string
  currentRange: CommentRange | null
  pendingRange: CommentRange | null
  pendingPreview: string
}): {
  text: string
  range: CommentRange
  quoteText?: string
} | null {
  const text = args.draftText.trim()
  if (!text) return null

  const range = args.currentRange || args.pendingRange
  if (!range) return null

  return {
    text,
    range,
    quoteText: args.pendingPreview || undefined,
  }
}
