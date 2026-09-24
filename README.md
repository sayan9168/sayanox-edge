# Sayanox Edge ⚡

**Ultra-fast static site optimizer & Cloudflare performance toolkit**
Built by **Sayan Mahata** · Founder of Sayanox

> Lag killer. GitHub Pages, Cloudflare Pages, Vercel — যেকোনো স্ট্যাটিক সাইটের ল্যাগ কমাতে।

![Status](https://img.shields.io/badge/status-planning-yellow) ![License](https://img.shields.io/badge/license-MIT-blue) ![Phase](https://img.shields.io/badge/phase-MVP%20(Phase%201)-orange)

---

## 📊 Project Analysis (সম্পূর্ণ অবস্থা এক নজরে)

### ✅ যা আছে এখন (Current State)
| Item | Status |
|------|--------|
| README / Project Plan | ✅ সম্পূর্ণ — Phase 1–3 রোডম্যাপ সেট |
| `package.json` / CLI scaffold | ❌ এখনও বানানো হয়নি |
| Source code (`src/`, `bin/`) | ❌ নেই |
| Tests / CI | ❌ নেই |

### 🎯 Core Problem
স্ট্যাটিক সাইটগুলো (বিশেষত পোর্টফোলিও) প্রায়ই আনঅপটিমাইজড CSS/JS, ভারী ইমেজ আর ভুল cache config-এর কারণে ধীরে লোড হয়। Sayanox Edge এক কমান্ডে এই সব ঠিক করে **Cloudflare-ready** আউটপুট দেবে।

### 📈 Impact Estimate (লক্ষ্য)
- Load time **৩০–৫০%** কমবে (minify + image optimize + cache headers)
- Lighthouse Performance **৯০+**
- Cloudflare Rocket Loader conflict আগে থেকেই ডিটেক্ট হবে

### ⚙️ Architecture Snapshot
```
CLI (bin/sayanox-edge.js)
   ├── minify.js         → HTML/CSS/JS compress (terser, cssnano, html-minifier)
   ├── image.js          → JPG/PNG → WebP + quality control (sharp/imagemin)
   ├── cache-headers.js  → Cloudflare/Nginx cache rules
   └── cloudflare.js     → Page Rules JSON, Rocket Loader detector
Output: ./dist (deploy-ready for GH Pages / CF Pages / Vercel)
```

### 🔍 Risk & Dependency Analysis
| Risk | Severity | Mitigation |
|------|----------|------------|
| Image libs (sharp) native build issues | Medium | imagemin fallback রাখা |
| Rocket Loader heavy JS-তে break করে | High | Conflict detector (Phase 2) |
| Critical CSS extraction জটিল | Medium | প্রথমে simple above-the-fold heuristic |
| Scope creep (Web UI আগে) | Low | Phase ordering strict রাখা |

### 🏁 Recommended Immediate Actions
1. `npm init` + `bin/sayanox-edge.js` স্ক্যাফোল্ড করো (Phase 1, feature #6)
2. Minify মডিউল দিয়ে শুরু — সবচেয়ে কম risk, সবচেয়ে বেশি impact
3. Sample test site (`examples/sample-site/`) বানাও যাতে প্রতিটি ফিচার মাপা যায়

---

## কী বানাতে হবে (Project Plan)

### 1. Core Goal
একটা **CLI + Web Tool** যেটা স্ট্যাটিক ওয়েবসাইট (HTML/CSS/JS) অপটিমাইজ করে:
- ল্যাগ কমায়
- লোড টাইম কমায়
- Cloudflare / GitHub Pages / Vercel এর জন্য রেডি আউটপুট দেয়

### 2. Features যেগুলো বানাতে হবে

#### Phase 1 — MVP (প্রথমে এগুলো)
- [ ] **HTML/CSS/JS Minify** — এক কমান্ডে সব ফাইল মিনিফাই
- [ ] **Image Optimize** — JPG/PNG/WebP কনভার্ট + কম্প্রেস (quality control)
- [ ] **Cache Headers Generator** — Cloudflare / Nginx এর জন্য সঠিক cache rules
- [ ] **Critical CSS Extract** — above-the-fold CSS আলাদা করে
- [ ] **Script Defer/Async Auto** — স্ক্রিপ্ট ট্যাগে defer/async যোগ
- [ ] **Simple CLI** — `sayanox-edge optimize ./my-site`

#### Phase 2 — Cloudflare Special
- [ ] **Cloudflare Rules Generator** — Page Rules / Cache Rules JSON এক্সপোর্ট
- [ ] **Rocket Loader Conflict Detector** — Three.js / heavy JS থাকলে সতর্কতা
- [ ] **Brotli + Polish recommendations** — Cloudflare ড্যাশবোর্ড সেটিংস সাজেশন
- [ ] **Early Hints / Preload** ট্যাগ অটো ইনজেক্ট

#### Phase 3 — Advanced
- [ ] **Lighthouse Score Runner** — অপটিমাইজের আগে-পরে স্কোর দেখায়
- [ ] **Bundle Analyzer** — কোন JS/CSS সবচেয়ে ভারী
- [ ] **Web UI** — ব্রাউজারে ড্র্যাগ-ড্রপ করে অপটিমাইজ
- [ ] **GitHub Action** — পুশ করলেই অটো অপটিমাইজ + deploy

### 3. Tech Stack (সাজেস্টেড)
| Part | Technology |
|------|------------|
| CLI | Node.js বা Python |
| Minify | terser, cssnano, html-minifier |
| Image | sharp / imagemin |
| Web UI | Next.js বা plain HTML + Tailwind |
| Config | `sayanox-edge.config.js` |

### 4. Folder Structure (শুরুতে এভাবে রাখো)

```
sayanox-edge/
├── README.md
├── package.json          (বা requirements.txt)
├── bin/
│   └── sayanox-edge.js   # CLI entry
├── src/
│   ├── minify.js
│   ├── image.js
│   ├── cache-headers.js
│   └── cloudflare.js
├── web/                  # optional Web UI
└── examples/
    └── sample-site/
```

### 5. Example Usage (টার্গেট)

```bash
# Install
npm i -g sayanox-edge

# Optimize a folder
sayanox-edge optimize ./my-portfolio --out ./dist

# Only images
sayanox-edge images ./assets --webp --quality 80

# Generate Cloudflare rules
sayanox-edge cf-rules ./dist > cloudflare-rules.json
```

### 6. Success Criteria
- একটা সাধারণ পোর্টফোলিও সাইটের লোড টাইম **৩০–৫০%** কমে
- Lighthouse Performance স্কোর **৯০+** এ উঠে
- Cloudflare-এ “Rocket Loader off + proper cache” রেকমেন্ডেশন কাজ করে
- CLI এক কমান্ডে পুরো ফ্লো চালায়

---

## Quick Start (ডেভেলপারদের জন্য)

```bash
git clone https://github.com/sayan9168/sayanox-edge.git
cd sayanox-edge
# তারপর package.json / requirements.txt সেটআপ করে Phase 1 শুরু করো
```

---

## Why this project?

Sayanox ইকোসিস্টেমের অংশ হিসেবে — ডেভেলপারদের সাইট **ফাস্ট** রাখতে।  
নিজের পোর্টফোলিও (`sayan9168.github.io`) থেকেই ল্যাগ সমস্যা দেখে এই টুল বানানোর আইডিয়া।

---

**Founder:** [Sayan Mahata](https://github.com/sayan9168)  
**Organization:** Sayanox Private Limited  
**License:** MIT (or Sayanox License)

---

### Next Steps for you
1. `package.json` বানিয়ে CLI স্ক্যাফোল্ড করো
2. Phase 1 এর ৬টা ফিচার এক এক করে ইমপ্লিমেন্ট করো
3. `examples/sample-site/` দিয়ে প্রতিটি ফিচার টেস্ট করো (before/after size মাপো)
4. Web UI বা GitHub Action পরে যোগ কর

প্রশ্ন থাকলে Issues-এ খোলো। Build in public. 🚀
