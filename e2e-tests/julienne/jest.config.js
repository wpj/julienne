const path = require('path');

module.exports = {
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  // Don't mock in e2e tests.
  modulePathIgnorePatterns: ['<rootDir>/__mocks__'],
  preset: 'jest-playwright-preset',
  testPathIgnorePatterns: ['__fixtures__', 'src', '.julienne-generate'],
  watchPathIgnorePatterns: ['.julienne-generate'],
};
