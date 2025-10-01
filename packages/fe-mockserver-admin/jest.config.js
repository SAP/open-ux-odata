const path = require('path');
module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
    reporters: [
        'default',
        [
            'jest-sonar',
            {
                reportedFilePath: 'relative',
                relativeRootDir: '<rootDir>/../../../'
            }
        ]
    ],
    transformIgnorePatterns: [`${path.join(__dirname, '../..')}/node_modules/.pnpm/(?!(@ui5\\+logger)@)`],
    coverageReporters: [['lcov', { projectRoot: '../../' }], 'text'],
    modulePathIgnorePatterns: [
        '<rootDir>/dist',
        '<rootDir>/test/test-output',
        '<rootDir>/templates',
        '<rootDir>/coverage'
    ]
};
