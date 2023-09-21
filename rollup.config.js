/* eslint-disable @typescript-eslint/no-var-requires */
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const resolve = require('@rollup/plugin-node-resolve');
const external = require('rollup-plugin-peer-deps-external');
const postcss = require('rollup-plugin-postcss');
const sourceMaps = require('rollup-plugin-sourcemaps');
const { terser } = require('rollup-plugin-terser');
const typescript = require('rollup-plugin-typescript2');
const pkg = require('./package.json');
const del = require('rollup-plugin-delete');

module.exports = {
  input: `src/index.ts`,
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: 'inline',
      plugins: [terser()],
      exports: 'auto',
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: 'inline',
      plugins: [terser()],
      exports: 'auto',
    },
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: 'inline',
      exports: 'auto',
    },
  ],
  watch: {
    include: 'src/**',
  },
  plugins: [
    external(),
    postcss({
      modules: true,
    }),
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({
      useTsconfigDeclarationDir: true,
      exclude: ['**/__tests__/**', '*.spec.*', '*.test.*'],
      clean: true,
    }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    // Resolve source maps to the original source
    sourceMaps(),
    del({
      targets: 'dist/*',
      hook: 'buildStart',
    }),
    del({
      targets: ['dist/index.test.d.ts', 'dist/index.test.d.ts.map'],
      hook: 'writeBundle',
    }),
  ],
};
