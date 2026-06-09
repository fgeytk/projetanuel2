import { useEffect, useState } from 'react'
import { fetchLeaderboard } from './lib/api.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function Leaderboard() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadScores() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchLeaderboard(20)
      setScores(data)
    } catch (err) {
      setError(err.message || 'Classement indisponible')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScores()
  }, [])

  return (
    <main className="page-grid">
      <section className="leaderboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Competition</p>
            <h2>Classement des joueurs</h2>
          </div>
          <button type="button" className="button" onClick={loadScores} disabled={loading}>
            Actualiser
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Chargement du classement...</p>
        ) : scores.length === 0 ? (
          <p className="empty-state">Aucune partie enregistree pour le moment.</p>
        ) : (
          <div className="leaderboard-list">
            {scores.map((score, index) => (
              <article className="leaderboard-row" key={score.id}>
                <div className="rank">{index + 1}</div>
                <div>
                  <strong>{score.playerName}</strong>
                  <span>{score.category}</span>
                </div>
                <div className="leaderboard-score">
                  <strong>{score.score}</strong>
                  <span>
                    {score.correctAnswers}/{score.totalQuestions} bonnes reponses
                  </span>
                </div>
                <time>{formatDate(score.createdAt)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
