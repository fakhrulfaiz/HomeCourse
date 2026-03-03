/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Sets env vars before ANY module is imported so PrismaClient picks up the test DB URL
  setupFiles: ['<rootDir>/src/__tests__/setEnv.ts'],

  // Per-suite helpers: DB cleanup between tests + disconnect after suite
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Only run files inside __tests__ that end with .test.ts
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',                          // server entry — bootstraps/listens, not unit-testable
    '!src/services/videoScanner.service.ts',  // filesystem + ffmpeg; requires real disk/process mocks
    '!src/routes/video.routes.ts',            // byte-range streaming; requires real video files on disk
    '!src/__tests__/**',
    '!src/**/*.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches:   80,
      functions:  80,
      lines:      80,
      statements: 80,
    },
  },

  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  // Skip ts-jest type-checking for speed (tsc still validates types on build)
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
};
