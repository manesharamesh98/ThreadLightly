# ThreadLightly — Technical Documentation

---

## Image-to-Text Pipeline

The analysis pipeline lives in `src/pipeline/` and is orchestrated by `analyzeImage()` in `src/pipeline/index.js`. It takes an image file path and returns a structured sustainability analysis. The pipeline is designed to be resilient to poor image quality — common when users photograph clothing labels in low light or at an angle.

```
Image file
    │
    ▼
[1] Preprocess      src/pipeline/preprocess.js
    │  3 image variants
    ▼
[2] OCR             src/pipeline/ocr.js
    │  raw text string
    ▼
[3] Clean text      src/pipeline/matcher.js → cleanText()
    │  filtered, corrected text
    ▼
[4] Extract pairs   src/pipeline/matcher.js → extractMaterialPairs()
    │  [{ token, percentage }]
    ▼
[5] Match materials src/pipeline/matcher.js → matchMaterial()
    │  [{ name, class, score, description, percentage }]
    ▼
[6] Score           src/pipeline/scorer.js → score()
    │
    ▼
{ score, rating, garmentType, materials[], confidence, rawText }
```

---

### Stage 1 — Preprocessing

**File:** `src/pipeline/preprocess.js`
**Input:** Raw image buffer (JPEG, PNG, WebP, HEIC)
**Output:** Array of 3 greyscale image buffers

OCR accuracy is highly sensitive to image quality. This stage normalises the input and generates three contrast-tuned variants so the OCR stage has the best possible material to work with.

**Steps applied to the shared base (computed once, not per-variant — see below):**
1. **Auto-rotate** — reads EXIF orientation metadata and corrects rotation, so a sideways phone photo is upright before OCR runs
2. **Upscale** — if the longest side is under 1500px, the image is scaled up (fractional factor, Lanczos3 kernel) to give Tesseract enough pixel density to read small label text. The factor is `1500 / maxDim`, not rounded up — a 1499px image is no longer needlessly doubled to ~3000px for a 1px shortfall.
3. **Remove alpha, then grayscale** — colour information is irrelevant for text. Alpha is stripped explicitly before grayscale conversion; `grayscale()` alone collapses color channels but does not remove transparency, so a PNG/WebP/HEIC upload with an alpha channel would otherwise leave a stray channel in the pixel buffer.

**Shared base materialization:** the rotate/resize/grayscale chain above is the expensive step (the Lanczos3 upscale). Rather than re-running this whole chain once per variant, it's computed once into a **raw (uncompressed) pixel buffer** via `sharp(...).raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true })`, and the returned `info.width/height/channels` (not assumed values) are reused as the `raw` decode options for each variant below. Forcing 8-bit depth explicitly guards against a 16-bit-per-channel source (e.g. a 16-bit PNG) emitting 2 bytes/pixel while the variant reads assume 1. Raw (not an encoded format like JPEG/PNG) is deliberate: encoding the shared buffer and re-decoding it per variant would be a lossy round trip that can measurably degrade OCR accuracy (confirmed in testing — it flipped a "99%" reading to "00%" on one sample, silently dropping a material match).

**The three variants** (each takes the shared raw buffer, applies its own processing, and encodes its own output as PNG):

| Variant | Processing | Best for |
|---------|-----------|---------|
| `sharpened` | `normalize()` + `sharpen(σ=1.5)` | Well-lit, high-contrast labels |
| `highContrastBinarized` | `normalize()` + `linear(1.8, -102)` + `threshold(128)` | Faded, low-contrast, or washed-out labels |
| `blurredBinarized` | `blur(1)` + `normalize()` + `threshold(140)` | Noisy, textured, or background-cluttered labels |

`highContrastBinarized` binarises the image to pure black and white, which is ideal for Tesseract's internal document model. `blurredBinarized` blurs first to suppress texture noise before binarisation.

If `metadata.width`/`metadata.height` can't be read (corrupt/malformed image), `preprocess()` throws — caught by the orchestrator (see "Pipeline Error Handling" below) and surfaced as the same friendly "couldn't read this label" message.

---

### Stage 2 — OCR

**File:** `src/pipeline/ocr.js`
**Input:** Array of 3 image buffers from Stage 1
**Output:** Single best-quality text string

Creates a single Tesseract worker (`createWorker('eng', 1, { logger })`) per `extractText()` call, reuses it across every (variant × PSM mode) combination via `worker.setParameters()` before each `worker.recognize()` call, and terminates it once in a `finally` block. Selects the result with the highest confidence score. (Previously each combination called the one-shot `Tesseract.recognize()` helper, which silently ignored the PSM/whitelist options and re-initialized a worker per call — see `technical-documentation-deprecated.md`.)

**PSM modes tried (in priority order):**

| PSM | Mode | Best for |
|-----|------|---------|
| 6 | Uniform block of text | Neatly formatted composition labels |
| 4 | Single column of variable-sized text | Single-column tags where PSM 6 misreads line boundaries |
| 11 | Sparse text, no OSD | Labels with scattered or multi-column text, or text broken up by fabric wrinkles |

