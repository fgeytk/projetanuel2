import { useEffect, useState } from 'react'
import { fetchProfile } from './lib/api.js'
import { useAuth } from './lib/AuthContext.jsx'
import Avatar from './components/Avatar.jsx'
import BadgeGrid from './components/BadgeGrid.jsx'

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function Profile({ onPlay, onOpenAuth }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    fetchProfile()
      .then((profile) => active && setData(profile))
      .catch((err) => active && setError(err.message || 'Profil indisponible'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [user])

  if (!user) {
    return (
      <main className="page-grid">
        <section className="profile-panel">
          <div className="section-heading">
            <p className="eyebrow">Loge</p>
            <h2>Connecte-toi pour suivre ta carrière d'humoriste</h2>
          </div>
          <p className="result-copy">
            Crée un compte pour décrocher tes badges, garder l'historique de tes passages et réserver
            ton nom de scène au classement.
          </p>
          <div className="button-row">
            <button type="button" className="button button--primary" onClick={onOpenAuth}>
              Se connecter
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="page-grid">
        <section className="profile-panel">
          <p className="empty-state">Chargement du profil...</p>
        </section>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="page-grid">
        <section className="profile-panel">
          <p className="form-error">{error || 'Profil indisponible'}</p>
        </section>
      </main>
    )
  }

  const { stats, badges, attempts, progress } = data
  const unlockedCount = badges.filter((badge) => badge.unlocked).length

  return (
    <main className="page-grid">
      <section className="profile-panel">
        <div className="profile-header">
          <Avatar seed={user.avatarSeed || user.pseudo} size="lg" />
          <div className="profile-id">
            <p className="eyebrow">Fiche d'humoriste</p>
            <h2>{user.pseudo}</h2>
            <span className="chip">{unlockedCount} badge{unlockedCount > 1 ? 's' : ''} débloqué{unlockedCount > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-tile">
            <strong>{stats.games}</strong>
            <span>passages sur scène</span>
          </div>
          <div className="stat-tile">
            <strong>{stats.bestScore}</strong>
            <span>meilleur score</span>
          </div>
          <div className="stat-tile">
            <strong>{stats.donationPoints}</strong>
            <span>points de rire</span>
          </div>
          <div className="stat-tile">
            <strong>{stats.acceptedExplanations}</strong>
            <span>vannes qui ont cartonné</span>
          </div>
        </div>

        {stats.games === 0 && (
          <div className="button-row">
            <button type="button" className="button button--primary" onClick={onPlay}>
              Faire mon premier passage
            </button>
          </div>
        )}
      </section>

      <section className="profile-panel">
        <div className="section-heading">
          <p className="eyebrow">Collection</p>
          <h2>Badges</h2>
        </div>
        <BadgeGrid badges={badges} />
      </section>

      <section className="profile-panel">
        <div className="section-heading">
          <p className="eyebrow">Progression</p>
          <h2>Par thème</h2>
        </div>
        {progress.length === 0 ? (
          <p className="empty-state">Fais quelques passages pour voir ta progression.</p>
        ) : (
          <div className="progress-list">
            {progress.map((item) => {
              const width = Math.max(6, Math.min(100, item.bestScore))
              return (
                <div className="progress-row" key={item.category}>
                  <div>
                    <strong>{item.category}</strong>
                    <span>{item.games} passage{item.games > 1 ? 's' : ''}</span>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${width}%` }} />
                  </div>
                  <div>
                    <strong>{item.bestScore}</strong>
                    <span>record</span>
                  </div>
                  <div>
                    <strong>{item.donationPoints}</strong>
                    <span>de rire</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="profile-panel">
        <div className="section-heading">
          <p className="eyebrow">Historique</p>
          <h2>Tes derniers passages</h2>
        </div>
        {attempts.length === 0 ? (
          <p className="empty-state">Aucun passage pour le moment.</p>
        ) : (
          <div className="history-list">
            {attempts.map((attempt) => (
              <div className="history-row" key={attempt.id}>
                <div>
                  <strong>{attempt.category}</strong>
                  <span>{attempt.correctAnswers}/{attempt.totalQuestions} vannes qui passent</span>
                </div>
                <strong>{attempt.score} pts</strong>
                <span>{formatDate(attempt.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
