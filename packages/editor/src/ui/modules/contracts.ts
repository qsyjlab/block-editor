import type { EditorCore } from "../../core/EditorCore";
import type { EditorI18n } from "../../i18n";
import type {
  EditorUILayoutSlots,
  EditorUIRenderer,
  EditorUIRendererOptions,
} from "../EditorUIRenderer";

export type EditorUIRegion =
  | "toolbar"
  | "editor"
  | "outline"
  | "comment"
  | "overlay";

export type EditorUIModuleId =
  | "toolbar"
  | "outline"
  | "commentPanel"
  | "tableBubbleMenu"
  | "blockMultiSelectBar";

export interface EditorUILayoutRegionConfig {
  visible?: boolean;
  width?: string | number;
  order?: number;
}

export interface EditorUILayoutSchema {
  regions?: Partial<Record<EditorUIRegion, EditorUILayoutRegionConfig>>;
  modules?: Partial<
    Record<
      EditorUIModuleId,
      {
        enabled?: boolean;
        region?: EditorUIRegion;
      }
    >
  >;
}

export interface EditorUIModuleMountContext {
  id: EditorUIModuleId;
  editorCore: EditorCore;
  renderer: EditorUIRenderer;
  slots: EditorUILayoutSlots;
  i18n: EditorI18n;
  options: EditorUIRendererOptions;
}

export interface EditorUIModuleInstance {
  update?: () => void;
  unmount?: () => void;
}

export interface EditorUIModuleDefinition {
  id: EditorUIModuleId;
  defaultRegion: EditorUIRegion;
  mount: (ctx: EditorUIModuleMountContext) => EditorUIModuleInstance | void;
}

