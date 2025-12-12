import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import postcssLit from 'rollup-plugin-postcss-lit';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import copy from 'rollup-plugin-copy';

const dev = process.env.ROLLUP_WATCH;

const serverOptions = {
  contentBase: ['./dist'],
  host: 'localhost',
  port: 5000,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

export default {
  input: 'src/calendar-week-grid-card.ts',
  output: {
    dir: 'dist',
    format: 'es',
    inlineDynamicImports: true,
  },
  context: 'window',
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    postcss({
      extract: false,
      inject: false,
    }),
    postcssLit(),
    typescript(),
    copy({
      targets: [{ src: 'dev/index.html', dest: 'dist', rename: 'index.html' }],
      hook: 'writeBundle',
    }),
    dev && serve(serverOptions),
    !dev && terser(),
  ].filter(Boolean),
};
