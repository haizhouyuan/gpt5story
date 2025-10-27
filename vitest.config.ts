import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.ts', 'apps/**/tests/**/*.test.ts'],
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@gpt5story/shared': resolve(__dirname, 'packages/shared/src'),
      '@gpt5story/workflow': resolve(__dirname, 'packages/workflow/src'),
    },
  },
});
