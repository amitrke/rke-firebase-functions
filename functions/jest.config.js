/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./setupTests.js'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
          },
          target: 'es2017',
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
};
