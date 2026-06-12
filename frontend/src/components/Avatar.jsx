const GRADIENTS = [
  ['#6f4300', '#ffc42a'],
  ['#0f5f80', '#56c7ff'],
  ['#7a4f00', '#ffe66d'],
  ['#7a3300', '#ff8a1f'],
  ['#4f3510', '#e7cfa1'],
  ['#3b2a16', '#f4b000'],
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
