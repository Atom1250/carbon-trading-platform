const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@carbon-trading-platform/ledger-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../test-output/jest/coverage/ledger-service',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@libs/logger$': '<rootDir>/../../libs/logger/src/index.ts',
    '^@libs/errors$': '<rootDir>/../../libs/errors/src/index.ts',
    '^@libs/config$': '<rootDir>/../../libs/config/src/index.ts',
    '^@libs/database$': '<rootDir>/../../libs/database/src/index.ts',
    '^@libs/common$': '<rootDir>/../../libs/common/src/index.ts',
  },
};
