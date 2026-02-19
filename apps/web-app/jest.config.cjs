const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@carbon-trading-platform/web-app',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../test-output/jest/coverage/web-app',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/app/layout.tsx',
    '!src/middleware.ts',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^next/navigation$': '<rootDir>/__mocks__/next-navigation.js',
    '^next/headers$': '<rootDir>/__mocks__/next-headers.js',
  },
  setupFilesAfterEnv: [],
  setupFiles: [],
  globals: {},
  testMatch: ['**/*.test.{ts,tsx}'],
};
