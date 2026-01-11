import rootConfig from '../eslint.config.mjs';

function filterConfig(config) {
  // Remove react plugins/rules if present in object
  // Since rootConfig is an array, we map over it.
  // Simplified: just import, and override rules.
  return config;
}

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
