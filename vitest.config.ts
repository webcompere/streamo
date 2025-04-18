/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      exclude: ['build/**', 'build.js', './src/index.ts', 'vitest.config.ts'],
      thresholds: {
        lines: 99,
        branches: 99,
        statements: 99,
        functions: 100,
      },
    },
  },
});
