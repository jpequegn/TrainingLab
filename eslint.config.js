import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import complexity from 'eslint-plugin-complexity';

export default [
  {
    plugins: {
      complexity,
    },
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

      // Complexity and maintainability rules
      complexity: ['warn', { max: 15 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines': [
        'warn',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'warn',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['warn', { max: 3 }],
      'max-params': ['warn', { max: 5 }],
      'max-statements': ['warn', { max: 20 }],
      'max-statements-per-line': ['error', { max: 1 }],

      // Code quality and maintainability
      'no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 1, 2, 100, 1000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          detectObjects: false,
        },
      ],
      'no-nested-ternary': 'warn',
      'prefer-object-spread': 'error',
      'prefer-destructuring': [
        'warn',
        {
          array: false,
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
    },
  },
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
];
