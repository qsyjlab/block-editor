import CodeBlock from '@tiptap/extension-code-block'
import { CodeBlockView } from './CodeBlockView'

export const CustomCodeBlock = CodeBlock.extend({
  addNodeView() {
    return (props) => {
        // @ts-ignore
        return new CodeBlockView(props.node, props.view, props.getPos, props.validations, props.editor) as any
    }
  },
})
