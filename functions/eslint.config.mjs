import prettier from 'eslint-config-prettier';

import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['lib/', 'node_modules/'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  prettier
];
