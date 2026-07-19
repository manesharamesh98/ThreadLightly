# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ThreadLightly — Project Guide

## Working Instructions
- **Whenever you modify source code, update `Context/technical-documentation.md`** to reflect the change. Add new sections for new features, update existing sections for changed behaviour, and remove stale descriptions. Keep the documentation in sync with the code at all times.
- **When updating `Context/technical-documentation.md`, move any replaced or removed descriptions to `Context/technical-documentation-deprecated.md`** rather than deleting them. Prepend each deprecated entry with a note of what it was superseded by and approximately when.

## What This App Does
ThreadLightly analyzes clothing labels to identify textile materials and rate their sustainability. Users authenticate via Google OAuth, then photograph or upload a garment's care/composition label. The backend runs OCR + a multi-stage AI pipeline to identify materials (e.g. "80% polyester, 20% cotton"), returns MADE-BY benchmark scores, and persists scan history per user.

## Tech Stack
- **Backend**: Node.js + Express v5, Multer (file uploads), Tesseract.js (OCR), Sharp (image preprocessing), Natural.js (Soundex phonetics), better-sqlite3 (database)
- **Auth**: Passport + Google OAuth 2.0, JWT tokens
- **Frontend**: Vanilla HTML/CSS/JS SPA — no framework
- **PWA**: Service Worker (offline caching) + Web App Manifest

## Environment Variables (`.env`)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
SESSION_SECRET=
PORT=3000
NODE_ENV=development
```
See `.env.example` for the template.

## Project Structure
```
src/
  server.js              # Express entry point — mounts routes, serves public/
  db/
    schema.sql           # SQLite schema: users + scans tables
    index.js             # better-sqlite3 init, WAL mode, foreign keys
  middleware/
    auth.js              # JWT requireAuth() middleware (dev bypass: token='preview')
  pipeline/
    index.js             # Pipeline orchestrator — runs all stages in sequence
    preprocess.js        # Sharp: auto-rotate, upscale, generate 3 contrast variants
    ocr.js               # Tesseract.js: tries 3 PSM modes, picks best result
    matcher.js           # Text cleaning, material extraction, fuzzy matching (Levenshtein + Soundex)
    scorer.js            # Weighted MADE-BY score, maps to Bad/OK/Good/Great rating
    materials-db.js      # 30+ materials with MADE-BY class, score, multilingual synonyms
  routes/
    auth.js              # GET /api/auth/google, /callback, /me
    analyze.js           # POST /api/analyze — validates file, runs pipeline, saves to DB
    scans.js             # GET /api/scans, /api/scans/:id — scan history per user

public/
  index.html             # SPA shell — 6 screens: Auth, Home, Snap, Results, Resources, Profile
  js/
    app.js               # State management, routing, camera, API wrapper, auth flow
    service-worker.js    # Offline caching (precaches core assets)
  css/
    variables.css        # Design tokens: colors, typography, spacing (MADE-BY class colors)
    style.css            # Component styles for all 6 screens
  images/                # Logo, hero illustration, app icon
  manifest.json          # PWA manifest

Context/                 # Product docs, Figma design refs, pitch deck, e-booklet
sample-labels/           # Test clothing label photos
uploads/                 # Temp storage for uploaded images (deleted after pipeline)
threadlightly.db         # SQLite database (gitignored)
```

## Commands
```bash
cp .env.example .env    # fill in Google OAuth + secrets, first-time setup only
npm install
npm start                # node src/server.js — production mode
npm run dev              # node --watch src/server.js — auto-restarts on file changes
# Server starts on http://localhost:3000
```
There is no test suite, lint script, or build step in this repo — `npm start`/`npm run dev` are the only defined scripts. Verify changes by exercising the running app (or the `/verify` skill) rather than looking for a test command.

## Automated Review Hook
`.claude/hooks/review-trigger.js` runs as a `PostToolUse` hook on every `Write`/`Edit` of `.js`/`.mjs`/`.cjs`/`.html`/`.css`/`.sql` files (excluding `node_modules/`, `.git/`, `Context/`, `.claude/`, `uploads/`, `sample-labels/`, `memory/`, and the sqlite db). It injects a reminder to invoke the `fullstack-code-reviewer` agent before considering the change complete — surface that agent's findings to the user and wait for confirmation before applying fixes.

## Legacy / Unused Files
`src/run.js`, `src/image-to-text.js`, `src/image-preprocessing.js`, `src/materials-info.js`, `src/materials.json`, and `src/materials-variations.json` are an earlier standalone CLI prototype (uses `@gutenye/ocr-node`, `chalk`, `validator`). They are **not required by `server.js`** and are superseded by `src/pipeline/`. Don't extend them for new features — treat `src/pipeline/` and `src/pipeline/materials-db.js` as the source of truth.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google` | — | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | — | OAuth callback, redirects to `/#token=<jwt>` |
| GET | `/api/auth/me` | JWT | Get current user profile |
| POST | `/api/analyze` | JWT | Upload image, returns analysis result |
| GET | `/api/scans` | JWT | Get last 50 scans for user |
| GET | `/api/scans/:id` | JWT | Get single scan (must be owner) |

## Analysis Pipeline (6 stages)
1. **Preprocess** — Sharp: auto-rotate EXIF, upscale to 1500px min, generate 3 variants (normalized, high-contrast threshold, blur+threshold)
2. **OCR** — Tesseract.js: tries PSM modes 6/3/11 on each variant, picks highest confidence × word count result
3. **Clean text** — Strip OCR noise, fix common substitutions (O→0, l→1, rn→m), keep only lines with `%` or material keywords
4. **Match materials** — Regex extracts `NN% MaterialName` or `MaterialName NN%` pairs; 3-pass fuzzy matching: exact synonym → Levenshtein ≤2 → Soundex phonetic
5. **Score** — Weighted average: Σ(MADE-BY class score × percentage) / Σ(percentages); confidence='high' if percentages sum 85–115%
6. **Return** — `{ score, rating, garmentType, materials[], confidence, rawText }`

## MADE-BY Scoring
| Class | Score | Examples |
|-------|-------|---------|
| A | 100 | Recycled nylon/polyester, organic hemp, recycled cotton/wool |
| B | 80 | Organic cotton, TENCEL, Monocel |
| C | 60 | Conventional flax/hemp, PLA, Ramie |
| D | 40 | Modal, acrylic, virgin polyester |
| E | 20 | Bamboo viscose, conventional cotton, viscose, spandex, virgin nylon, wool |
| Unclassified | 30 | Silk, cashmere, leather, alpaca |

Ratings: **Bad** <40, **OK** 40–69, **Good** 70–79, **Great** ≥80

## Database Schema
```sql
users  (id, google_id, email, name, avatar, created_at)
scans  (id, user_id, score, rating, rating_description, garment_type, materials JSON, raw_text, confidence, created_at)
```
`confidence` is `'high' | 'low'`. Preview-mode users (dev bypass, `user.id === 0`) are not persisted to `scans` — see `src/routes/analyze.js`.
