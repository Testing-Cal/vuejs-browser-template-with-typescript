import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const base = process.env.VITE_CONTEXT_PATH || '/';
console.log('base: ',base)
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
