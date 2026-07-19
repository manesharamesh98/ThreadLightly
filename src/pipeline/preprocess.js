const sharp = require('sharp');

/**
 * Preprocesses an image buffer for optimal Tesseract OCR performance.
 * Returns multiple variants so the OCR stage can try each and pick the best result.
 */
async function preprocess(inputBuffer) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Target: minimum 1500px on longest side for good OCR resolution.
  // Fractional scale (not ceil) avoids overshooting — e.g. a 1499px image
  // no longer gets doubled to ~3000px for a 1px shortfall.
  const maxDim = Math.max(metadata.width, metadata.height);
  const scale = maxDim < 1500 ? 1500 / maxDim : 1;

  // Materialize the shared base once — rotate/resize/grayscale is the
  // expensive step (lanczos3 upscale), so each variant below reuses this
  // buffer instead of re-running the whole chain via clone(). Output as
  // raw (uncompressed) pixels rather than the default encoded format —
  // encoding here and re-decoding per variant would be a lossy round trip
  // that degrades the pixels (and OCR digit accuracy) before the actual
  // variant-specific processing even runs.
  const width = Math.round(metadata.width * scale);
  const height = Math.round(metadata.height * scale);
  // .grayscale() collapses color to one channel but does NOT strip alpha —
  // a PNG/WebP/HEIC with transparency (all allowed by the upload filter)
  // would otherwise produce a 2-channel buffer while rawOptions assumes 1,
  // shearing every variant. removeAlpha() guarantees 1 channel; resolving
  // with the actual info object (rather than trusting our own width/height
  // math) is a second safety net against any other channel-count mismatch.
  const { data: baseBuffer, info: baseInfo } = await sharp(inputBuffer)
    .rotate()                       // Auto-rotate based on EXIF orientation
    .resize({
      width,
      height,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,  // High-quality upscale
    })
    .removeAlpha()
    .grayscale()
    .raw({ depth: 'uchar' })         // Force 8-bit output — a 16-bit source (e.g. a 16-bit PNG)
    .toBuffer({ resolveWithObject: true }); // would otherwise emit 2 bytes/pixel while the reads below assume 1

  const rawOptions = { raw: { width: baseInfo.width, height: baseInfo.height, channels: baseInfo.channels } };

  // Each variant's own output is PNG (lossless) — the raw intermediate
  // buffer above has no container format, so an explicit lossless format
  // must be specified here rather than left to Sharp's default guess.

  // Sharpened: normalised + sharpened (best for high-contrast labels)
  const sharpened = await sharp(baseBuffer, rawOptions)
    .normalize()
    .sharpen({ sigma: 1.5, m1: 1, m2: 2 })
    .png()
    .toBuffer();

  // High-contrast binarized: boosted contrast then thresholded to pure
  // black/white (best for low-contrast or faded labels)
  const highContrastBinarized = await sharp(baseBuffer, rawOptions)
    .normalize()
    .linear(1.8, -(128 * 0.8))     // Boost contrast
    .threshold(128)                  // Binarise to pure black/white
    .png()
    .toBuffer();

  // Blurred binarized: gentle blur to remove noise, then threshold
  // (best for noisy / textured labels)
  const blurredBinarized = await sharp(baseBuffer, rawOptions)
    .blur(1)
    .normalize()
    .threshold(140)
    .png()
    .toBuffer();

  return [sharpened, highContrastBinarized, blurredBinarized];
}

module.exports = { preprocess };
