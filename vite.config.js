import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Эта строчка нужна для правильной работы __dirname в ES-модулях
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Говорим Vite, что '@' означает путь к папке 'src'
      '@': path.resolve(__dirname, './src'),
    }
  }
})