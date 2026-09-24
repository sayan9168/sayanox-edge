#!/usr/bin/env node
/**
 * Sayanox Edge — CLI entry point
 * Built by Sayan Mahata · Founder of Sayanox
 */
import { program } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { runOptimize, runImages, runCfRules } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json (works from both src layout and installed pkg)
let version = '1.0.0';
try {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  version = pkg.version;
} catch {
  /* keep default */
}

program
  .name('sayanox-edge')
  .description(
    chalk.bold('⚡ Sayanox Edge') +
      ' — ultra-fast static site optimizer & Cloudflare performance toolkit'
  )
  .version(version, '-v, --version', 'output the current version')
  .helpOption('-h, --help', 'display help for command');

program
  .command('optimize')
  .description(
    'Full pipeline: copy site → minify HTML/CSS/JS → optimize images → add _headers'
  )
  .argument('<input-folder>', 'path to your static site folder')
  .option('-o, --out <output-folder>', 'output folder (default: <input>-dist)')
  .option('--webp', 'also generate WebP versions of images', false)
  .option('-q, --quality <n>', 'image quality 1-100', '80')
  .option('--no-lazy', 'skip adding loading="lazy" to <img> tags')
  .option('--no-defer', 'skip adding defer to non-critical <script> tags')
  .option('--no-headers', 'skip generating the _headers file')
  .action(async (inputFolder, opts) => {
    try {
      await runOptimize(inputFolder, opts);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('images')
  .description('Compress all images in a folder (optionally convert to WebP)')
  .argument('<folder>', 'folder containing images')
  .option('--webp', 'convert images to WebP format', false)
  .option('-q, --quality <n>', 'image quality 1-100', '80')
  .option('-o, --out <output-folder>', 'output folder (default: in-place)')
  .action(async (folder, opts) => {
    try {
      await runImages(folder, opts);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('cf-rules')
  .description(
    'Scan a site and print Cloudflare dashboard recommendations (Rocket Loader, Brotli, Polish, TTL...)'
  )
  .argument('<folder>', 'path to your static site folder')
  .option('-e, --export <file.json>', 'also export suggested Page Rules as JSON')
  .action(async (folder, opts) => {
    try {
      await runCfRules(folder, opts);
    } catch (err) {
      handleError(err);
    }
  });

// Friendly default when no command given
program.action(() => {
  program.outputHelp();
});

function handleError(err) {
  console.error(chalk.red('\n✖ Error: ') + chalk.white(err.message || String(err)));
  process.exitCode = 1;
}

program.parseAsync(process.argv).catch(handleError);
