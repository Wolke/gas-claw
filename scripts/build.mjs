import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const entrypoints = `
function doGet(e) { return GasClawBundle.GasClaw.doGet(e); }
function doPost(e) { return GasClawBundle.GasClaw.doPost(e); }
function schedulerTick() { return GasClawBundle.GasClaw.schedulerTick(); }
function setupGasClaw() { return GasClawBundle.GasClaw.setupGasClaw(); }
function configureGasClaw(config) { return GasClawBundle.GasClaw.configureGasClaw(config); }
function uninstallGasClaw() { return GasClawBundle.GasClaw.uninstallGasClaw(); }
`;
await build({ entryPoints: ['src/index.ts'], bundle: true, outfile: 'dist/Code.js', format: 'iife', globalName: 'GasClawBundle', platform: 'neutral', target: 'es2020', footer: { js: entrypoints } });
const profile=process.argv.includes('--profile=full')?'full':'core';
await cp(profile==='full'?'appsscript.full.json':'appsscript.json', 'dist/appsscript.json');
console.log(`Built ${profile} profile.`);
