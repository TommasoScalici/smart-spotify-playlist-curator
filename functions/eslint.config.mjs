import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['lib/', 'node_modules/'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-var-requires': 'off' // if needed for CJS
    }
  }
];
