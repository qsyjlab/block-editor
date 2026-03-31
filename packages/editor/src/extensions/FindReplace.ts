import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export interface FindMatchRange {
  from: number
  to: number
}

export interface FindReplaceStorage {
  query: string
  replaceText: string
  matches: FindMatchRange[]
  activeIndex: number
  panelOpen: boolean
  replaceMode: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      setFindReplaceState: (patch: Partial<FindReplaceStorage>) => ReturnType
      clearFindReplace: () => ReturnType
      openFindReplace: (replaceMode?: boolean) => ReturnType
      closeFindReplace: () => ReturnType
    }
  }
}

const findReplacePluginKey = new PluginKey('findReplaceHighlight')

export const FindReplace = Extension.create<{}, FindReplaceStorage>({
  name: 'findReplace',

  addStorage() {
    return {
      query: '',
      replaceText: '',
      matches: [],
      activeIndex: -1,
      panelOpen: false,
      replaceMode: false,
    }
  },

  addCommands() {
    return {
      setFindReplaceState:
        (patch) =>
        ({ editor }) => {
          const storage = editor.storage.findReplace as FindReplaceStorage
          const next: FindReplaceStorage = {
            ...storage,
            ...patch,
          }
          const unchanged =
            storage.query === next.query &&
            storage.replaceText === next.replaceText &&
            storage.activeIndex === next.activeIndex &&
            storage.panelOpen === next.panelOpen &&
            storage.replaceMode === next.replaceMode &&
            storage.matches.length === next.matches.length &&
            storage.matches.every(
              (m, i) => m.from === next.matches[i]?.from && m.to === next.matches[i]?.to,
            )
          if (unchanged) return true
          Object.assign(storage, next)
          editor.view.dispatch(editor.state.tr.setMeta('findReplaceUpdate', Date.now()))
          return true
        },

      clearFindReplace:
        () =>
        ({ editor }) => {
          const storage = editor.storage.findReplace as FindReplaceStorage
          Object.assign(storage, {
            query: '',
            replaceText: '',
            matches: [],
            activeIndex: -1,
          })
          editor.view.dispatch(editor.state.tr.setMeta('findReplaceUpdate', Date.now()))
          return true
        },

      openFindReplace:
        (replaceMode = false) =>
        ({ editor }) => {
          const storage = editor.storage.findReplace as FindReplaceStorage
          storage.panelOpen = true
          storage.replaceMode = replaceMode || storage.replaceMode
          editor.view.dispatch(editor.state.tr.setMeta('findReplaceUpdate', Date.now()))
          return true
        },

      closeFindReplace:
        () =>
        ({ editor }) => {
          const storage = editor.storage.findReplace as FindReplaceStorage
          storage.panelOpen = false
          editor.view.dispatch(editor.state.tr.setMeta('findReplaceUpdate', Date.now()))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage as FindReplaceStorage
    return [
      new Plugin({
        key: findReplacePluginKey,
        props: {
          decorations: () => {
            if (!storage.query || storage.matches.length === 0) return null
            const decos = storage.matches.map((match, index) =>
              Decoration.inline(match.from, match.to, {
                class:
                  index === storage.activeIndex
                    ? 'be-find-match be-find-match-active'
                    : 'be-find-match',
              }),
            )
            return DecorationSet.create(this.editor.state.doc, decos)
          },
        },
      }),
    ]
  },
})
