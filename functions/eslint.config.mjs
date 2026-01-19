import rootConfig from '../eslint.config.mjs';
import prettier from 'eslint-config-prettier';

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
