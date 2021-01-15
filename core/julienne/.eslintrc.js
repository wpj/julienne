module.exports = {
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '**/*.d.ts'],
  overrides: [
    {
      files: ['tests/**/*'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
  },
  root: true,
  rules: {
    '@typescript-eslint/no-namespace': [
      'error',
      {
        allowDeclarations: true,
      },
    ],
    '@typescript-eslint/no-unnecessary-condition': ['error'],
    'prefer-const': 'off',
  },
};
