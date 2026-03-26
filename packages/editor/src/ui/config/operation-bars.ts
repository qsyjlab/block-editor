import { resolveEditorI18n } from "../../i18n";
import type { EditorI18n } from "../../i18n";
import type {
  DropdownOptionConfig,
  ToolbarItemType,
} from "../toolbar/ToolbarRegistry";
import { buildDefaultToolbarItems } from "../toolbar/defaultToolbarItems";

export type ToolbarPreset = "full" | "basic" | "minimal";

export interface ToolbarItemOverride {
  label?: string;
  labelI18nKey?: string;
  tooltip?: string;
  icon?: string;
  hidden?: boolean;
}

export interface ToolbarConfig {
  preset?: ToolbarPreset;
  groups?: ToolbarItemType[][];
  hiddenCommands?: string[];
  hiddenItems?: string[];
  itemOrder?: string[];
  labelOverrides?: Record<string, string>;
  i18nLabelOverrides?: Record<string, string>;
  itemOverrides?: Record<string, ToolbarItemOverride>;
}

export interface SelectionToolbarConfig {
  items?: ToolbarItemType[];
  hiddenCommands?: string[];
  hiddenItems?: string[];
  itemOrder?: string[];
  labelOverrides?: Record<string, string>;
  i18nLabelOverrides?: Record<string, string>;
  itemOverrides?: Record<string, ToolbarItemOverride>;
}

export interface EditorUIConfig {
  toolbar?: ToolbarConfig;
  selectionToolbar?: SelectionToolbarConfig;
}

function buildBasicToolbarItems(i18nInput?: string | Partial<EditorI18n> | null) {
  const groups = buildDefaultToolbarItems(i18nInput);
  return groups.slice(0, 5);
}

function buildMinimalToolbarItems(i18nInput?: string | Partial<EditorI18n> | null) {
  const i18n = resolveEditorI18n(i18nInput);
  const t = i18n.toolbar;
  return [
    [
      { type: "button", label: t.undo, icon: "undo", command: "undo", shortcut: "⌘Z" },
      { type: "button", label: t.redo, icon: "redo", command: "redo", shortcut: "⇧⌘Z" },
    ],
    [
      { type: "button", label: t.bold, icon: "bold", command: "toggleBold", activeName: "bold", shortcut: "⌘B" },
      { type: "button", label: t.italic, icon: "italic", command: "toggleItalic", activeName: "italic", shortcut: "⌘I" },
      { type: "button", label: t.underline, icon: "underline", command: "toggleUnderline", activeName: "underline", shortcut: "⌘U" },
      { type: "button", label: t.insertLink, icon: "link", command: "setLink" },
    ],
  ] as ToolbarItemType[][];
}

export function resolveToolbarGroups(
  i18nInput?: string | Partial<EditorI18n> | null,
  config?: ToolbarConfig,
): ToolbarItemType[][] {
  const i18n = resolveEditorI18n(i18nInput);
  const baseGroups = config?.groups?.length
    ? config.groups
    : (() => {
        const preset = config?.preset || "full";
        if (preset === "minimal") return buildMinimalToolbarItems(i18nInput);
        if (preset === "basic") return buildBasicToolbarItems(i18nInput);
        return buildDefaultToolbarItems(i18nInput);
      })();

  return patchGroups(baseGroups, {
    i18n,
    hiddenCommands: config?.hiddenCommands || [],
    hiddenItems: config?.hiddenItems || [],
    itemOrder: config?.itemOrder || [],
    labelOverrides: config?.labelOverrides || {},
    i18nLabelOverrides: config?.i18nLabelOverrides || {},
    itemOverrides: config?.itemOverrides || {},
  });
}

export function resolveSelectionToolbarItems(
  defaults: ToolbarItemType[],
  config?: SelectionToolbarConfig,
  i18nInput?: string | Partial<EditorI18n> | null,
): ToolbarItemType[] {
  const i18n = resolveEditorI18n(i18nInput);
  const baseItems = config?.items?.length ? config.items : defaults;
  const groups = patchGroups([baseItems], {
    i18n,
    hiddenCommands: config?.hiddenCommands || [],
    hiddenItems: config?.hiddenItems || [],
    itemOrder: config?.itemOrder || [],
    labelOverrides: config?.labelOverrides || {},
    i18nLabelOverrides: config?.i18nLabelOverrides || {},
    itemOverrides: config?.itemOverrides || {},
  });
  return groups[0] || [];
}

interface PatchContext {
  i18n: EditorI18n;
  hiddenCommands: string[];
  hiddenItems: string[];
  itemOrder: string[];
  labelOverrides: Record<string, string>;
  i18nLabelOverrides: Record<string, string>;
  itemOverrides: Record<string, ToolbarItemOverride>;
}

function patchGroups(
  groups: ToolbarItemType[][],
  ctx: PatchContext,
): ToolbarItemType[][] {
  const hiddenCommands = new Set(ctx.hiddenCommands);
  const hiddenItems = new Set(ctx.hiddenItems);
  const patched = groups
    .map((group) =>
      group
        .map((item) => patchItem(item, hiddenCommands, hiddenItems, ctx))
        .filter(Boolean) as ToolbarItemType[],
    )
    .filter((group) => group.length > 0);

  return patched.map((group) => reorderGroup(group, ctx.itemOrder));
}

