/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/e2e/',
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  collectCoverageFrom: [
    'src/lib/canvas/**/*.{ts,tsx}',
    '!src/lib/canvas/jaxCompiler.ts',
    '!src/lib/canvas/metricsHelper.ts',
    '!src/lib/canvas/onnxCompiler.ts',
    '!src/lib/canvas/tensorflowCompiler.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

module.exports = createJestConfig(config);
