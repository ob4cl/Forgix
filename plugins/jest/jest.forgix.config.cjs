module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tooling/jest/**/*.test.cjs'],
  collectCoverageFrom: ['tooling/jest/slugify.cjs'],
  coverageDirectory: 'coverage/jest',
};
