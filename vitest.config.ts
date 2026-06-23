import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/__tests__/**/*.test.ts"],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/index.ts', 'node_modules', 'dist', '.next', '.wrangler'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
