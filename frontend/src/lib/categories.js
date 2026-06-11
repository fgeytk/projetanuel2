// Couleur déterministe par catégorie (palette feutrée, partagée entre vues).
const PALETTE = [
  '#c9a85c', // laiton
  '#8d9db1', // ardoise
  '#9db884', // sauge
  '#c2795a', // terre cuite
  '#a87e8e', // vieux rose
  '#6f9a93', // céladon
  '#b9b0a0', // sable
]

export function getCategoryColor(category) {
  if (!category) {
    return '#c9a85c'
  }
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[index]
}

export function categoryLabel(category) {
  return category || 'Toutes les catégories'
}
