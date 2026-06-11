const PALETTE = [
  '#c9a85c',
  '#8d9db1',
  '#9db884',
  '#c2795a',
  '#a87e8e',
  '#6f9a93',
  '#b9b0a0',
]

export function getCategoryColor(category) {
  if (!category) {
    return '#c9a85c'
  }
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[index]
}

export function categoryLabel(category) {
  return category || 'Tous les thèmes'
}