**Scoring function:**

Each OCR run produces a list of words with individual confidence values (0–100). Words below confidence 20 are discarded as noise. The remaining words are used to compute:

```
score = avgConfidence × log(1 + wordCount)
```

The `log(1 + wordCount)` factor prevents a single high-confidence word from beating a longer, slightly less confident extraction. The combination (variant + PSM) with the highest score wins.

**Fallback:** If no combination scores above zero, the run that produced the longest raw text string is returned instead.

**Early exit:** the loop stops trying further variant/PSM combinations as soon as a result clears confidence ≥ 85 and confident-word-count ≥ 5 — a clean early read skips the remaining passes rather than always running all 9.

**Per-pass timeout:** each individual OCR pass is bounded to 20 seconds via `Promise.race`, so a pathological image can't hang a request forever. Caveat: Tesseract.js cannot cancel an in-flight `recognize()` call, and the worker's job queue is serialized — so a truly stuck pass keeps running in the background, and subsequent passes queue up behind it, each timing out in turn. This bounds the *total* wait (worst case ~20s × up to 9 passes) rather than capping any single pass at exactly 20s; it prevents an unbounded hang, not a slow one.

**Character whitelist** is set via `tessedit_char_whitelist` to alphanumerics, `%`, `/`, `.`, `,`, `(`, `)`, `-` and space. Note: this worker runs the LSTM engine (OEM 1), which is known to not reliably honor `tessedit_char_whitelist` (a legacy-engine/OEM 0 feature) — treat this as best-effort, not a guarantee, and don't assume downstream text is pre-filtered.

---

### Stage 3 — Text Cleaning

**File:** `src/pipeline/matcher.js` → `cleanText()`
**Input:** Raw OCR text string
**Output:** Cleaned, filtered text string

OCR on clothing labels introduces predictable errors. This stage applies targeted fixes before any parsing happens.

**OCR character substitution fixes (applied to the whole raw text):**

| Pattern | Fix | Reason |
|---------|-----|--------|
| `O5%` → `05%` | Leading `O` before digit | `O` misread as zero |
| `9l%` → `91%` | Digit + `l` or `I` | `1` misread as `l` or `I` |
| `ﬁ` → `fi` | U+FB01 ligature character | Normalize the "fi" ligature to plain ASCII |
| `96` → `%` | Any occurrence | `%` misread as `96` |
| lone `\bl\b` → `1` | Isolated `l` | Standalone `l` almost always means `1` on a label |

**Note:** `rn` → `m` (a common OCR misread, e.g. a split "m" read as "rn") is *not* in this whole-text list. It used to be, but applying it globally could corrupt unrelated words containing "rn" anywhere on the label (brand names, country listings, etc.). It's now applied per-token, scoped inside `matchMaterial()` (Stage 5) — see below.

**Line filtering:**
The cleaned text is split into lines. Only lines containing `%` or any of the keywords `composition`, `material`, `fibre`, `fiber`, `fabric`, or `content` are kept. This discards irrelevant label text (washing instructions, country of origin, brand names).

If the filter is too aggressive and removes everything, the full text is used as a fallback.

---

### Stage 4 — Pair Extraction

**File:** `src/pipeline/matcher.js` → `extractMaterialPairs()`
**Input:** Cleaned text string
**Output:** Array of `{ token, percentage }` objects

Two regex patterns cover both label formats found in the wild:

**Format A** — percentage first:
```
99% Polyester   →   { token: 'Polyester', percentage: 99 }
```
Regex: `/(\d{1,3})\s*%\s*([a-zA-ZÀ-ÿ\s]{2,20})/g`

**Format B** — material first:
```
Polyester 99%   →   { token: 'Polyester', percentage: 99 }
```
Regex: `/([a-zA-ZÀ-ÿ]{3,20})\s+(\d{1,3})\s*%/g`

Only percentages in the range 1–100 are accepted. The extended character range `À-ÿ` captures accented characters common in French, Spanish, Italian, and German material names.

---

### Stage 5 — Material Matching

**File:** `src/pipeline/matcher.js` → `matchMaterial()`
**Reference data:** `src/pipeline/materials-db.js`
**Input:** Array of `{ token, percentage }` pairs
**Output:** Array of matched material objects with percentage attached

Each extracted token is run through three matching passes in sequence. The first pass to succeed wins.

**Pass 1 — Exact synonym match**
Looks up the lowercased token in `SYNONYM_MAP`, a flat `Map` built at startup from all material names and their multilingual synonyms. If found, returns the material immediately. This handles the common case correctly with zero ambiguity.

**Pass 2 — Levenshtein fuzzy match (edit distance ≤ 2)**
Only runs for tokens ≥ 4 characters. Computes edit distance between the token and every key in `SYNONYM_MAP`. Skips keys whose length differs by more than 2 (a fast pre-filter). Returns the closest match with distance < 3. Catches OCR typos like `polyster` → `polyester`.

