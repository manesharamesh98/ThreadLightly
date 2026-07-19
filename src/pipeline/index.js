const { preprocess } = require('./preprocess');
const { extractText } = require('./ocr');
const { matchMaterials, inferGarmentType } = require('./matcher');
const { score } = require('./scorer');
const fs = require('fs');

/**
 * Full pipeline: image file path → analysis result
 */
async function analyzeImage(imagePath) {
  let variants;
  let rawText;
  try {
    const inputBuffer = await fs.promises.readFile(imagePath);

    // Stage 1 & 2: Normalize + Preprocess → 3 image variants
    variants = await preprocess(inputBuffer);

    // Stage 3: OCR → best raw text across all variants and PSM modes
    rawText = await extractText(variants);
  } catch (err) {
    // Corrupt/malformed image, unsupported format, or a hung OCR pass —
    // surface the same friendly message a low-quality photo would get.
    // Logged so a genuine bug (vs. a bad image) is still visible server-side.
    console.error('analyzeImage pipeline error:', err);
    return {
      success: false,
      error: "We couldn't read this label. Try better lighting or a closer shot.",
    };
  }

  if (!rawText || rawText.trim().length < 5) {
    return {
      success: false,
      error: "We couldn't read this label. Try better lighting or a closer shot.",
    };
  }

  // Stage 4 & 5: Clean text + Fuzzy match materials
  const { materials, confidence } = matchMaterials(rawText);

  if (materials.length === 0) {
    return {
      success: false,
      error: "No materials found. Make sure the composition label is fully in frame.",
    };
  }

  // Stage 6: Score
  const result = score(materials);
  if (!result) {
    return {
      success: false,
      error: "Could not calculate a score from the identified materials.",
    };
  }

  const garmentType = inferGarmentType(materials);

  return {
    success: true,
    score: result.score,
    rating: result.rating,
    ratingDescription: result.description,
    garmentType,
    confidence,
    materials: materials.map(m => ({
      name: m.name,
      percentage: m.percentage,
      class: m.class,
      description: m.description,
    })),
    rawText,
  };
}

module.exports = { analyzeImage };
