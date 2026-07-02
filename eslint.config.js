import eslintConfigPrettier from 'eslint-config-prettier'
import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const ecma = { ecmaVersion: 'latest', sourceType: 'module' }
const browserGlobals = { ...globals.browser }

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'scripts/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ...ecma,
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ...ecma,
      },
      globals: browserGlobals,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-empty': 'warn',
      'vue/no-mutating-props': 'warn',
      'vue/valid-define-props': 'warn',
      'vue/no-v-html': 'warn',
      'vue/attributes-order': 'off',
      'vue/no-lone-template': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/v-slot-style': 'off',
    },
  },
  {
    files: ['src/**/*.test.js'],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  eslintConfigPrettier,
]