**Pass 3 — Soundex phonetic match**
Uses Natural.js `SoundEx` to encode both the token and every synonym key. If any key shares the same Soundex code, that material is returned. This catches phonetic variants common in multilingual labels (e.g. French `soie` → `silk`).

**`rn` → `m` OCR correction (per-token, all three passes):** each token is tried both as typed and with `rn` replaced by `m` (e.g. a token OCR'd as "cottorn" is also tried as "cottom"). Both candidates are tried at every pass, in order (uncorrected token first), so the correction only ever affects the single token being matched — not the whole raw text.

**Deduplication:**
If the same canonical material name appears multiple times (e.g. `polyester 60%` and `polyester 20%`), only the higher-percentage entry is kept.

**Confidence flag:**
After matching, all percentages are summed. If the total falls between 85% and 115%, confidence is `'high'` — the label was read completely. Outside this range, confidence is `'low'`, indicating a partial read.

**The materials database (`materials-db.js`)** contains 36 materials across 5 MADE-BY classes plus an Unclassified group:

| Class | Score | Count | Examples |
|-------|-------|-------|---------|
| A | 100 | 6 | Recycled polyester, organic hemp, recycled cotton |
| B | 80 | 7 | Organic cotton, TENCEL, Chemically recycled nylon |
| C | 60 | 4 | Conventional flax/linen, hemp, ramie, PLA |
| D | 40 | 3 | Modal, acrylic, virgin polyester |
| E | 20 | 8 | Cotton, viscose, rayon, spandex, nylon, wool |
| Unclassified | 30 | 8 | Silk, cashmere, leather, alpaca, mohair |

Each material entry includes multilingual synonyms covering English, French, Spanish, German, and Italian. `SYNONYM_MAP` is built once at module load time for O(1) lookups.

---

### Stage 6 — Scoring

**File:** `src/pipeline/scorer.js`
**Input:** Array of matched material objects (each with `class` and `percentage`)
**Output:** `{ score, rating, description }`

**Formula:**

```
score = Σ(class_score × percentage) / Σ(percentages)
```

This is a percentage-weighted average. A garment that is 80% Class E cotton and 20% Class B organic cotton scores:

```
(20 × 80 + 80 × 20) / 100 = 32
```

The denominator uses the sum of matched percentages, not 100, so partial reads (confidence `'low'`) still produce a valid score proportional to what was detected.

**MADE-BY class → numeric score mapping:**

| Class | Score |
|-------|-------|
| A | 100 |
| B | 80 |
| C | 60 |
| D | 40 |
| E | 20 |
| Unclassified | 30 |

**Rating thresholds:**

| Score range | Rating | Description shown to user |
|-------------|--------|--------------------------|
| ≥ 80 | Great | Highly sustainable materials. An excellent choice. |
| 60 – 79 | Good | Largely sustainable. A solid conscious choice. |
| 40 – 59 | OK | Mixed sustainability. Consider whether you truly need it. |
| < 40 | Bad | Poor commitment to environmental responsibility. |

---

### Garment Type Inference

**File:** `src/pipeline/matcher.js` → `inferGarmentType()`
**Input:** Matched materials array
**Output:** Human-readable garment category string (or `null`)

Runs after scoring, as a supplementary signal. Derives the likely garment type from which materials are present:

| Material combination | Inferred type |
|---------------------|--------------|
| Spandex + Polyester | gym or activewear |
| Spandex + Cotton | stretch casual wear |
| Wool (any) | knitwear or outerwear |
| Silk (any) | formal or luxury garment |
| Nylon + Spandex | swimwear or sportswear |
| Cotton only | casual wear |
| None of the above | `null` |

---

### Pipeline Error Handling

The orchestrator (`pipeline/index.js`) returns a structured error object rather than throwing, so the API route can send a meaningful message to the user. The upload file is read via `fs.promises.readFile` (not the blocking `readFileSync`), so one large upload doesn't stall the event loop for other in-flight requests.

Reading the file, preprocessing, and OCR are wrapped in a single try/catch: a corrupt/malformed image, an unsupported format that slips past validation, or a pass that hits the OCR timeout all surface as the same friendly message rather than an uncaught exception reaching Express. The error is also logged server-side (`console.error`) so a genuine bug is still visible, distinct from a merely bad photo.

| Failure point | Error message returned |
|--------------|----------------------|
| File read / preprocess / OCR throws (corrupt image, bad dimensions, etc.) | "We couldn't read this label. Try better lighting or a closer shot." |
| OCR returns < 5 characters | "We couldn't read this label. Try better lighting or a closer shot." |
| No materials matched | "No materials found. Make sure the composition label is fully in frame." |
| Score calculation fails | "Could not calculate a score from the identified materials." |

**Route-level fallback:** `routes/analyze.js` also wraps `analyzeImage()` in a try/catch (e.g. covering a DB write failure after a successful analysis) so the client always gets a JSON response — `{ success: false, error: '...' }` with a 500 status — instead of a bare Express error page. The uploaded temp file is always deleted in a `finally`, regardless of outcome.
