import globals from 'globals';

export default [
    {
        languageOptions: {
            ecmaVersion: 12,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                visualizer: 'readonly', // Add visualizer as a global variable
            },
        },
        rules: {
            indent: ['error', 4],
            // Remove linebreak-style for cross-platform compatibility
            // 'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
        },
    },
];