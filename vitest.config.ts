/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { suiteName: 'UI tests' }]
    ],
    outputFile: {
      junit: './test-report.junit.xml',
    },
    globals: true,
    coverage: {
      exclude: ['build/**', 'build.js', './src/index.ts', 'vitest.config.ts'],
      thresholds: {
        lines: 100,
        branches: 100,
        statements: 100,
        functions: 100,
      },
    },
  },
});
