// Deterministic neon avatar from a seed string — no external dependency.
const GRADIENTS = [
  ['#2de2ff', '#845eff'],
  ['#ff3cac', '#845eff'],
  ['#b8ff3c', '#2de2ff'],
  ['#ffb73c', '#ff3cac'],
  ['#5ad7ff', '#ff6ad5'],
  ['#845eff', '#2de2ff'],
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
