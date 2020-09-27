const path = require('path');

module.exports = {
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  // Don't mock in e2e tests.
  modulePathIgnorePatterns: ['<rootDir>/__mocks__'],
  preset: 'jest-playwright-preset',
  rootDir: path.resolve(__dirname, '../../'),
  testMatch: ['<rootDir>/e2e-tests/**/*.[jt]s?(x)'],
  testPathIgnorePatterns: ['__fixtures__', '.julienne-generate'],
  watchPathIgnorePatterns: ['.julienne-generate'],
};
