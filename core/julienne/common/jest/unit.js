const path = require('path');

// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  rootDir: path.resolve(__dirname, '../../'),
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.[jt]s?(x)'],
  testPathIgnorePatterns: ['__fixtures__'],
};
