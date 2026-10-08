# Sayanox Edge

### Ultra-fast static site optimizer & Cloudflare performance toolkit

Minify · Image optimize · Cache headers · Cloudflare-ready output

[![Status](https://img.shields.io/badge/status-planning-yellow)](#)
[![Phase](https://img.shields.io/badge/phase-MVP%20(Phase%201)-orange)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

> **Planning / pre-code stage.** Roadmap is defined; CLI scaffold is not implemented yet.

---

## Problem

Static sites (especially portfolios) often ship unoptimized CSS/JS, heavy images, and weak cache config.  
Sayanox Edge aims to fix that with **one CLI command** and deploy-ready output for GitHub Pages, Cloudflare Pages, and Vercel.

### Target impact

- 30–50% faster load (minify + image optimize + cache headers)
- Lighthouse Performance 90+
- Early detection of Cloudflare Rocket Loader conflicts

---

## Current state

| Item | Status |
|------|--------|
| README / roadmap | Done |
| `package.json` / CLI scaffold | Not started |
| Source (`src/`, `bin/`) | Not started |
| Tests / CI | Not started |

---

## Planned architecture

```text
CLI (bin/sayanox-edge.js)
  ├─ minify.js          HTML/CSS/JS compress
  ├─ image.js           JPG/PNG → WebP + quality control
  ├─ cache-headers.js   Cloudflare/Nginx cache rules
  └─ cloudflare.js      Page Rules JSON, Rocket Loader detector

Output → ./dist (deploy-ready)
```

---

## Roadmap

### Phase 1 — MVP
- [ ] HTML/CSS/JS minify
- [ ] Image optimize (WebP + quality)
- [ ] Cache headers generator
- [ ] Critical CSS extract (simple heuristic)
- [ ] Script defer/async auto
- [ ] CLI: `sayanox-edge optimize ./my-site`

### Phase 2 — Cloudflare
- [ ] Page / Cache Rules export
- [ ] Rocket Loader conflict detector
- [ ] Brotli / Polish recommendations
- [ ] Early Hints / preload injection

### Phase 3 — Advanced
- [ ] Lighthouse before/after
- [ ] Bundle analyzer
- [ ] Web UI
- [ ] GitHub Action

---

## Target usage

```bash
npm i -g sayanox-edge

sayanox-edge optimize ./my-portfolio --out ./dist
sayanox-edge images ./assets --webp --quality 80
sayanox-edge cf-rules ./dist > cloudflare-rules.json
```

---

## Suggested stack

| Part | Tech |
|------|------|
| CLI | Node.js |
| Minify | terser, cssnano, html-minifier |
| Images | sharp / imagemin |
| Config | `sayanox-edge.config.js` |

---

## Author

[Sayan Mahata](https://github.com/sayan9168) · Sayanox Private Limited
