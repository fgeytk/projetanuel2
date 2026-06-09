import { useEffect, useState } from 'react'
import { fetchPublicExplanations, voteExplanation } from './lib/api.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status) {
  if (status === 'accepted') {
    return 'Points confirmes'
  }
  if (status === 'rejected') {
    return 'Points refuses'
  }
  return 'En vote'
}

export default function CommunityVote({ onVoteSaved }) {
  const [items, setItems] = useState([])
  const [voterName, setVoterName] = useState('')
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadExplanations() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchPublicExplanations(36)
      setItems(data)
    } catch (err) {
      setError(err.message || 'Votes indisponibles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExplanations()
  }, [])

  async function handleVote(explanationId, approve) {
    const cleanName = voterName.trim()
    if (cleanName.length < 2) {
      setError('Entre un pseudo de votant avant de voter.')
      return
    }

    setVotingId(explanationId)
    setError('')
    setMessage('')

    try {
      const updated = await voteExplanation(explanationId, cleanName, approve)
      setItems((current) => current.map((item) => (item.id === explanationId ? updated : item)))
      setMessage('Vote enregistre.')
      await onVoteSaved()
    } catch (err) {
      setError(err.message || 'Vote impossible')
    } finally {
      setVotingId(null)
    }
  }

  return (
    <main className="page-grid">
      <section className="vote-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Vote communautaire</p>
            <h2>Qui merite ses points ?</h2>
          </div>
          <button type="button" className="button" onClick={loadExplanations} disabled={loading}>
            Actualiser
          </button>
        </div>

        <label className="form-field vote-name-field">
          Ton pseudo de votant
          <input
            value={voterName}
            onChange={(event) => setVoterName(event.target.value)}
            placeholder="Ex : Sam"
            maxLength={40}
          />
        </label>

        {message && <p className="form-message">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Chargement des explications...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">Aucune explication a arbitrer pour le moment.</p>
        ) : (
          <div className="vote-feed">
            {items.map((item) => (
              <article className="vote-card" key={item.id}>
                <header className="vote-card__header">
                  <div>
                    <p className="eyebrow">{item.category}</p>
                    <h3>{item.questionPrompt}</h3>
                  </div>
                  <span className={`status-pill status-pill--${item.communityStatus}`}>
                    {statusLabel(item.communityStatus)}
                  </span>
                </header>

                <div className="answer-reveal answer-reveal--compact">
                  <span>Reponse defendue</span>
                  <strong>{item.correctAnswer}</strong>
                </div>

                <blockquote>{item.explanation}</blockquote>

                <div className="vote-meta">
                  <span>Par {item.playerName}</span>
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{item.proposedPoints} points proposes</span>
                  <span>{item.validatedPoints} points confirmes</span>
                </div>

                <div className="vote-score">
                  <div>
                    <strong>{item.approveVotes}</strong>
                    <span>pour</span>
                  </div>
                  <div>
                    <strong>{item.rejectVotes}</strong>
                    <span>contre</span>
                  </div>
                  <div>
                    <strong>{item.totalVotes}</strong>
                    <span>votes</span>
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={votingId === item.id}
                    onClick={() => handleVote(item.id, true)}
                  >
                    Merite les points
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={votingId === item.id}
                    onClick={() => handleVote(item.id, false)}
                  >
                    Refuser les points
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
