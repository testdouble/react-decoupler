module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/example'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
};
