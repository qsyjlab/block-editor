import { useEffect, useRef, useState } from 'react'
import { EditorCore, EditorUIRenderer, Exporter } from '@block-editor/editor'
// import '@block-editor/editor/dist/index.css'

interface CommentData {
  id: string
  content: string
  date: string
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorCore, setEditorCore] = useState<EditorCore | null>(null)
  
  useEffect(() => {
    if (!containerRef.current) return

    // Clean up any existing content in the container to prevent double rendering in StrictMode
    containerRef.current.innerHTML = ''

    // 1. Initialize Core
    const core = new EditorCore({
      element: document.createElement('div'), 
      content: '<p>Welcome to the <strong>Block Editor</strong>! Try selecting text to add a comment.</p>',
    })

    // 2. Initialize UI Renderer
    new EditorUIRenderer(core, containerRef.current)

    setEditorCore(core)

    return () => {
      core.destroy()
      // Cleanup DOM on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  return (
    <div className="layout" style={{ height: '100vh', width: '100vw' }} ref={containerRef}>
      {/* EditorUIRenderer will mount everything here */}
    </div>
  )
}

export default App
