import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import size from 'rollup-plugin-size';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

const PACKAGE_NAME = 'ReactDecoupler';
const FILE_BASE_NAME = 'react-decoupler';

const external = ['react', 'prop-types'];
const globals = {
  react: 'React',
  'prop-types': 'PropTypes',
};

const input = 'src/index.js';

export default [
  {
    input,
    output: {
      file: `dist/${FILE_BASE_NAME}.mjs`,
      format: 'es',
      sourcemap: true,
    },
    external,
    plugins: [
      replace({
        exclude: 'node_modules/**',
        'process.env.NODE_ENV': JSON.stringify('dev'),
      }),
      nodeResolve(),
      babel({ exclude: /node_modules/, babelHelpers: 'bundled' }),
      commonjs(),
    ],
  },
  {
    input,
    output: {
      file: `dist/${FILE_BASE_NAME}.min.mjs`,
      format: 'es',
      sourcemap: true,
    },
    external,
    plugins: [
      replace({
        exclude: 'node_modules/**',
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      nodeResolve(),
      babel({ exclude: /node_modules/, babelHelpers: 'bundled' }),
      commonjs(),
      terser(),
    ],
  },
  {
    input,
    output: {
      name: PACKAGE_NAME,
      file: `dist/${FILE_BASE_NAME}.development.js`,
      format: 'umd',
      sourcemap: true,
      globals,
    },
    external,
    plugins: [
      replace({
        exclude: 'node_modules/**',
        'process.env.NODE_ENV': JSON.stringify('dev'),
      }),
      nodeResolve(),
      babel({ exclude: /node_modules/, babelHelpers: 'bundled' }),
      commonjs(),
    ],
  },
  {
    input,
    output: {
      name: PACKAGE_NAME,
      file: `dist/${FILE_BASE_NAME}.production.min.js`,
      format: 'umd',
      sourcemap: true,
      globals,
    },
    external,
    plugins: [
      replace({
        exclude: 'node_modules/**',
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      nodeResolve(),
      babel({ exclude: /node_modules/, babelHelpers: 'bundled' }),
      commonjs(),
      terser(),
      size(),
    ],
  },
];
