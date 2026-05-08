function calculateScore(performance, seo, rgpd) {
  if (
    typeof performance !== 'number' ||
    typeof seo !== 'number' ||
    typeof rgpd !== 'number'
  ) {
    throw new Error('Todos los valores deben ser numéricos');
  }

  return Math.round((performance * 0.4) + (seo * 0.3) + (rgpd * 0.3));
}

module.exports = calculateScore;