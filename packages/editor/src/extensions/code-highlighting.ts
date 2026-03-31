import { createLowlight } from 'lowlight'
import plaintext from 'highlight.js/lib/languages/plaintext'

type LanguageLoader = () => Promise<{ default: (...args: any[]) => any }>

export interface EnsureLanguageResult {
  language: string
  loadedNow: boolean
}

const lowlight = createLowlight()

const KNOWN_LANGUAGES = new Set([
  'plaintext',
  'javascript',
  'typescript',
  'html',
  'css',
  'json',
  'java',
  'python',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'sql',
  'shell',
  'yaml',
  'xml',
  'markdown',
])

const LANGUAGE_ALIAS: Record<string, string> = {
  text: 'plaintext',
  plain: 'plaintext',
  'plain text': 'plaintext',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  md: 'markdown',
  cxx: 'cpp',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
}

const LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  plaintext: async () => ({ default: plaintext }),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  html: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  json: () => import('highlight.js/lib/languages/json'),
  java: () => import('highlight.js/lib/languages/java'),
  python: () => import('highlight.js/lib/languages/python'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  swift: () => import('highlight.js/lib/languages/swift'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  sql: () => import('highlight.js/lib/languages/sql'),
  shell: () => import('highlight.js/lib/languages/bash'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  xml: () => import('highlight.js/lib/languages/xml'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
}

const loadedLanguages = new Set<string>(['plaintext'])
const loadingTasks = new Map<string, Promise<EnsureLanguageResult>>()

lowlight.register('plaintext', plaintext)

function normalizeLanguage(input?: string | null): string {
  if (!input) return 'plaintext'
  const raw = input.trim().toLowerCase()
  const mapped = LANGUAGE_ALIAS[raw] ?? raw
  if (KNOWN_LANGUAGES.has(mapped)) return mapped
  return 'plaintext'
}

export function getCodeLowlight() {
  return lowlight
}

export async function ensureCodeLanguageRegistered(
  languageInput?: string | null,
): Promise<EnsureLanguageResult> {
  const language = normalizeLanguage(languageInput)
  if (loadedLanguages.has(language)) {
    return { language, loadedNow: false }
  }

  const task = loadingTasks.get(language)
  if (task) return task

  const loader = LANGUAGE_LOADERS[language] ?? LANGUAGE_LOADERS.plaintext
  const loadTask = loader()
    .then((mod) => {
      lowlight.register(language, mod.default)
      loadedLanguages.add(language)
      return { language, loadedNow: true } as EnsureLanguageResult
    })
    .catch(() => ({ language: 'plaintext', loadedNow: false }))
    .finally(() => {
      loadingTasks.delete(language)
    })

  loadingTasks.set(language, loadTask)
  return loadTask
}
