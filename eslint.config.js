import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        visualizer: 'readonly', // Add visualizer as a global variable
      },
    },
    rules: {
      // Code style rules (now handled by Prettier)
      indent: 'off', // Handled by Prettier
      quotes: ['error', 'single'],
      semi: ['error', 'always'],

      // Code quality rules
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          vars: 'local',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Best practices
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-param-reassign': ['error', { props: false }],
      'no-return-assign': ['error', 'always'],
      'no-throw-literal': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',

      // Potential problems
      'array-callback-return': 'error',
      'no-await-in-loop': 'warn',
      'no-constant-binary-expression': 'error',
      'no-promise-executor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      'require-atomic-updates': 'error',
    },
  },
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
];
