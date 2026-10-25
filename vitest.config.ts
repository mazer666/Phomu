import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // The default environment stays 'node' so that the pure logic tests keep
    // the fast path. Component tests opt into the DOM per file with the
    // docblock `// @vitest-environment jsdom` (jsdom is a devDependency).
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // The denominator is the whole application source tree. It used to be
      // 'src/utils/**' only, which produced a figure for 12 of 93 source
      // files and left the store and the mode components out of the report
      // entirely (QA-TST-001, remediation backlog 1.7).
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // The tests themselves are not measured.
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        // Catalogue data, not application logic.
        'src/data/**',
        // Generated files: the type declarations and the locale catalogues
        // are produced by scripts, they carry no logic worth measuring.
        'src/i18n/types.ts',
        'src/i18n/locales/**',
        'src/i18n/variant-keys.ts',
      ],
      // Measured on 2026-10-25 with this denominator:
      //   statements 16.35 % | branches 12.66 % | functions 7.89 % | lines 16.99 %
      // The thresholds are the measured value minus two percentage points
      // (floored). They sit below the measured value on purpose: a gate that
      // is red on day one is a gate that gets disabled. The reserve absorbs
      // new, not yet covered code — at the time of the measurement about 400
      // further untested lines and 320 further untested functions — so that
      // ordinary development does not trip the gate. Ratchet the values up
      // whenever the coverage grows.
      thresholds: {
        statements: 14,
        branches: 10,
        functions: 6,
        lines: 15,
      },
    },
  },
  resolve: {
    // Alias as in tsconfig.json ("@/*" -> "./src/*"), so that the tests use
    // the same import paths as the application code.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
