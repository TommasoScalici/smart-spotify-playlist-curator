import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['dist/', 'node_modules/']
  },
  {
    rules: {
      'no-console': 'off'
    }
  }
];
