/**
 * Sayanox Edge — main pipeline logic
 * Orchestrates optimize / images / cf-rules commands.
 */
import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

import {
  walkFiles,
  ensureFolder,
  isHtml,
  isCss,
  isJs,
  isImage,
  formatBytes,
  savingsPercent,
  parseQuality,
  resolveOutDir,
  assertDistinctDirs,
  startTimer,
  formatMs,
} from './utils.js';

import { minifyHtmlCode, minifyCssCode, minifyJsCode } from './minify.js';
import { optimizeImage, isOptimizableImage } from './image.js';
import { buildHeadersFile } from './cache.js';
import { scanSite, buildRecommendations, buildPageRules } from './cloudflare.js';

const banner = () =>
  chalk.cyan.bold('\n⚡ Sayanox Edge') +
  chalk.gray(' v1.0 · by Sayan Mahata (Founder of Sayanox)\n');

/* ------------------------------------------------------------------ */
/* optimize                                                            */
/* ------------------------------------------------------------------ */
export async function runOptimize(inputFolder, opts = {}) {
  const timer = startTimer();
  console.log(banner());

  await ensureFolder(inputFolder, 'Input folder');
  const outDir = resolveOutDir(inputFolder, opts.out);
  assertDistinctDirs(inputFolder, outDir);

  const quality = parseQuality(opts.quality ?? '80');
  const lazy = opts.lazy !== false;
  const defer = opts.defer !== false;
  const webp = Boolean(opts.webp);
  const headers = opts.headers !== false;

  // Fresh output dir
  await fs.remove(outDir);
  await fs.ensureDir(outDir);

  const files = await walkFiles(path.resolve(inputFolder));
  const spinner = ora({ text: 'Processing site…', color: 'cyan' }).start();

  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let copied = 0;
  let imagesOptimized = 0;
  let webpGenerated = 0;
  let warnings = 0;

  const rows = []; // per-file before/after for the table

  try {
    for (const file of files) {
      const rel = path.relative(path.resolve(inputFolder), file);
      const dest = path.join(outDir, rel);
      await fs.ensureDir(path.dirname(dest));

      const before = (await fs.stat(file)).size;
      let after = before;
      let action = 'copy';

      try {
        if (isHtml(file)) {
          const code = await fs.readFile(file, 'utf8');
          const min = await minifyHtmlCode(code, { lazy, defer });
          await fs.writeFile(dest, min, 'utf8');
          after = Buffer.byteLength(min, 'utf8');
          action = 'html';
          processed++;
        } else if (isCss(file)) {
          const code = await fs.readFile(file, 'utf8');
          const min = await minifyCssCode(code);
          await fs.writeFile(dest, min, 'utf8');
          after = Buffer.byteLength(min, 'utf8');
          action = 'css';
          processed++;
        } else if (isJs(file)) {
          const code = await fs.readFile(file, 'utf8');
          let min;
          try {
            min = await minifyJsCode(code);
          } catch (err) {
            warnings++;
            min = code; // keep original on soft failure
          }
          await fs.writeFile(dest, min, 'utf8');
          after = Buffer.byteLength(min, 'utf8');
          action = 'js';
          processed++;
        } else if (isImage(file)) {
          if (isOptimizableImage(file)) {
            const r = await optimizeImage(file, dest, { quality, webp });
            after = r.after;
            if (r.webpBytes > 0) {
              webpGenerated++;
              totalAfter += r.webpBytes; // count webp sibling as extra payload saved elsewhere
            }
            imagesOptimized++;
            action = 'img';
          } else {
            await fs.copy(file, dest, { overwrite: true });
            action = 'svg/gif';
          }
          copied++;
        } else {
          await fs.copy(file, dest, { overwrite: true });
          copied++;
        }
      } catch (err) {
        warnings++;
        // Fall back to plain copy so the output is always deployable
        if (!(await fs.pathExists(dest))) {
          await fs.copy(file, dest, { overwrite: true });
        }
      }

      totalBefore += before;
      totalAfter += after;
      if (action !== 'copy') rows.push({ rel, action, before, after });
      spinner.text = `Processed ${rel}`;
    }

    // Generate _headers file
    if (headers) {
      await fs.writeFile(path.join(outDir, '_headers'), buildHeadersFile(), 'utf8');
    }

    spinner.succeed(chalk.green('Optimization complete!'));

    /* ---------------- report ---------------- */
    printTable(rows);

    const saved = totalBefore - totalAfter;
    const pct = savingsPercent(totalBefore, totalAfter);
    const timeMs = timer();

    console.log(
      [
        '',
        chalk.bold('📦 Summary'),
        `${chalk.gray('input :')} ${path.resolve(inputFolder)}`,
        `${chalk.gray('output:')} ${chalk.magenta(path.resolve(outDir))}`,
        `${chalk.gray('files optimized :')} ${chalk.white(String(processed + imagesOptimized))} (text: ${processed}, images: ${imagesOptimized}${webp ? `, +${webpGenerated} WebP` : ''})`,
        `${chalk.gray('other files copied:')} ${copied}`,
        `${chalk.gray('total size :')} ${formatBytes(totalBefore)} ${chalk.gray('→')} ${formatBytes(totalAfter)}`,
        `${chalk.gray('saved      :')} ${(pct >= 0 ? chalk.green : chalk.yellow)(
          `${formatBytes(Math.abs(saved))} (${pct.toFixed(1)}%)`
        )}`,
        `${chalk.gray('time       :')} ${formatMs(timeMs)}`,
        headers ? `${chalk.gray('_headers   :')} ${chalk.green('written ✓')} (Cloudflare Pages / Netlify)` : `${chalk.gray('_headers   :')} skipped (--no-headers)`,
        '',
      ].join('\n')
    );

    if (warnings > 0) {
      console.log(chalk.yellow(`⚠ ${warnings} file(s) could not be optimized and were copied as-is.`));
    }

    console.log(chalk.dim('Next: sayanox-edge cf-rules ') + chalk.dim(outDir));
  } catch (err) {
    spinner.fail(chalk.red('Optimization failed.'));
    throw err;
  }
}

