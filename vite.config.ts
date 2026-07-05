import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages project site URL is /yinian/.
// Keep local dev at / by only applying the base during production builds.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/yinian/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
