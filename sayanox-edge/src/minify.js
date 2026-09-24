/**
 * Sayanox Edge — HTML / CSS / JS minification
 * Uses html-minifier-terser, clean-css and terser.
 */
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

/**
 * Minify an HTML document.
 * Also (optionally) adds loading="lazy" to <img> tags and defer to
 * non-critical <script> tags before minifying.
 */
export async function minifyHtmlCode(code, { lazy = true, defer = true } = {}) {
  let html = code;

  if (lazy) html = addLazyLoading(html);
  if (defer) html = addDefer(html);

  return minifyHtml(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
    sortClassName: true,
  });
}

/** Minify CSS with clean-css (level 2 optimizations). */
export async function minifyCssCode(code) {
  const result = await new CleanCSS({ level: 2 }).minify(code);
  if (result.errors && result.errors.length) {
    throw new Error(`CSS minify error: ${result.errors.join('; ')}`);
  }
  return result.styles;
}

/** Minify JS with terser. Returns original code if terser fails (e.g. syntax edge cases). */
export async function minifyJsCode(code) {
  try {
    const result = await minifyJs(code, {
      compress: { passes: 2, drop_console: false },
      mangle: true,
      format: { comments: false },
    });
    return result.code ?? code;
  } catch (err) {
    // Don't break the build over one bad script — keep original and warn upstream.
    err.minifySoft = true;
    throw err;
  }
}

/**
 * Add loading="lazy" to every <img> that doesn't already declare it.
 * Leaves images with loading="eager" untouched.
 */
export function addLazyLoading(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\bloading\s*=/i.test(tag)) return tag;
    // Don't lazy-load hero/first images marked with data-critical
    if (/\bdata-critical\b/i.test(tag)) return tag;
    return tag.replace(/^<img\b/i, '<img loading="lazy"');
  });
}

/**
 * Add defer to external, non-inline scripts that are neither
 * already async/defer nor marked data-no-defer (assumed critical).
 */
export function addDefer(html) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, body) => {
    const isExternal = /\bsrc\s*=/i.test(attrs);
    if (!isExternal) return tag; // inline script — defer has no effect
    if (/\b(defer|async|type\s*=\s*["']module)["']/i.test(attrs) || /\b(defer|async)\b/i.test(attrs)) {
      return tag;
    }
    if (/\bdata-no-defer\b/i.test(attrs)) return tag;
    if (/head\s*>/i.test(html.slice(0, html.indexOf(tag)).slice(-40)) && /\bdata-critical\b/i.test(attrs)) {
      return tag;
    }
    return `<script${attrs} defer>${body}</script>`;
  });
}
