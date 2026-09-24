/**
 * Sayanox Edge — shared helpers
 */
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

/** Human-readable file size, e.g. 15360 -> "15.0 KB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Percent saved, clamped to [-100, 100] */
export function savingsPercent(before, after) {
  if (before <= 0) return 0;
  return Math.max(-100, Math.min(100, ((before - after) / before) * 100));
}

/** Assert a folder exists and is readable, with friendly errors */
export async function ensureFolder(dir, label = 'folder') {
  let stat;
  try {
    stat = await fs.stat(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`${label} not found: ${path.resolve(dir)}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied reading ${label}: ${path.resolve(dir)}`);
    }
    throw err;
  }
  if (!stat.isDirectory()) {
    throw new Error(`Expected a directory but got a file: ${path.resolve(dir)}`);
  }
  return stat;
}

/** Recursively list all file paths under a directory */
export async function walkFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);
const HTML_EXT = new Set(['.html', '.htm']);
const CSS_EXT = new Set(['.css']);
const JS_EXT = new Set(['.js', '.mjs']);

export const isImage = (f) => IMAGE_EXT.has(path.extname(f).toLowerCase());
export const isHtml = (f) => HTML_EXT.has(path.extname(f).toLowerCase());
export const isCss = (f) => CSS_EXT.has(path.extname(f).toLowerCase());
export const isJs = (f) => JS_EXT.has(path.extname(f).toLowerCase());

/** Parse & validate the --quality flag (1..100, default 80) */
export function parseQuality(raw, fallback = 80) {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 100) {
    throw new Error(`Invalid --quality "${raw}". Use an integer between 1 and 100.`);
  }
  return n;
}

/** Resolve output dir: use --out if given, else <input>-dist next to input */
export function resolveOutDir(inputDir, outOption) {
  if (outOption) return path.resolve(outOption);
  const resolved = path.resolve(inputDir);
  return resolved.endsWith('.dist') || resolved.endsWith('-dist')
    ? resolved
    : `${resolved}-dist`;
}

/** Refuse destructive in/out overlaps (same dir or out inside nothing weird) */
export function assertDistinctDirs(inputDir, outputDir) {
  const a = path.resolve(inputDir);
  const b = path.resolve(outputDir);
  if (a === b) {
    throw new Error(
      'Output folder must be different from the input folder (refusing to overwrite source).'
    );
  }
  if (b.startsWith(a + path.sep)) {
    throw new Error(
      `Output folder (${b}) is inside the input folder (${a}); this would cause recursive processing. Choose a separate location.`
    );
  }
}

/** Timing helper */
export function startTimer() {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6; // ms
}

/** Pretty duration */
export function formatMs(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Count lines in a string (for "heavy JS" heuristics) */
export function countLines(str) {
  let n = 1;
  for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) === 10) n++;
  return n;
}

export const platformNote = () =>
  os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'macOS' : 'Linux';
