# ThreadLightly — Further Pipeline Improvements

Follow-ups identified while testing and fixing the image-to-text pipeline (`src/pipeline/`) in the previous session. Each item includes what was observed, why it matters, and a suggested approach — not yet implemented.

---

## 1. Background clutter defeats OCR on non-cropped photos

**Observed:** `sample-labels/test-image1.jpg` and `test-image2.jpg` — both photos where the fabric tag is a small feature against a blurred, textured (plaid/wrinkled) background — fail to extract usable text, or extract only a partial match. OCR reads the busy background as garbage text rather than isolating the tag.

**Why it matters:** This is the single biggest remaining accuracy gap. No amount of PSM-mode tuning or thresholding fixes it — the OCR engine is being asked to read the wrong region of the photo.

**Suggested approach:** Detect and crop to the label/tag region before running OCR (e.g. contour/rectangle detection for a light-colored tag against fabric, or a lightweight bounding-box model). This is a bigger scope item than anything else on this list — worth scoping as its own piece of work.

---

## 2. Uneven/directional lighting still breaks extraction

**Observed:** Of the synthetic poor-lighting variants generated for testing (uniform dim, dim+blur, and single-side "uneven" shadow), the uniform-dim variants are handled fine by existing preprocessing, but the **uneven-shadow** variant of the one otherwise-reliable sample (`test-image0`) fails to match any materials.

**Why it matters:** You specifically flagged that real-world labels will often be photographed in moderate-to-poor, uneven lighting (a single indoor light source, shadows from garment folds). The current preprocessing uses **fixed global thresholds** (128 and 140 in `preprocess.js`), which can't compensate for one side of a tag being lit differently from the other.

**Suggested approach:** Replace (or add as a 4th variant) an adaptive/local thresholding technique — e.g. Sharp's local contrast tools, or a manual sliding-window threshold — that adjusts per image region instead of applying one global cutoff.

---

## 3. Partial material extraction — labels with multiple materials sometimes only return one

**Observed:** `test-image1.jpg`'s label reads "55% cotton / 45% polyester", but the pipeline currently returns only "55% Conventional Cotton" — the polyester line is dropped. Confidence is correctly flagged `low` (percentages sum to 55%, outside the 85–115% high-confidence band), but the score/rating shown to the user (Bad, 20) is based on an incomplete read, not a true reflection of the garment.

**Why it matters:** A partial match that still produces a score/rating could mislead a user into thinking they have the full picture. Worth deciding whether "low confidence" partial results should still show a score at all, or whether the UI should more strongly signal "we could only read part of this label."

**Suggested approach:** Investigate why the second material line isn't being extracted (OCR text-quality vs. regex/line-filtering issue in `matchMaterials`/`cleanText`) — likely needs a debugging pass with the raw OCR text side-by-side with the cleaned text. Separately, consider whether `analyze.js`/the frontend should treat `confidence: 'low'` results differently (e.g. show a warning banner rather than a plain score).

---

## 4. Short-token fuzzy matching produces false-positive material matches

**Observed:** On `test-image0`, the matcher consistently also returns a spurious "1% PLA" match alongside the correct "99% Virgin Polyester / 1% Spandex" — traced to the OCR fragment "POLI" (from a truncated/repeated "POLIESTER" in the multilingual label) fuzzy-matching to "PLA" via the Levenshtein pass (edit distance ≤2 on a very short token). A separate synthetic test (`test-image1-uneven`) produced a different spurious match ("3% Conventional Hemp") from noise text under harsh degradation.

**Why it matters:** Short tokens (3–4 characters) have a much higher chance of accidentally matching an unrelated material within edit-distance 2, especially once matched against a database of 36+ multilingual synonym entries. These are low-percentage (1–3%) entries, so they don't swing the score much today, but it's still fabricated data shown to the user.

**Suggested approach:** Consider raising the minimum token length for the Levenshtein pass (currently ≥4 chars), tightening the distance threshold for short tokens specifically (e.g. distance ≤1 for tokens under 5–6 chars), or cross-checking candidate matches against surrounding context before accepting a match under ~3%.

---

## 5. No cross-request worker pooling or concurrency limits

**Observed (not load-tested, carried over from the original review):** Each `/api/analyze` request creates its own Tesseract worker via `createWorker()` in `extractText()`. This is now reused *within* a single request (fixed last session), but there's still no pooling or queueing *across* simultaneous requests. Multiple concurrent uploads would each spin up their own worker (and Sharp resize jobs), competing for CPU/memory with no backpressure.

**Why it matters:** Fine for a single user testing locally; could cause memory pressure or slow responses under real concurrent load (e.g. a few people uploading at once on a small server).

**Suggested approach:** A bounded worker pool (`Tesseract.createScheduler`) sized to available CPU cores, and/or a concurrency-limited queue (e.g. `p-queue`) in front of `/api/analyze` that returns a "server busy, try again" response rather than accepting unbounded simultaneous work.

---

## 6. `tessedit_char_whitelist` likely doesn't do anything

**Observed:** The OCR worker runs Tesseract's LSTM engine (OEM 1), which is documented to not reliably honor `tessedit_char_whitelist` — that's a legacy-engine (OEM 0) feature. The whitelist is still set in `ocr.js` and documented as restricting output, but it's probably inert.

**Why it matters:** Minor, but the code/docs currently imply filtering happens that likely doesn't. Not causing any known accuracy problem today since the downstream matcher already tolerates noise.

**Suggested approach:** Either confirm definitively (test with/without the whitelist and diff output) and remove the dead parameter, or switch to OEM 0 (legacy engine, which does honor it) if whitelist filtering turns out to meaningfully help — would need its own accuracy comparison since the legacy engine has different OCR characteristics overall.

---

## Testing infrastructure note

A test harness (`harness.js`) was built during the last session to run the full pipeline (`preprocess` → `extractText` → `matchMaterials` → `score`) against `sample-labels/` plus synthetic poor-lighting variants (dim, dim+blur, uneven-shadow) generated from those same images, reporting timing and match results per image. It currently lives only in a scratch directory from that session. Worth porting into the repo (e.g. a `scripts/` or `test/` folder) so future pipeline changes can be regression-tested the same way rather than rebuilding this from scratch each time.
