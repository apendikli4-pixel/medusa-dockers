
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    testMatch: ['**/__tests__/**/*.spec.ts'],
    moduleNameMapper: {
        "^@medusajs/framework/utils$": "<rootDir>/src/modules/ayna/__tests__/__mocks__/medusa-utils.ts"
    },
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
            diagnostics: false,
            isolatedModules: true
        }
    }
};
