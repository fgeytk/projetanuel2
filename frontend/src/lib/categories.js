const PALETTE = [
  '#ffc42a',
  '#56c7ff',
  '#ffe66d',
  '#ff8a1f',
  '#d98a00',
  '#e7cfa1',
  '#f4b000',
]

export function getCategoryColor(category) {
  if (!category) {
    return '#ffc42a'
  }
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[index]
}

export function categoryLabel(category) {
  return category || 'Tous les thèmes'
}
