const { createWorker } = require('tesseract.js');

// PSM modes to try in priority order
// 6 = uniform block of text (best for well-framed labels)
// 4 = single column of variable-sized text (fallback for tags with mixed line lengths)
// 11 = sparse text (catches scattered/broken-up characters — common on wrinkled fabric)
const PSM_MODES = [6, 4, 11];

const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%/ .,()-';

// Stop trying further variant/PSM combinations once a result is this confident —
// avoids grinding through all 9 passes when the first one is already a clean read.
const EARLY_EXIT_CONFIDENCE = 85;
const EARLY_EXIT_MIN_WORDS = 5;

// A single OCR pass on a pathological image can hang; this bounds how long
// we WAIT for one before moving on. Tesseract.js has no way to cancel an
// in-flight recognize() call, and the worker's job queue is serialized, so a
// truly stuck pass keeps occupying the worker in the background — subsequent
// passes queue up behind it and each individually times out in turn. Net
// effect: a genuinely hung pass costs up to ~PASS_TIMEOUT_MS × PSM_MODES.length
// × variants.length in the worst case, not a single bounded wait — this only
// guards against the request hanging forever, not against it becoming slow.
const PASS_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`OCR pass timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Runs OCR on a single image buffer with a given PSM mode, using an
 * already-initialized worker (params are set per call via setParameters).
 * Returns { text, confidence, wordCount }
 */
async function runOCR(worker, imageBuffer, psm) {
  await worker.setParameters({
    tessedit_pageseg_mode: String(psm),
    tessedit_char_whitelist: CHAR_WHITELIST,
    preserve_interword_spaces: '1',
  });
  const result = await withTimeout(worker.recognize(imageBuffer), PASS_TIMEOUT_MS);

  const words = result.data.words || [];
  const confidentWords = words.filter(w => w.confidence > 20);
  const avgConfidence = confidentWords.length > 0
    ? confidentWords.reduce((sum, w) => sum + w.confidence, 0) / confidentWords.length
    : 0;

  return {
    text: result.data.text,
    confidence: avgConfidence,
    wordCount: confidentWords.length,
  };
}

/**
 * Tries PSM modes across all image variants using one shared worker, stopping
 * early once a sufficiently confident result is found. Returns the text with
 * the highest average word confidence.
 */
async function extractText(imageVariants) {
  let best = { text: '', confidence: 0, wordCount: 0 };
  let longestText = '';

  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    outer:
    for (const imageBuffer of imageVariants) {
      for (const psm of PSM_MODES) {
        try {
          const result = await runOCR(worker, imageBuffer, psm);
          // Track longest raw text as fallback
          if (result.text.trim().length > longestText.length) {
            longestText = result.text;
          }
          // Prefer results with more confident words AND higher average confidence
          const score = result.confidence * Math.log1p(result.wordCount);
          const bestScore = best.confidence * Math.log1p(best.wordCount);
          if (score > bestScore) best = result;

          if (best.confidence >= EARLY_EXIT_CONFIDENCE && best.wordCount >= EARLY_EXIT_MIN_WORDS) {
            break outer;
          }
        } catch {
          // Skip failed/timed-out combinations silently
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  // If confidence scoring found nothing, fall back to longest text Tesseract returned
  return best.text.trim() || longestText;
}

module.exports = { extractText };
