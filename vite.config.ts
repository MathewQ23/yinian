import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages and server subpath deployment use /yinian/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/yinian/' : '/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:3010', '/uploads': 'http://127.0.0.1:3010' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
