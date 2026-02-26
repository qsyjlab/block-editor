import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@block-editor/editor/src/styles/index.css'
// import './styles/editor.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
