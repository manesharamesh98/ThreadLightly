// MADE-BY class → numeric score
const CLASS_SCORES = { A: 100, B: 80, C: 60, D: 40, E: 20, Unclassified: 30 };

function getRating(score) {
  if (score >= 80) return { rating: 'Great', description: 'This garment is made from highly sustainable materials. An excellent choice.' };
  if (score >= 60) return { rating: 'Good', description: 'This garment uses largely sustainable materials. A solid conscious choice.' };
  if (score >= 40) return { rating: 'OK', description: 'This garment has mixed sustainability. Consider whether you truly need it.' };
  return { rating: 'Bad', description: 'Obtaining this product is poor commitment to environmental responsibility.' };
}

/**
 * Calculates a weighted sustainability score from identified materials.
 * Score = Σ(material_class_score × percentage) / Σ(percentages)
 */
function score(materials) {
  if (!materials || materials.length === 0) return null;

  const totalPct = materials.reduce((sum, m) => sum + m.percentage, 0);
  if (totalPct === 0) return null;

  const weightedScore = materials.reduce((sum, m) => {
    const classScore = CLASS_SCORES[m.class] ?? 30;
    return sum + (classScore * m.percentage);
  }, 0) / totalPct;

  const finalScore = Math.round(weightedScore);
  const { rating, description } = getRating(finalScore);

  return { score: finalScore, rating, description };
}

module.exports = { score };
