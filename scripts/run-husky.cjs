#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const candidates = [
  path.join(__dirname, '..', 'node_modules', 'husky', 'bin.js'),
  path.join(__dirname, '..', 'node_modules', 'husky', 'husky'),
  path.join(process.cwd(), 'node_modules', 'husky', 'bin.js'),
  path.join(process.cwd(), 'node_modules', 'husky', 'husky'),
];

const huskyBin = candidates.find((file) => fs.existsSync(file));

if (!huskyBin) {
  console.log('Skipping husky prepare step because husky is not installed.');
  process.exit(0);
}

const isJsFile = huskyBin.endsWith('.js');
const command = isJsFile ? process.execPath : 'sh';
const args = isJsFile ? [huskyBin, ...process.argv.slice(2)] : [huskyBin, ...process.argv.slice(2)];
const result = spawnSync(command, args, { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
