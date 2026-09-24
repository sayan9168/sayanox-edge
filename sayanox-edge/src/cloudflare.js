/**
 * Sayanox Edge — Cloudflare recommendations engine
 * Scans a site folder and produces dashboard settings advice + Page Rules JSON.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { walkFiles, isHtml, isJs, isCss, isImage } from './utils.js';

const HEAVY_JS_BYTES = 300 * 1024; // single-file threshold for "heavy JS"
const TOTAL_JS_BYTES = 600 * 1024; // whole-site threshold

/**
 * Scan a folder and return a structured analysis:
 * { htmlCount, jsCount, cssCount, imageCount, totalJsBytes, largestJsFile,
 *   hasServiceWorker, hasThirdPartyAnalytics, heavyJs }
 */
export async function scanSite(folder) {
  const files = await walkFiles(folder);
  const stats = {
    htmlCount: 0,
    jsCount: 0,
    cssCount: 0,
    imageCount: 0,
    totalJsBytes: 0,
    largestJsFile: null,
    largestJsBytes: 0,
    hasServiceWorker: false,
    hasThirdPartyAnalytics: false,
    inlineScriptBytes: 0,
    heavyJs: false,
  };

  for (const file of files) {
    if (isHtml(file)) {
      stats.htmlCount++;
      const code = await fs.readFile(file, 'utf8');
      if (/googletagmanager|google-analytics|gtag\(|fbq\(|hotjar|clarity\.ms/i.test(code)) {
        stats.hasThirdPartyAnalytics = true;
      }
      const inlineMatches = code.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
      for (const m of inlineMatches) {
        stats.inlineScriptBytes += Buffer.byteLength(m, 'utf8');
      }
    } else if (isJs(file)) {
      stats.jsCount++;
      const size = (await fs.stat(file)).size;
      stats.totalJsBytes += size;
      if (size > stats.largestJsBytes) {
        stats.largestJsBytes = size;
        stats.largestJsFile = path.relative(folder, file);
      }
      if (path.basename(file).toLowerCase().includes('sw') || /service[-_]?worker/i.test(file)) {
        stats.hasServiceWorker = true;
      }
    } else if (isCss(file)) {
      stats.cssCount++;
    } else if (isImage(file)) {
      stats.imageCount++;
    }
  }

  stats.heavyJs =
    stats.largestJsBytes > HEAVY_JS_BYTES ||
    stats.totalJsBytes + stats.inlineScriptBytes > TOTAL_JS_BYTES;

  return stats;
}

/**
 * Build the list of Cloudflare dashboard recommendations from a scan.
 */
export function buildRecommendations(scan) {
  const recs = [];

  recs.push({
    setting: 'Rocket Loader',
    value: scan.heavyJs ? 'OFF' : 'OFF (recommended default)',
    reason: scan.heavyJs
      ? `Heavy JS detected (${Math.round(scan.largestJsBytes / 1024)} KB in ${scan.largestJsFile}). Rocket Loader rewrites script execution order and commonly breaks defer/async & module scripts.`
      : 'Rocket Loader often breaks inline handlers, modules and third-party embeds. Minified + deferred JS (Sayanox Edge output) makes it unnecessary.',
  });

  recs.push({
    setting: 'Auto Minify',
    value: 'ON (JavaScript, CSS, HTML)',
    reason: 'Free extra pass at the edge. Safe complement to local minification.',
  });

  recs.push({
    setting: 'Brotli',
    value: 'ON',
    reason: 'Brotli compresses text assets ~15–20% smaller than gzip for most browsers.',
  });

  recs.push({
    setting: 'Polish',
    value: scan.imageCount > 0 ? 'Lossy' : 'Lossy (enable when you add images)',
    reason: 'Lossy Polish strips EXIF and further compresses JPG/PNG at the edge.',
  });

  recs.push({
    setting: 'Browser Cache TTL',
    value: '1 month – 1 year (with versioned asset URLs)',
    reason: 'Sayanox Edge writes a _headers file with immutable 1-year caching for /css /js /images and must-revalidate for HTML.',
  });

  recs.push({
    setting: 'HTTP/3 (QUIC) + 0-RTT',
    value: 'ON',
    reason: 'Cuts connection setup latency for repeat visitors — biggest win for global audiences.',
  });

  if (scan.hasThirdPartyAnalytics) {
    recs.push({
      setting: 'Content-Security-Policy / Slow-DoS mitigation',
      value: 'Review third-party scripts',
      reason: 'Analytics scripts detected in HTML. Consider Flying Scripts or delaying them until after first paint.',
    });
  }

  if (scan.hasServiceWorker) {
    recs.push({
      setting: 'Cache Rules',
      value: 'Bypass cache for /sw.js',
      reason: 'A cached service worker prevents updates from reaching returning visitors.',
    });
  }

  return recs;
}

/**
 * Suggested Cloudflare Page Rules / Cache Rules as simple JSON.
 */
export function buildPageRules(sitePattern = 'example.com') {
  return {
    generatedBy: 'sayanox-edge',
    note: 'Apply under Cloudflare Dashboard → Rules. Adjust the domain pattern to your zone.',
    pageRules: [
      {
        targets: [`*://${sitePattern}/css/*`, `*://${sitePattern}/js/*`, `*://${sitePattern}/images/*`],
        actions: { cacheLevel: 'cacheEverything', edgeCacheTtl: '31536000', browserCacheTtl: '31536000' },
        purpose: 'Immutable static assets',
      },
      {
        targets: [`*://${sitePattern}/sw.js`, `*://${sitePattern}/manifest.json`],
        actions: { cacheLevel: 'bypass' },
        purpose: 'Service worker & manifest must always be fresh',
      },
      {
        targets: [`*://${sitePattern}/*`],
        actions: { brotli: true, polish: 'lossy', securityLevel: 'high' },
        purpose: 'Global optimizations',
      },
    ],
  };
}
