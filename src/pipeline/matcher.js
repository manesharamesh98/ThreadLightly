const natural = require('natural');
const { SYNONYM_MAP, MATERIALS } = require('./materials-db');

const tokenizer = new natural.WordTokenizer();
const soundEx = new natural.SoundEx();

// Common OCR character substitution errors on clothing labels
const OCR_FIXES = [
  [/\b([0O])([0-9])\b/g, (_, a, b) => `0${b}`],  // O5% → 05%
  [/\b([0-9])([lI])\b/g, (_, a) => `${a}1`],       // 9l% → 91%
  [/ﬁ/g, 'fi'],                                  // fi ligature (U+FB01) → "fi"
  [/96/g, '%'],                                       // 96 misread as %
  [/\bl\b/g, '1'],                                    // lone l → 1
];

/**
 * Levenshtein distance (edit distance) between two strings.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Finds the best matching material for a token.
 * Three passes: exact → Levenshtein ≤ 2 → Soundex phonetic.
 * Each pass also tries an "rn" → "m" corrected form of the token (a common
 * OCR misread), scoped to just this token rather than the whole raw text,
 * so it can't corrupt unrelated words elsewhere on the label.
 */
function matchMaterial(token) {
  const lower = token.toLowerCase();
  const rnFixed = lower.replace(/rn/g, 'm');
  const candidates = rnFixed !== lower ? [lower, rnFixed] : [lower];

  // Pass 1: Exact match
  for (const candidate of candidates) {
    if (SYNONYM_MAP.has(candidate)) return SYNONYM_MAP.get(candidate);
  }

  // Pass 2: Fuzzy Levenshtein (edit distance ≤ 2, token must be at least 4 chars)
  for (const candidate of candidates) {
    if (candidate.length < 4) continue;
    let bestMatch = null;
    let bestDist = 3; // threshold
    for (const [key, material] of SYNONYM_MAP) {
      if (Math.abs(key.length - candidate.length) > 2) continue; // Skip obviously wrong lengths
      const dist = levenshtein(candidate, key);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = material;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // Pass 3: Soundex phonetic match (catches multilingual variants)
  for (const candidate of candidates) {
    const soundex = soundEx.process(candidate);
    if (soundex) {
      for (const [key, material] of SYNONYM_MAP) {
        if (soundEx.process(key) === soundex) return material;
      }
    }
  }

  return null;
}

/**
 * Cleans raw OCR text: applies character fixes, strips noise lines.
 */
function cleanText(rawText) {
  let text = rawText;

  // Apply OCR fixes
  for (const [pattern, replacement] of OCR_FIXES) {
    text = text.replace(pattern, replacement);
  }

  // Keep only lines that contain % or known material-adjacent words
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const relevant = lines.filter(line => {
    const lower = line.toLowerCase();
    return (
      lower.includes('%') ||
      lower.includes('composition') ||
      lower.includes('material') ||
      lower.includes('fibre') ||
      lower.includes('fiber') ||
      lower.includes('fabric') ||
      lower.includes('content')
    );
  });

  // If filtering too aggressive, fall back to full text
  return relevant.length > 0 ? relevant.join(' ') : lines.join(' ');
}

/**
 * Extracts material + percentage pairs from cleaned text.
 * Handles both "99% Polyester" and "Polyester 99%" formats.
 */
function extractMaterialPairs(text) {
  const pairs = [];

  // Format A: number% word  e.g. "99% polyester"
  const formatA = /(\d{1,3})\s*%\s*([a-zA-ZÀ-ÿ\s]{2,20})/g;
  let match;
  while ((match = formatA.exec(text)) !== null) {
    const pct = parseInt(match[1], 10);
    const word = match[2].trim().split(/\s+/)[0]; // Take first word only
    if (pct > 0 && pct <= 100) pairs.push({ percentage: pct, token: word });
  }

  // Format B: word number%  e.g. "polyester 99%"
  const formatB = /([a-zA-ZÀ-ÿ]{3,20})\s+(\d{1,3})\s*%/g;
  while ((match = formatB.exec(text)) !== null) {
    const word = match[1].trim();
    const pct = parseInt(match[2], 10);
    if (pct > 0 && pct <= 100) pairs.push({ percentage: pct, token: word });
  }

  return pairs;
}

/**
 * Infers garment type from material composition.
 */
function inferGarmentType(materials) {
  const names = materials.map(m => m.name.toLowerCase()).join(' ');
  const hasSpandex = names.includes('spandex') || names.includes('elastane');
  const hasPolyester = names.includes('polyester');
  const hasCotton = names.includes('cotton');
  const hasWool = names.includes('wool');
  const hasSilk = names.includes('silk');
  const hasNylon = names.includes('nylon');

  if (hasSpandex && hasPolyester) return 'gym or activewear';
  if (hasSpandex && hasCotton) return 'stretch casual wear';
  if (hasWool) return 'knitwear or outerwear';
  if (hasSilk) return 'formal or luxury garment';
  if (hasNylon && hasSpandex) return 'swimwear or sportswear';
  if (hasCotton && !hasSpandex) return 'casual wear';
  return null;
}

/**
 * Main matcher: takes raw OCR text, returns structured materials array + confidence flag.
 */
function matchMaterials(rawText) {
  const cleaned = cleanText(rawText);
  const pairs = extractMaterialPairs(cleaned);

  // Deduplicate: if the same material appears multiple times keep the higher percentage
  const seen = new Map();
  for (const { token, percentage } of pairs) {
    const material = matchMaterial(token);
    if (!material) continue;
    const key = material.name;
    if (!seen.has(key) || seen.get(key).percentage < percentage) {
      seen.set(key, { ...material, percentage });
    }
  }

  const matched = [...seen.values()];

  // Validate: percentages should sum to ~100%
  const total = matched.reduce((sum, m) => sum + m.percentage, 0);
  const confidence = matched.length > 0 && total >= 85 && total <= 115 ? 'high' : 'low';

  return { materials: matched, confidence, rawText };
}

module.exports = { matchMaterials, inferGarmentType };
