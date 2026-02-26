import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@block-editor/editor/dist/index.css': path.resolve(__dirname, '../../packages/editor/dist/index.css'),
      '@block-editor/editor/src/styles/index.css': path.resolve(__dirname, '../../packages/editor/src/styles/index.css'),
      '@block-editor/editor': path.resolve(__dirname, '../../packages/editor/src/index.ts'),
    },
  },
})
