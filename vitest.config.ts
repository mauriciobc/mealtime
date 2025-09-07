import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/automated/**/*.test.ts', 'tests/automated/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        'coverage/',
        'prisma/',
        'scripts/',
        'app/layout.tsx',
        'app/providers.tsx',
        'middleware.ts'
      ]
    },
    globals: true,
    css: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
}) 