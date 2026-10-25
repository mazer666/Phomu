import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.ts'],
    },
  },
  resolve: {
    // Alias wie in tsconfig.json ("@/*" -> "./src/*"), damit Tests
    // dieselben Import-Pfade nutzen koennen wie der App-Code.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
