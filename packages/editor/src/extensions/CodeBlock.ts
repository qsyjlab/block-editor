import CodeBlock from '@tiptap/extension-code-block'
import { CodeBlockView } from './CodeBlockView'
import { resolveEditorI18n } from '../i18n'
import type { CodeBlockI18n } from '../i18n'

interface CustomCodeBlockOptions {
  i18n: CodeBlockI18n
}

const DEFAULT_CODE_BLOCK_I18N: CodeBlockI18n =
  resolveEditorI18n("en-US").codeBlock

export const CustomCodeBlock = CodeBlock.extend<CustomCodeBlockOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      i18n: DEFAULT_CODE_BLOCK_I18N,
    }
  },

  addNodeView() {
    return (props) => {
        // @ts-ignore
        return new CodeBlockView(
          props.node,
          props.view,
          props.getPos,
          (props as any).validations,
          props.editor,
          this.options.i18n,
        ) as any
    }
  },
})