function reorderGroup(
  group: ToolbarItemType[],
  itemOrder: string[],
): ToolbarItemType[] {
  if (!itemOrder.length) return group;
  const orderMap = new Map(itemOrder.map((id, index) => [id, index]));
  return [...group].sort((a, b) => {
    const rankA = getItemOrderRank(a, orderMap);
    const rankB = getItemOrderRank(b, orderMap);
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });
}

function getItemOrderRank(
  item: ToolbarItemType,
  orderMap: Map<string, number>,
): number {
  if (item.type === "divider") return Number.MAX_SAFE_INTEGER;
  for (const key of getItemKeys(item)) {
    const rank = orderMap.get(key);
    if (typeof rank === "number") return rank;
  }
  return Number.MAX_SAFE_INTEGER;
}

function patchOption(
  option: DropdownOptionConfig,
  hiddenCommands: Set<string>,
  hiddenItems: Set<string>,
  ctx: PatchContext,
): DropdownOptionConfig | null {
  const keys = getOptionKeys(option);
  if (option.command && hiddenCommands.has(option.command)) return null;
  if (keys.some((key) => hiddenItems.has(key))) return null;

  const next = { ...option };
  const override = getOverride(keys, ctx);
  const i18nLabel = getOverrideI18nLabel(keys, ctx);
  const commandLabel = option.command ? ctx.labelOverrides[option.command] : "";
  next.label = override?.label || commandLabel || i18nLabel || option.label;
  next.tooltip = override?.tooltip || option.tooltip;
  if (override?.icon) next.icon = override.icon;
  if (override?.hidden) return null;
  return next;
}

function getOverrideI18nLabel(keys: string[], ctx: PatchContext): string {
  for (const key of keys) {
    const i18nKey = ctx.i18nLabelOverrides[key] || ctx.itemOverrides[key]?.labelI18nKey;
    if (!i18nKey) continue;
    const text = resolveTextByPath(ctx.i18n, i18nKey);
    if (typeof text === "string" && text.trim()) return text;
  }
  return "";
}

function getOverride(
  keys: string[],
  ctx: PatchContext,
): ToolbarItemOverride | null {
  for (const key of keys) {
    if (ctx.itemOverrides[key]) return ctx.itemOverrides[key];
  }
  return null;
}

function getItemKeys(item: ToolbarItemType): string[] {
  if (item.type === "divider") return [];
  const keys = [item.id];
  if (item.type === "button" || item.type === "color") {
    keys.push(item.command, item.label);
  } else if (item.type === "dropdown") {
    keys.push(item.label);
  }
  return keys.filter(Boolean) as string[];
}

function getOptionKeys(option: DropdownOptionConfig): string[] {
  return [option.id, option.command, option.value, option.label].filter(Boolean) as string[];
}

function resolveTextByPath(source: Record<string, any>, path: string): string | undefined {
  return path.split(".").reduce<any>((acc, key) => (acc ? acc[key] : undefined), source);
}

function shouldHideItem(
  item: ToolbarItemType,
  hiddenCommands: Set<string>,
  hiddenItems: Set<string>,
  ctx: PatchContext,
): boolean {
  if (item.type === "divider") return false;
  if ((item.type === "button" || item.type === "color") && item.command && hiddenCommands.has(item.command)) {
    return true;
  }
  const keys = getItemKeys(item);
  if (keys.some((key) => hiddenItems.has(key))) return true;
  const override = getOverride(keys, ctx);
  return Boolean(override?.hidden);
}

function patchItemLabelAndMeta(item: ToolbarItemType, ctx: PatchContext) {
  if (item.type === "divider") return;
  const keys = getItemKeys(item);
  const override = getOverride(keys, ctx);
  const i18nLabel = getOverrideI18nLabel(keys, ctx);
  const commandLabel =
    (item.type === "button" || item.type === "color") && item.command
      ? ctx.labelOverrides[item.command]
      : "";

  const label = override?.label || commandLabel || i18nLabel;
  if (label) item.label = label;

  if (override?.tooltip) {
    item.tooltip = override.tooltip;
  }
  if (override?.icon && (item.type === "button" || item.type === "dropdown")) {
    item.icon = override.icon;
  }
}

function patchItem(
  item: ToolbarItemType,
  hiddenCommands: Set<string>,
  hiddenItems: Set<string>,
  ctx: PatchContext,
): ToolbarItemType | null {
  if (item.type === "divider") return item;
  if (shouldHideItem(item, hiddenCommands, hiddenItems, ctx)) return null;
  const next = { ...item };
  patchItemLabelAndMeta(next, ctx);

  if (next.type === "dropdown") {
    const keys = getItemKeys(next);
    next.options = next.options
      .map((opt) => patchOption(opt, hiddenCommands, hiddenItems, ctx))
      .filter(Boolean) as typeof next.options;
    if (next.options.length === 0) return null;

    const itemLabelOverride =
      ctx.labelOverrides[next.label] || getOverrideI18nLabel(keys, ctx);
    if (!next.label && itemLabelOverride) {
      next.label = itemLabelOverride;
    }
  }

  return next;
}
