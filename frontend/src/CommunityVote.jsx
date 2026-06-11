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
    return 'A fait rire 😂'
  }
  if (status === 'rejected') {
    return 'Bide total'
  }
  return 'Sur scène'
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
      setError(err.message || 'Le jury est aux abonnés absents')
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
      setError('Entre ton nom de juré avant de voter.')
      return
    }

    setVotingId(explanationId)
    setError('')
    setMessage('')

    try {
      const updated = await voteExplanation(explanationId, cleanName, approve)
      setItems((current) => current.map((item) => (item.id === explanationId ? updated : item)))
      setMessage('Verdict enregistré.')
      await onVoteSaved()
    } catch (err) {
      setError(err.message || 'Verdict impossible à enregistrer')
    } finally {
      setVotingId(null)
    }
  }

  return (
    <main className="page-grid">
      <section className="vote-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Le jury du public 🎙️</p>
            <h2>Qui t'a fait rire ?</h2>
          </div>
          <button type="button" className="button" onClick={loadExplanations} disabled={loading}>
            Actualiser
          </button>
        </div>

        <label className="form-field vote-name-field">
          Ton nom de juré
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
          <p className="empty-state">Les vannes arrivent en coulisses...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">Aucune vanne à juger pour le moment. La scène est libre !</p>
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
                  <span>La réponse mise en boîte</span>
                  <strong>{item.correctAnswer}</strong>
                </div>

                <blockquote>{item.explanation}</blockquote>

                <div className="vote-meta">
                  <span>Par {item.playerName}</span>
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{item.proposedPoints} points en jeu</span>
                  <span>{item.validatedPoints} points validés par la salle</span>
                </div>

                <div className="vote-score">
                  <div>
                    <strong>{item.approveVotes}</strong>
                    <span>rires</span>
                  </div>
                  <div>
                    <strong>{item.rejectVotes}</strong>
                    <span>bides</span>
                  </div>
                  <div>
                    <strong>{item.totalVotes}</strong>
                    <span>verdicts</span>
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={votingId === item.id}
                    onClick={() => handleVote(item.id, true)}
                  >
                    😂 Ça m'a fait rire
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={votingId === item.id}
                    onClick={() => handleVote(item.id, false)}
                  >
                    Bof, bide
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
