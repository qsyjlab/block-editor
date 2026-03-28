import { Extension, Editor } from "@tiptap/core";
import {
  BubbleMenuPlugin,
  BubbleMenuPluginProps,
} from "@tiptap/extension-bubble-menu";
import { NodeSelection, PluginKey } from "prosemirror-state";
import {
  ToolbarItemType,
} from "../ui/toolbar/ToolbarRegistry";
import {
  createToolbarItemElement,
  flattenToolbarGroups,
} from "../ui/toolbar/item-factory";
import { InsertLinkDialog } from "../ui/toolbar/dialogs/insert-link-dialog";
import {
  resolveToolbarGroups,
  resolveSelectionToolbarItems,
  type EditorUIConfig,
} from "../ui/config/operation-bars";
import type { EditorUIRegion } from "../ui/modules/contracts";
import type { EditorCore } from "../core/EditorCore";
import { resolveEditorI18n } from "../i18n";
import type { EditorI18n } from "../i18n";

type ToolbarMode = "top" | "inline";

function createTooltipItems(i18n: EditorI18n): ToolbarItemType[] {
  const t = i18n.toolbar;

  return [
    {
      type: "button",
      label: t.bold,
      icon: "bold",
      command: "toggleBold",
      activeName: "bold",
      shortcut: "⌘B",
    },
    {
      type: "button",
      label: t.italic,
      icon: "italic",
      command: "toggleItalic",
      activeName: "italic",
      shortcut: "⌘I",
    },
    {
      type: "button",
      label: t.underline,
      icon: "underline",
      command: "toggleUnderline",
      activeName: "underline",
      shortcut: "⌘U",
    },
    {
      type: "button",
      label: t.strike,
      icon: "strike",
      command: "toggleStrike",
      activeName: "strike",
      shortcut: "⇧⌘X",
    },
    {
      type: "button",
      label: t.code,
      icon: "code",
      command: "toggleCode",
      activeName: "code",
      shortcut: "⌘E",
    },
    {
      type: "button",
      label: t.highlight,
      icon: "highlighter",
      command: "toggleHighlight",
      activeName: "highlight",
      shortcut: "⇧⌘H",
    },
    {
      type: "button",
      label: t.indent,
      icon: "indent",
      command: "indent",
      shortcut: "⌘]",
    },
    {
      type: "button",
      label: t.outdent,
      icon: "outdent",
      command: "outdent",
      shortcut: "⌘[",
    },
    {
      type: "button",
      label: t.clearFormatting,
      icon: "clearFormatting",
      onExecute: (core: EditorCore) => {
        core.editor.chain().focus().unsetAllMarks().clearNodes().run();
      },
    },
    {
      type: "button",
      label: t.addComment,
      icon: "comment",
      command: "addComment",
      shortcut: "⌥⌘M",
      onExecute: (core: EditorCore) => {
        core.events.emit("openCommentPanel");
      },
    },
    {
      type: "button",
      label: t.insertLink,
      icon: "link",
      command: "setLink",
      activeName: "link",
      onExecute: (core: EditorCore) => {
        const { from, to } = core.editor.state.selection;
        const selectedText = core.editor.state.doc.textBetween(from, to, " ");
        const previousUrl = core.editor.getAttributes("link").href || "";
        const host = (core.editor.options.element as HTMLElement).closest(
          '[data-be-ui-root="true"]',
        ) as HTMLElement | null;

        new InsertLinkDialog(
          (url, linkText) => {
            const finalText = (linkText || selectedText || url).trim();

            if (!finalText) {
              core.editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .unsetLink()
                .run();
              return;
            }

            if (finalText !== selectedText) {
              core.editor
                .chain()
                .focus()
                .insertContentAt(
                  { from, to },
                  {
                    type: "text",
                    text: finalText,
                    marks: [{ type: "link", attrs: { href: url } }],
                  },
                )
                .run();
              return;
            }

            core.editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          },
          selectedText,
          previousUrl,
          i18n.dialogs.insertLink,
          host,
        ).show();
      },
    },
  ];
}

function getUIConfig(editor: Editor): EditorUIConfig | undefined {
  return ((editor.options as any).uiConfig || undefined) as EditorUIConfig | undefined;
}

function getToolbarMode(editor: Editor): ToolbarMode {
  const element = editor.options.element as HTMLElement | null;
  const mode = element?.dataset.beToolbarMode;
  return mode === "inline" ? "inline" : "top";
}

function isSelectionToolbarEnabled(editor: Editor): boolean {
  const element = editor.options.element as HTMLElement | null;
  return element?.dataset.beSelectionToolbarEnabled !== "false";
}

function resolveSelectionToolbarRegion(editor: Editor): EditorUIRegion {
  const element = editor.options.element as HTMLElement | null;
  const region = element?.dataset.beSelectionToolbarRegion || "overlay";
  const allowedRegions: EditorUIRegion[] = [
    "toolbar",
    "editor",
    "outline",
    "comment",
    "overlay",
  ];
  return allowedRegions.includes(region as EditorUIRegion)
    ? (region as EditorUIRegion)
    : "overlay";
}

