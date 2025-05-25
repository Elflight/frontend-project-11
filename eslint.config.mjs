import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin-js'

export default [
  js.configs.recommended,
  {
    ignores: [
      'webpack.config.js',
    ],
    plugins: {
      '@stylistic/js': stylistic,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    rules: {
      'no-extra-semi': 'off',
      '@stylistic/js/semi': ['error', 'never'],
      '@stylistic/js/quotes': ['error', 'single'],
      '@stylistic/js/indent': ['error', 2],
    },
  },
]
