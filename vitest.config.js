
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'tests/**',
                '**/*.test.js',
                '**/*.spec.js',
                'test_*.js',
                'vitest.config.js',
                'eslint.config.js',
                'mcp_*.py',
                'server.py',
                'test_*.py',
                '**/*.html',
                '**/*.css'
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        },
        testTimeout: 10000,
        hookTimeout: 10000
    },
});
