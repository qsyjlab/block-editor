export type UILayerKind = 'tooltip' | 'dropdown' | 'modal' | 'overlay'

const ROOT_ID = 'be-ui-layer-root'

function getThemeSource(source?: HTMLElement | null): HTMLElement | null {
  if (source) {
    const themed = source.closest('[data-be-theme]') as HTMLElement | null
    if (themed) return themed
  }
  return document.querySelector('[data-be-theme]') as HTMLElement | null
}

function ensureRoot(source?: HTMLElement | null): HTMLElement {
  let root = document.getElementById(ROOT_ID) as HTMLElement | null
  if (!root) {
    root = document.createElement('div')
    root.id = ROOT_ID
    root.dataset.beUiLayerRoot = 'true'
    document.body.appendChild(root)
  }
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.zIndex = '240000'
  root.style.pointerEvents = 'none'

  const themeSource = getThemeSource(source)
  if (themeSource?.dataset.beTheme) {
    root.dataset.beTheme = themeSource.dataset.beTheme
  } else {
    delete root.dataset.beTheme
  }

  return root
}

export function resolveUILayerHost(kind: UILayerKind, source?: HTMLElement | null): HTMLElement {
  const root = ensureRoot(source)
  const selector = `[data-be-layer-kind="${kind}"]`
  const layerZIndex: Record<UILayerKind, string> = {
    tooltip: '10',
    overlay: '20',
    dropdown: '40',
    modal: '80',
  }
  let group = root.querySelector(selector) as HTMLElement | null
  if (!group) {
    group = document.createElement('div')
    group.dataset.beLayerKind = kind
    root.appendChild(group)
  }
  group.style.position = 'absolute'
  group.style.inset = '0'
  group.style.zIndex = layerZIndex[kind]
  group.style.pointerEvents = 'none'
  return group
}
