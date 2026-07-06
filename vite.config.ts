import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages project site URL is /yinian/.
// Server deployment serves the app at / from the Node server.
export default defineConfig(({ command, mode }) => ({
  base: command === 'build' && mode !== 'server' ? '/yinian/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
