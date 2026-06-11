// Avatar déterministe à partir d'un seed — palette feutrée, aucune dépendance.
const GRADIENTS = [
  ['#8a7a5c', '#c9a85c'],
  ['#5c6b7a', '#8d9db1'],
  ['#6b7a5c', '#9db884'],
  ['#7a5c50', '#c2795a'],
  ['#5c7a74', '#86a89f'],
  ['#7a6e5c', '#b9b0a0'],
]

function hashSeed(seed) {
  return [...String(seed)].reduce((total, char) => total + char.charCodeAt(0), 0)
}

export default function Avatar({ seed = '?', size = 'sm' }) {
  const hash = hashSeed(seed)
  const [from, to] = GRADIENTS[hash % GRADIENTS.length]
  const initials = String(seed).trim().slice(0, 2).toUpperCase() || '?'

  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
