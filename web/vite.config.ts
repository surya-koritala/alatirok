import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor'
          }
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('remark-math') || id.includes('rehype-katex') || id.includes('rehype-sanitize')) {
            return 'markdown'
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    proxy: { '/api': 'http://localhost:8090' },
  },
})
