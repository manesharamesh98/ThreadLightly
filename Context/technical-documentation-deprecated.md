# ThreadLightly — Deprecated Technical Documentation

This file contains documentation for features, modules, and APIs that have been removed or superseded. Kept for historical reference.

---

## Stage 2 — OCR: `Tesseract.recognize()` one-shot calls (superseded 2026-07-04)

> Superseded by: a persistent `createWorker()` reused across all variant/PSM combinations within a single `extractText()` call, with PSM mode 3 replaced by PSM mode 4. See current "Stage 2 — OCR" section in `technical-documentation.md`.

Previously, `ocr.js` called `Tesseract.recognize(imageBuffer, lang, { logger, tessedit_pageseg_mode, tessedit_char_whitelist, preserve_interword_spaces })` directly, once per (variant × PSM) combination — 9 calls per image. Each call created and tore down its own Tesseract worker internally.

This had a latent bug: in tesseract.js v6, `Tesseract.recognize()`'s third argument is consumed as **worker-creation options** (only `logger`/core paths take effect), not per-recognition parameters. `tessedit_pageseg_mode` and `tessedit_char_whitelist` were silently ignored, so all "PSM modes" ran identically at Tesseract's default PSM — 6 of the 9 passes per image were exact duplicates, and the character whitelist never applied.

**PSM modes previously listed (in priority order):**

| PSM | Mode | Best for |
|-----|------|---------|
| 6 | Uniform block of text | Neatly formatted composition labels |
| 3 | Fully automatic page segmentation | General fallback |
| 11 | Sparse text, no OSD | Labels with scattered or multi-column text |

PSM 3 was replaced with PSM 4 (single column of variable-sized text) — a better fit for single-column garment tags than PSM 3's full-page layout analysis, which is more prone to misreading fabric wrinkles/texture as separate page regions.

---

## Stage 1 — Preprocessing: per-variant `clone()` of a lazy pipeline (superseded 2026-07-04)

> Superseded by: materializing the shared rotate/resize/grayscale chain once into a raw pixel buffer, reused by all three variants. See current "Stage 1 — Preprocessing" section in `technical-documentation.md`.

Previously, `preprocess.js` built one lazy Sharp pipeline (`base = sharp(inputBuffer).rotate().resize(...).grayscale()`) and called `base.clone()` three times, once per variant. Because Sharp pipelines are lazy, each `clone()...toBuffer()` re-executed the *entire* chain from scratch — including the expensive Lanczos3 upscale — three times per image instead of once.

The upscale factor was also computed as `Math.ceil(1500 / maxDim)`, an integer-only scale that could overshoot badly: a 1499px image (1px short of the 1500px target) would get `ceil(1.0006) = 2`, doubling it to ~3000px for no accuracy benefit, and roughly doubling every downstream OCR cost.

**First fix attempt (later corrected the same day):** materializing the shared chain once via `.toBuffer()` without an explicit output format. This introduced a *new* bug: the intermediate buffer was encoded to a lossy container format (Sharp's implicit default), and each variant then decoded that already-compressed buffer and re-encoded its own output — a double lossy round-trip. Testing against sample labels caught this: on one image it flipped a "99%" reading to "00%", silently dropping the polyester match entirely. Fixed by using `.raw()` (uncompressed pixels) for the intermediate buffer instead, with `{ raw: { width, height, channels: 1 } }` passed into each variant's `sharp(baseBuffer, rawOptions)` call, and each variant explicitly encoding its own final output as `.png()`.

Variant names `variant1`/`variant2`/`variant3` were also renamed to `sharpened`/`highContrastBinarized`/`blurredBinarized` for readability — no behavior change.

---

## Stage 2 — OCR: always ran all 9 passes (superseded 2026-07-04)

> Superseded by: early-exit once a result clears confidence ≥ 85 and confident-word-count ≥ 5, plus a 20s timeout per pass. See current "Stage 2 — OCR" section in `technical-documentation.md`.

Previously `extractText()` always tried every (variant × PSM mode) combination — 9 Tesseract passes — even after an early pass already produced a clean, high-confidence read, wasting time on every upload. There was also no bound on how long a single pass could take, so a pathological image could hang a request indefinitely.

---

## Stage 3 — Text Cleaning: global `rn → m` replace, no-op `fi` ligature fix (superseded 2026-07-04)

> Superseded by: per-token `rn → m` candidate matching inside `matchMaterial()`, and a corrected ligature regex. See current "Stage 3 — Text Cleaning" and "Stage 5 — Material Matching" sections in `technical-documentation.md`.

The `OCR_FIXES` list previously included `[/rn/g, 'm']`, applied globally to the *entire* raw OCR text before any material matching happened. This could corrupt any legitimate word containing "rn" (brand names, country listings, etc.) anywhere on the label, not just genuine OCR misreads inside a material name. It has been removed from the global fix list and reimplemented as a per-token candidate inside `matchMaterial()` (Stage 5): each token is tried both as-is and with `rn → m` applied, scoped to just that token during exact/Levenshtein/Soundex matching.

Separately, `[/fi/g, 'fi']` was meant to normalize the "fi" ligature character but was written with an ASCII "fi" on both sides of the regex — a no-op that never matched anything. Corrected to `[/ﬁ/g, 'fi']`, matching the actual U+FB01 ligature character.