function resolveSelectionToolbarAppendTarget(editor: Editor): HTMLElement {
  const editorRoot = editor.options.element as HTMLElement | null;
  if (!editorRoot) return document.body;

  const uiRoot = editorRoot.closest('[data-be-ui-root="true"]') as HTMLElement | null;
  const region = resolveSelectionToolbarRegion(editor);
  if (uiRoot) {
    const regionHost = uiRoot.querySelector(
      `[data-be-region="${region}"]`,
    ) as HTMLElement | null;
    if (regionHost) return regionHost;
  }

  const overlayHost =
    (editorRoot.closest('[data-be-overlay-container="true"]') as HTMLElement | null) ||
    uiRoot;
  return overlayHost || document.body;
}

function getMockCore(editor: Editor): EditorCore {
  return {
    editor,
    events: {
      on: (event: string, fn: any) => {
        const core = (editor as Editor & { __core?: EditorCore }).__core;
        if (core) {
          core.events.on(event, fn);
          return;
        }
        editor.on(event as any, fn);
      },
      off: (event: string, fn: any) => {
        const core = (editor as Editor & { __core?: EditorCore }).__core;
        if (core) {
          core.events.off(event, fn);
          return;
        }
        editor.off(event as any, fn);
      },
      emit: (event: string, ...args: any[]) => {
        const core = (editor as Editor & { __core?: EditorCore }).__core;
        core?.events.emit(event, ...args);
      },
    },
  } as unknown as EditorCore;
}

function getEditorCore(editor: Editor): EditorCore {
  const core = (editor as Editor & { __core?: EditorCore }).__core;
  return core || getMockCore(editor);
}

function createSelectionToolbarElement(editor: Editor) {
  const container = document.createElement("div");
  container.className = "be-selection-tooltip";
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-orientation", "horizontal");

  const core = getEditorCore(editor);
  const i18n = resolveEditorI18n(core.i18n);
  const uiConfig = getUIConfig(editor) || core.uiConfig;
  container.setAttribute("aria-label", i18n.toolbar.heading);

  const items = resolveSelectionToolbarItems(
    createTooltipItems(i18n),
    uiConfig?.selectionToolbar,
    i18n,
  );

  items.forEach((item) => {
    const element = createToolbarItemElement(item, core);
    if (element) container.appendChild(element);
  });

  return container;
}

function createInlineToolbarElement(editor: Editor) {
  const core = getEditorCore(editor);
  const i18n = resolveEditorI18n(core.i18n);
  const uiConfig = getUIConfig(editor) || core.uiConfig;

  const container = document.createElement("div");
  container.className = "be-selection-tooltip be-inline-toolbar";
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-label", i18n.toolbar.heading);
  container.setAttribute("aria-orientation", "horizontal");

  const groups = resolveToolbarGroups(i18n, uiConfig?.toolbar);
  const allItems: ToolbarItemType[] = flattenToolbarGroups(groups);

  allItems.forEach((item) => {
    const element = createToolbarItemElement(item, core);
    if (element) {
      container.appendChild(element);
    }
  });

  return container;
}

export const SelectionTooltip = Extension.create({
  name: "selectionTooltip",

  addProseMirrorPlugins() {
    const mode = getToolbarMode(this.editor);
    const element =
      mode === "inline"
        ? createInlineToolbarElement(this.editor)
        : createSelectionToolbarElement(this.editor);

    return [
      BubbleMenuPlugin({
        pluginKey: new PluginKey("selectionTooltip"),
        editor: this.editor,
        element,
        shouldShow: ({ editor, from, to }) => {
          if (!isSelectionToolbarEnabled(editor)) return false;
          const selection = editor.state.selection;
          const state = editor.storage.interactionState as
            | {
                mode?:
                  | "idle"
                  | "text-selection"
                  | "block-selection"
                  | "table-editing";
                blockMenuOpen?: boolean;
              }
            | undefined;

          if (from === to || !editor.isEditable || editor.state.selection.empty)
            return false;
          if (selection instanceof NodeSelection) return false;
          if (editor.isActive("image")) return false;
          if (editor.isActive("table")) return false;
          if (state?.blockMenuOpen) return false;
          if (
            state?.mode === "block-selection" ||
            state?.mode === "table-editing"
          )
            return false;

          if (state?.mode !== "text-selection") {
            editor.commands.setInteractionMode("text-selection");
          }

          return true;
        },
        tippyOptions: {
          duration: 100,
          offset: [0, 10],
          zIndex: 9999,
          arrow: false,
          theme: "be-selection-toolbar",
          maxWidth: "none",
          appendTo: () => resolveSelectionToolbarAppendTarget(this.editor),
        },
      } as BubbleMenuPluginProps),
    ];
  },
});
