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
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-console': 'warn',
        },
    },
];