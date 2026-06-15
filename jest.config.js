/** Jest config — ts-jest, Node env, in-memory MongoDB per the setup files. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/env.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/db.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // First run may download the in-memory mongod binary.
  testTimeout: 60000,
};
