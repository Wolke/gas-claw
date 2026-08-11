import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/index.ts'], bundle: true, outfile: 'dist/Code.js', format: 'iife', globalName: 'GasClawBundle', platform: 'neutral', target: 'es2020', footer: { js: 'Object.assign(globalThis, GasClawBundle.GasClaw);' } });
await cp('appsscript.json', 'dist/appsscript.json');
