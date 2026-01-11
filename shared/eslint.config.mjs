import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['dist/', 'node_modules/'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off'
    }
  }
];
