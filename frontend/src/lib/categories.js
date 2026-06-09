// Deterministic neon color per category name (shared across views).
const NEON_PALETTE = [
  '#2de2ff', // cyan
  '#ff3cac', // magenta
  '#845eff', // violet
  '#b8ff3c', // lime
  '#ffb73c', // amber
  '#ff6ad5', // pink
  '#5ad7ff', // sky
]

export function getCategoryColor(category) {
  if (!category) {
    return '#7c6cff'
  }
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % NEON_PALETTE.length
  return NEON_PALETTE[index]
}

export function categoryLabel(category) {
  return category || 'Toutes les catégories'
}
