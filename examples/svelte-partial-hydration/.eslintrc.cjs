module.exports = {
  extends: [
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': ['error'],
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'prefer-const': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
