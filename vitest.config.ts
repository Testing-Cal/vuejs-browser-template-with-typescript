import { defineConfig } from "vitest/config";
import Vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: true,
    environment: "jsdom",
    reporters: ['json', 'verbose', 'vitest-sonar-reporter'],
    outputFile: {
        json: 'my-json-report.json',
        'vitest-sonar-reporter': 'sonar-report.xml',
    },
    coverage: {
      reporter: ['text','lcov', 'json', 'html'],
        exclude: [
          'node_modules/**',
          'coverage',
          'public/**',
          '**/*{.,-}spec.ts',
          '**/vite.config.ts',
          '**/src/*.d.ts',
          '**/src/main.ts'
        ],
        include: ['src/**/*.{js,vue}'],
        extension: ['.ts', '.vue']
    }
  },
   root: ".", //Define the root,
  //  passWithNoTests: true
});