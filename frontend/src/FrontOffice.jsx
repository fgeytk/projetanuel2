import { useMemo, useState } from 'react'
import { fetchRandomQuestion, saveScore, submitExplanation } from './lib/api.js'

const ALL_CATEGORIES = ''
const QUESTION_LIMITS = [5, 10, 15]

function getCategoryColor(category) {
  const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4d7c0f']
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getCategoryTotal(stats, category) {
  if (!category) {
    return stats.questionCount
  }

  return stats.categories.find((item) => item.name === category)?.count || 0
}

function categoryLabel(category) {
  return category || 'Toutes categories'
}

export default function FrontOffice({ stats, onScoreSaved, onOpenLeaderboard }) {
  const [playerName, setPlayerName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [questionCount, setQuestionCount] = useState(10)
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [result, setResult] = useState(null)
  const [finished, setFinished] = useState(false)
  const [savedScore, setSavedScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [error, setError] = useState('')

  const categoryCards = useMemo(() => stats.categories, [stats.categories])
  const availableQuestions = getCategoryTotal(stats, selectedCategory)
  const normalizedQuestionCount = Math.min(questionCount, availableQuestions || questionCount)
  const progress = session ? Math.round((session.answered / session.questionLimit) * 100) : 0
  const shouldFinish = Boolean(session && result && session.answered >= session.questionLimit)

  async function loadQuestion(category, excludedIds) {
    setLoading(true)
    setError('')

    try {
      const question = await fetchRandomQuestion(category, excludedIds)
      setCurrentQuestion(question)
      setExplanation('')
      setResult(null)
      return { question, done: false }
    } catch (err) {
      if (err.status === 404) {
        return { question: null, done: true }
      }

      setError(err.message || 'Impossible de charger une question')
      return { question: null, done: false }
    } finally {
      setLoading(false)
    }
  }

  async function startSession(event) {
    event.preventDefault()

    const cleanName = playerName.trim()
    if (cleanName.length < 2) {
      setError('Le pseudo doit contenir au moins 2 caracteres.')
      return
    }

    const limit = Math.max(1, Math.min(normalizedQuestionCount, availableQuestions || normalizedQuestionCount))
    const nextSession = {
      playerName: cleanName,
      category: selectedCategory,
      questionLimit: limit,
      answered: 0,
      answeredIds: [],
      correctAnswers: 0,
      possibleScore: 0,
      score: 0,
    }

    setSession(nextSession)
    setFinished(false)
    setSavedScore(null)

    const { done } = await loadQuestion(selectedCategory, [])
    if (done) {
      setSession(null)
      setError('Aucune question disponible pour cette selection.')
    }
  }

  function resetToStart() {
    setSession(null)
    setCurrentQuestion(null)
    setExplanation('')
    setResult(null)
    setFinished(false)
    setSavedScore(null)
    setError('')
  }

  async function finishSession(finalSession = session) {
    if (!finalSession) {
      return
    }

    setCurrentQuestion(null)
    setResult(null)
    setFinished(true)

    if (savedScore || finalSession.answered === 0) {
      return
    }

    setSavingScore(true)
    setError('')

    try {
      const score = await saveScore({
        playerName: finalSession.playerName,
        category: categoryLabel(finalSession.category),
        score: finalSession.score,
        possibleScore: finalSession.possibleScore,
        totalQuestions: finalSession.answered,
        correctAnswers: finalSession.correctAnswers,
      })
      setSavedScore(score)
      await onScoreSaved()
    } catch (err) {
      setError(err.message || 'Score non enregistre')
    } finally {
      setSavingScore(false)
    }
  }

  async function handleExplanationSubmit(event) {
    event.preventDefault()

    if (!currentQuestion || result || loading || !session) {
      return
    }

    if (explanation.trim().length < 8) {
      setError('Explique ta reponse avec une phrase un peu plus complete.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const answerResult = await submitExplanation(currentQuestion.id, explanation)
      const nextSession = {
        ...session,
        answered: session.answered + 1,
        answeredIds: [...session.answeredIds, currentQuestion.id],
        correctAnswers: session.correctAnswers + (answerResult.correct ? 1 : 0),
        possibleScore: session.possibleScore + currentQuestion.points,
        score: session.score + answerResult.points,
      }

      setResult(answerResult)
      setSession(nextSession)
    } catch (err) {
      setError(err.message || "Impossible de verifier l'explication")
    } finally {
      setLoading(false)
    }
  }

  async function goNext() {
    if (!session || loading) {
      return
    }

    if (session.answered >= session.questionLimit) {
      await finishSession(session)
      return
    }

    const { done } = await loadQuestion(session.category, session.answeredIds)
    if (done) {
      await finishSession(session)
    }
  }

  if (!session) {
    return (
      <main className="play-layout">
        <section className="start-panel">
          <div className="section-heading">
            <p className="eyebrow">Nouvelle partie</p>
            <h2>Entre dans l'arene</h2>
          </div>

          <form className="start-form" onSubmit={startSession}>
            <label className="form-field">
              Pseudo
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Ex : Alex"
                maxLength={40}
                required
              />
            </label>

            <label className="form-field">
              Categorie
              <select
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value)
                  setError('')
                }}
              >
                <option value={ALL_CATEGORIES}>Toutes les categories</option>
                {categoryCards.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="choice-group" aria-label="Nombre de questions">
              {QUESTION_LIMITS.map((limit) => (
                <button
                  type="button"
                  key={limit}
                  className={questionCount === limit ? 'choice-button choice-button--active' : 'choice-button'}
                  onClick={() => setQuestionCount(limit)}
                >
                  {limit}
                </button>
              ))}
            </div>

            <button type="submit" className="button button--primary" disabled={loading || availableQuestions === 0}>
              {loading ? 'Preparation...' : 'Lancer la partie'}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </section>

        <section className="category-panel">
          <div className="section-heading">
            <p className="eyebrow">Categories</p>
            <h2>Choix rapide</h2>
          </div>

          <div className="category-grid">
            <button
              type="button"
              className={selectedCategory === ALL_CATEGORIES ? 'category-tile category-tile--active' : 'category-tile'}
              onClick={() => setSelectedCategory(ALL_CATEGORIES)}
            >
              <span className="category-swatch" style={{ backgroundColor: '#111827' }} />
              <strong>Toutes les categories</strong>
              <span>{stats.questionCount} questions</span>
            </button>

            {categoryCards.map((category) => (
              <button
                type="button"
                className={selectedCategory === category.name ? 'category-tile category-tile--active' : 'category-tile'}
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="category-swatch" style={{ backgroundColor: getCategoryColor(category.name) }} />
                <strong>{category.name}</strong>
                <span>{category.count} questions</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  if (finished) {
    const successRate = session.answered > 0 ? Math.round((session.correctAnswers / session.answered) * 100) : 0

    return (
      <main className="page-grid">
        <section className="result-panel">
          <div>
            <p className="eyebrow">Partie terminee</p>
            <h2>{session.score} points</h2>
          </div>

          <div className="result-grid">
            <div>
              <strong>{session.playerName}</strong>
              <span>joueur</span>
            </div>
            <div>
              <strong>{session.correctAnswers}/{session.answered}</strong>
              <span>bonnes reponses</span>
            </div>
            <div>
              <strong>{successRate}%</strong>
              <span>reussite</span>
            </div>
            <div>
              <strong>{categoryLabel(session.category)}</strong>
              <span>categorie</span>
            </div>
            <div>
              <strong>{session.score}</strong>
              <span>points solidaires</span>
            </div>
          </div>

          {savingScore && <p className="form-message">Enregistrement du score...</p>}
          {savedScore && <p className="form-message">Score enregistre dans le classement.</p>}
          {error && <p className="form-error">{error}</p>}

          <div className="button-row">
            <button type="button" className="button button--primary" onClick={resetToStart}>
              Rejouer
            </button>
            <button type="button" className="button" onClick={onOpenLeaderboard}>
              Voir le classement
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-grid">
      <section className="quiz-panel">
        {currentQuestion ? (
          <>
            <div className="quiz-status">
              <div>
                <p className="eyebrow">{categoryLabel(session.category)}</p>
                <h2>{currentQuestion.prompt}</h2>
              </div>
              <div className="score-box">
                <span>{session.playerName}</span>
                <strong>{session.score}</strong>
              </div>
            </div>

            <div className="progress-track" aria-label={`${progress}% de progression`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="question-meta">
              <span>{currentQuestion.points} points</span>
              <span>
                Question {session.answered + (result ? 0 : 1)} / {session.questionLimit}
              </span>
            </div>

            <div className="answer-reveal">
              <span>Reponse a defendre</span>
              <strong>{currentQuestion.correctAnswer}</strong>
            </div>

            <form className="explanation-form" onSubmit={handleExplanationSubmit}>
              <label className="form-field">
                Ton explication
                <textarea
                  value={explanation}
                  onChange={(event) => setExplanation(event.target.value)}
                  placeholder="Explique pourquoi cette reponse est correcte..."
                  disabled={Boolean(result) || loading}
                  required
                />
              </label>

              {!result && (
                <button type="submit" className="button button--primary" disabled={loading}>
                  {loading ? 'Validation...' : "Valider l'explication"}
                </button>
              )}
            </form>

            {result && (
              <div className={result.correct ? 'feedback feedback--success' : 'feedback feedback--error'}>
                <strong>{result.correct ? 'Explication validee' : 'Explication insuffisante'}</strong>
                <span>{result.correct ? `+${result.points} points` : result.expectedExplanation}</span>
                {result.matchedKeywords?.length > 0 && (
                  <small>Mots-cles reconnus : {result.matchedKeywords.join(', ')}</small>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="eyebrow">Chargement</p>
            <h2>Question en cours de chargement...</h2>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="button-row button-row--split">
          <button type="button" className="button" onClick={resetToStart}>
            Quitter
          </button>
          {result && (
            <button type="button" className="button button--primary" disabled={loading} onClick={goNext}>
              {shouldFinish ? 'Voir le resultat' : 'Question suivante'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
