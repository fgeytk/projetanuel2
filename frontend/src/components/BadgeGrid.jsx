export default function BadgeGrid({ badges }) {
  if (!badges || badges.length === 0) {
    return <p className="empty-state">Les badges apparaîtront en jouant.</p>
  }

  return (
    <div className="badge-grid">
      {badges.map((badge) => (
        <div key={badge.code} className={`badge ${badge.unlocked ? '' : 'badge--locked'}`} title={badge.description}>
          <span className="badge__icon">{badge.unlocked ? badge.icon : '🔒'}</span>
          <span className="badge__name">{badge.name}</span>
          <span className="badge__desc">{badge.description}</span>
        </div>
      ))}
    </div>
  )
}
