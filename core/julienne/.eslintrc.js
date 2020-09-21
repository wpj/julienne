module.exports = {
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '**/*.d.ts'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-namespace': [
      'error',
      {
        allowDeclarations: true,
      },
    ],
    'prefer-const': 'off',
  },
};
