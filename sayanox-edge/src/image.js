/**
 * Sayanox Edge — image optimization (sharp)
 * Compress JPG/PNG/GIF/AVIF and optionally emit WebP siblings.
 */
import path from 'node:path';
import fs from 'fs-extra';
import sharp from 'sharp';

const OPTIMIZABLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff']);

export function isOptimizableImage(file) {
  return OPTIMIZABLE.has(path.extname(file).toLowerCase());
}

/**
 * Optimize a single image file in place at `outPath`.
 * - Raster images are re-encoded with the requested quality.
 * - SVGs are left as-is (sharp can rasterize but not safely minify vectors here).
 * Returns { before, after, webpBytes } where sizes are in bytes.
 */
export async function optimizeImage(srcPath, outPath, { quality = 80, webp = false } = {}) {
  const ext = path.extname(srcPath).toLowerCase();

  // GIF & SVG: copy through (sharp gif output support varies; keep it safe).
  if (ext === '.gif' || ext === '.svg') {
    await fs.copy(srcPath, outPath, { overwrite: true });
    const size = (await fs.stat(outPath)).size;
    return { before: size, after: size, webpBytes: 0 };
  }

  if (!isOptimizableImage(srcPath)) {
    await fs.copy(srcPath, outPath, { overwrite: true });
    const size = (await fs.stat(outPath)).size;
    return { before: size, after: size, webpBytes: 0 };
  }

  const image = sharp(srcPath, { animated: false }).rotate(); // auto-rotate via EXIF
  const outExt = path.extname(outPath).toLowerCase();

  let info;
  if (outExt === '.png') {
    info = await image
      .png({ compressionLevel: 9, palette: true, quality })
      .toFile(outPath);
  } else if (outExt === '.webp') {
    info = await image.webp({ quality, effort: 6 }).toFile(outPath);
  } else {
    // jpg/jpeg/avif/tiff → mozjpeg-style jpeg output
    info = await image
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toFile(outPath);
  }

  const before = (await fs.stat(srcPath)).size;
  const after = info.size ?? (await fs.stat(outPath)).size;

  // If re-encoding somehow made it bigger, keep the smaller original.
  if (after >= before && outExt !== '.webp') {
    await fs.copy(srcPath, outPath, { overwrite: true });
    return { before, after: before, webpBytes: 0 };
  }

  let webpBytes = 0;
  if (webp && outExt !== '.webp') {
    const webpPath = outPath.replace(/\.[^.]+$/, '.webp');
    const w = await sharp(srcPath, { animated: false })
      .webp({ quality, effort: 6 })
      .toFile(webpPath);
    webpBytes = w.size;
  }

  return { before, after, webpBytes };
}