function printTable(rows) {
  if (!rows.length) return;
  console.log('');
  console.log(chalk.bold('  File'.padEnd(42) + 'Type'.padEnd(7) + 'Before'.padStart(10) + 'After'.padStart(11) + 'Saved'.padStart(9)));
  console.log(chalk.gray('  ' + '-'.repeat(79)));
  for (const r of rows.slice(0, 30)) {
    const pct = savingsPercent(r.before, r.after);
    const name = r.rel.length > 40 ? r.rel.slice(0, 37) + '…' : r.rel;
    console.log(
      '  ' +
        name.padEnd(42) +
        r.action.padEnd(7) +
        formatBytes(r.before).padStart(10) +
        formatBytes(r.after).padStart(11) +
      (pct >= 20 ? chalk.green : pct > 0 ? chalk.yellow : chalk.red)(
          ` ${(pct >= 0 ? '-' : '+')}${Math.abs(pct).toFixed(0)}%`.padStart(9)
        )
    );
  }
  if (rows.length > 30) {
    console.log(chalk.gray(`  … and ${rows.length - 30} more files`));
  }
}

/* ------------------------------------------------------------------ */
/* images                                                              */
/* ------------------------------------------------------------------ */
export async function runImages(folder, opts = {}) {
  const timer = startTimer();
  console.log(banner());

  await ensureFolder(folder, 'Folder');
  const quality = parseQuality(opts.quality ?? '80');
  const webp = Boolean(opts.webp);
  const outDir = opts.out ? path.resolve(opts.out) : null;

  if (outDir) assertDistinctDirs(folder, outDir);
  if (outDir) {
    await fs.remove(outDir);
    await fs.ensureDir(outDir);
  }

  const allFiles = await walkFiles(path.resolve(folder));
  const images = allFiles.filter(isImage);

  if (!images.length) {
    console.log(chalk.yellow('No images found in this folder.'));
    return;
  }

  const spinner = ora({ text: `Optimizing ${images.length} image(s)…`, color: 'cyan' }).start();

  let totalBefore = 0;
  let totalAfter = 0;
  let webpCount = 0;
  let failures = 0;

  for (const img of images) {
    const rel = path.relative(path.resolve(folder), img);
    const dest = outDir ? path.join(outDir, rel) : img;
    if (outDir) await fs.ensureDir(path.dirname(dest));

    try {
      const before = (await fs.stat(img)).size;
      const r = await optimizeImage(img, dest, { quality, webp });
      totalBefore += r.before;
      totalAfter += r.after;
      if (r.webpBytes > 0) webpCount++;
      spinner.text = `✔ ${rel} (${formatBytes(before)} → ${formatBytes(r.after)})`;
    } catch {
      failures++;
    }
  }

  spinner.succeed(chalk.green(`Done — ${images.length - failures}/${images.length} images optimized.`));

  const saved = totalBefore - totalAfter;
  const pct = savingsPercent(totalBefore, totalAfter);
  console.log(
    [
      `${chalk.gray('total  :')} ${formatBytes(totalBefore)} ${chalk.gray('→')} ${formatBytes(totalAfter)}`,
      `${chalk.gray('saved  :')} ${chalk.green(`${formatBytes(Math.max(saved, 0))} (${pct.toFixed(1)}%)`)}`,
      webp ? `${chalk.gray('webp   :')} ${webpCount} WebP file(s) generated` : '',
      outDir ? `${chalk.gray('output :')} ${chalk.magenta(outDir)}` : `${chalk.gray('mode   :')} in-place`,
      failures ? chalk.yellow(`⚠ ${failures} image(s) failed and were left untouched.`) : '',
      `${chalk.gray('time   :')} ${formatMs(timer())}`,
      '',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

/* ------------------------------------------------------------------ */
/* cf-rules                                                            */
/* ------------------------------------------------------------------ */
export async function runCfRules(folder, opts = {}) {
  console.log(banner());
  await ensureFolder(folder, 'Folder');

  const spinner = ora({ text: 'Scanning site for Cloudflare signals…', color: 'cyan' }).start();
  const scan = await scanSite(path.resolve(folder));
  spinner.succeed(chalk.green('Scan complete.'));

  console.log(chalk.bold('\n🔎 Site profile'));
  console.log(
    [
      `${chalk.gray('HTML pages     :')} ${scan.htmlCount}`,
      `${chalk.gray('JS files       :')} ${scan.jsCount} (${formatBytes(scan.totalJsBytes)} total${scan.largestJsFile ? `, largest: ${scan.largestJsFile} — ${formatBytes(scan.largestJsBytes)}` : ''})`,
      `${chalk.gray('CSS files      :')} ${scan.cssCount}`,
      `${chalk.gray('Images         :')} ${scan.imageCount}`,
      `${chalk.gray('Heavy JS       :')} ${scan.heavyJs ? chalk.red('yes') : chalk.green('no')}`,
      `${chalk.gray('Service worker :')} ${scan.hasServiceWorker ? chalk.yellow('detected') : 'none'}`,
      `${chalk.gray('3rd-party tags :')} ${scan.hasThirdPartyAnalytics ? chalk.yellow('detected') : 'none'}`,
    ].join('\n')
  );

  const recs = buildRecommendations(scan);
  console.log(chalk.bold('\n☁️  Cloudflare Dashboard recommendations\n'));
  for (const r of recs) {
    const onOff = /^ON/i.test(r.value)
      ? chalk.green(r.value)
      : /^OFF/i.test(r.value)
        ? chalk.red(r.value)
        : chalk.yellow(r.value);
    console.log(`  ${chalk.bold('•')} ${chalk.white(r.setting)} → ${onOff}`);
    console.log(`    ${chalk.dim(r.reason)}`);
  }

  if (opts.export) {
    const rules = buildPageRules('<your-domain>');
    await fs.writeJson(path.resolve(opts.export), rules, { spaces: 2 });
    console.log(chalk.green(`\n✓ Page Rules JSON exported → ${path.resolve(opts.export)}`));
  } else {
    console.log(chalk.dim('\nTip: add --export cloudflare-rules.json to save suggested Page Rules.'));
  }
  console.log('');
}
