import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import postcssLit from 'rollup-plugin-postcss-lit';
import terser from '@rollup/plugin-terser';

const dev = process.env.ROLLUP_WATCH;

export default {
  input: 'src/card.ts',
  output: {
    dir: 'dist',
    format: 'es',
    inlineDynamicImports: true,
    entryFileNames: 'calendar-week-grid-card.js',
  },
  context: 'window',
  watch: {
    include: 'src/**',
    clearScreen: false,
  },
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
    typescript({
      tsconfig: 'tsconfig.json',
    }),
    !dev && terser(),
  ].filter(Boolean),
};
