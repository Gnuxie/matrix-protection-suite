module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        compiler: 'ttypescript',
      },
    ],
  },
  setupFiles: ['<rootDir>ts-auto-mock.config.ts'],
};
