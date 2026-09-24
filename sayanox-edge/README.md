# ⚡ Sayanox Edge

**Ultra-fast static site optimizer & Cloudflare performance toolkit.**
Minify HTML/CSS/JS, compress images to WebP, generate deploy-ready cache headers, and get smart Cloudflare recommendations — from one CLI command.

Built by **[Sayan Mahata](https://github.com/sayan9168)** · Founder of **Sayanox**

![version](https://img.shields.io/badge/version-1.0.0-orange) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

---

## What it does

Static sites on GitHub Pages / Cloudflare Pages / Vercel often ship with bloated CSS, unminified JS, heavy images and no cache policy. `sayanox-edge` fixes all of that in one pass:

| Feature | Command |
|---|---|
| Minify every `.html`, `.css`, `.js` file (terser + clean-css + html-minifier-terser) | `optimize` |
| Compress JPG/PNG and optionally emit WebP siblings (sharp) | `optimize --webp` / `images` |
| Auto-add `loading="lazy"` to `<img>` and `defer` to non-critical `<script>` | `optimize` |
| Generate a `_headers` file with strong, immutable cache rules (Cloudflare Pages / Netlify) | `optimize` |
| Before/after size report + summary table | `optimize` |
| Cloudflare dashboard recommendations (Rocket Loader, Brotli, Polish, TTL…) + Page Rules JSON export | `cf-rules` |

## Installation

```bash
# globally
npm i -g sayanox-edge

# or run without installing
npx sayanox-edge --help
```

From source:

```bash
git clone https://github.com/sayan9168/sayanox-edge.git
cd sayanox-edge
npm install
npm link   # makes the `sayanox-edge` command available globally
```

Requires **Node.js ≥ 18**. Works on Windows, macOS and Linux.

## Usage

### `sayanox-edge optimize <input-folder>`

Full pipeline: copies your site to an output folder, minifies everything, optimizes images and writes `_headers`.

```bash
sayanox-edge optimize ./my-site --out ./dist --webp --quality 80
```

| Flag | Description | Default |
|---|---|---|
| `-o, --out <folder>` | Output directory | `<input>-dist` |
| `--webp` | Also generate WebP versions of each image | off |
| `-q, --quality <1-100>` | Image encoding quality | `80` |
| `--no-lazy` | Skip adding `loading="lazy"` to `<img>` tags | lazy enabled |
| `--no-defer` | Skip adding `defer` to external scripts | defer enabled |
| `--no-headers` | Skip generating the `_headers` file | headers enabled |

Notes:
- Images marked `data-critical` are never lazy-loaded (keep your hero image fast).
- Scripts marked `data-no-defer`, already `async`/`defer`/`type="module"`, or inline are left untouched.
- If re-encoding would make an image *larger*, the original is kept.

### `sayanox-edge images <folder>`

Compress only the images in a folder.

```bash
# in-place compression at quality 75
sayanox-edge images ./assets/img --quality 75

# write optimized copies + WebP to a new folder
sayanox-edge images ./assets/img --webp --out ./assets/img-dist
```

### `sayanox-edge cf-rules <folder>`

Scan the site and print Cloudflare Dashboard recommendations — Rocket Loader advice (auto-detects heavy JS), Auto Minify, Brotli, Polish, Browser Cache TTL, HTTP/3, plus warnings for service workers and third-party analytics tags.

```bash
sayanox-edge cf-rules ./dist
sayanox-edge cf-rules ./dist --export cloudflare-rules.json
```

The `--export` flag writes suggested Page Rules as JSON you can apply under **Cloudflare Dashboard → Rules**.

## Try the bundled sample site

```bash
cd sayanox-edge
npm install
node bin/sayanox-edge.js optimize examples/sample-site --out dist-sample --webp
node bin/sayanox-edge.js cf-rules examples/sample-site
```

You'll see a per-file before/after table, a savings summary, and a ready-to-deploy `dist-sample/` folder containing minified assets, compressed images, WebP variants and a `_headers` file.

## Project structure

```
sayanox-edge/
├── package.json
├── bin/
│   └── sayanox-edge.js      # CLI entry point (Commander)
├── src/
│   ├── index.js             # pipeline orchestration + reporting
│   ├── minify.js            # HTML/CSS/JS minification + lazy/defer injection
│   ├── image.js             # sharp-based image compression + WebP
│   ├── cache.js             # _headers / vercel.json generation
│   ├── cloudflare.js        # site scanner + CF recommendation engine
│   └── utils.js             # helpers (sizes, fs safety, timers)
└── examples/
    └── sample-site/         # deliberately unoptimized demo site
```

## Roadmap

- [x] Phase 1 (MVP): optimize / images / cf-rules
- [ ] Critical CSS extraction (above-the-fold heuristic)
- [ ] Lighthouse CI integration & score diffing
- [ ] HTML `<picture>` rewriting to auto-serve WebP/AVIF
- [ ] GitHub Action wrapper

## License

MIT © 2026 Sayan Mahata

---

*Built by Sayan Mahata · Founder of Sayanox* ⚡
