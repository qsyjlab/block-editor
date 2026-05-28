/**
 * @deprecated 已废弃：表级「九宫格」handle 不再使用。
 * 整表块与标题/段落统一走 `block-handle` 的 .be-block-handle（T + 六点，锚在表格左上角）。
 * 保留本文件仅为避免旧 import 路径报错；请勿再在 EditorCore 中注册 TableHandle 扩展。
 */
import { Extension } from '@tiptap/core'

export const TableHandle = Extension.create({
  name: 'tableHandle',
  addProseMirrorPlugins() {
    return []
  },
})
