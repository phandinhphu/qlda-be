module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
        '!src/config/**',
        '!**/node_modules/**',
    ],
    testMatch: ['**/tests/**/*.test.js'],
    testPathIgnorePatterns: [
        '/node_modules/',
        'TEMPLATE.test.js',
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testTimeout: 30000,
};