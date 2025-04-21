import esbuild from 'esbuild';
import { execSync } from 'child_process';

const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  minify: false,
  target: ['es2020'],
  external: [], // add dependencies you want to exclude here
};

// Build ESM
esbuild.build({
  ...sharedConfig,
  format: 'esm',
  outfile: 'build/index.mjs',
});

// Build CJS
esbuild.build({
  ...sharedConfig,
  format: 'cjs',
  outfile: 'build/index.cjs',
});

// Emit TypeScript declaration files
execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' });