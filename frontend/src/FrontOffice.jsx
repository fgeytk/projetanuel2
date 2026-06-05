import { useEffect, useState } from 'react'

const API = '/api'

function getCategoryHueFromString(cat) {
  if (!cat) return 210
  let hash = 0
  for (let i = 0; i < cat.length; i += 1) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash)
    hash &= hash
  }
  return Math.abs(hash) % 360
}

function getCategoryHueByIndex(index, count) {
  if (index < 0 || count <= 0) return 210
  return Math.round((index * 360) / count) % 360
}

function getCategoryColor(cat, categories = []) {
  if (!cat) return `hsl(210, 72%, 56%)`
  const index = categories.findIndex((category) => category === cat)
  const hue = index >= 0 ? getCategoryHueByIndex(index, categories.length) : getCategoryHueFromString(cat)
  return `hsl(${hue}, 72%, 56%)`
}

function getCategoryBg(cat, categories = [], alpha = 0.22) {
  const index = categories.findIndex((category) => category === cat)
  const hue = index >= 0 ? getCategoryHueByIndex(index, categories.length) : getCategoryHueFromString(cat)
  return `hsla(${hue}, 72%, 86%, ${alpha})`
}

function getContrastColor(color) {
  if (typeof color === 'string' && color.startsWith('hsl')) {
    const match = color.match(/hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*(\d+)%/i)
    if (match) {
      const lightness = Number(match[1])
      return lightness > 55 ? '#0f172a' : '#ffffff'
    }
  }

  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0f172a' : '#ffffff'
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return { r, g, b }
}

function hexToRgba(hex, alpha = 0.18) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function FrontOffice() {
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  const getCategoryColorWithPalette = (cat) => getCategoryColor(cat, categories)
  const getCategoryBgWithPalette = (cat, alpha = 0.22) => getCategoryBg(cat, categories, alpha)

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then(setCategories)
  }, [])

  const loadQuestion = (cat) => {
    const url = cat ? `${API}/question?categorie=${encodeURIComponent(cat)}` : `${API}/question`
    fetch(url)
      .then((r) => r.json())
      .then((q) => {
        setQuestion(q.error ? null : q)
        setSelectedAnswer('')
        setFeedback(q.error || null)
      })
  }

  const handleStart = (cat) => {
    setSelectedCat(cat)
    setScore(0)
    setTotal(0)
    loadQuestion(cat)
  }

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer)
    fetch(`${API}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answer }),
    })
      .then((r) => r.json())
      .then((result) => {
        setFeedback(result)
        setTotal((t) => t + 1)
        if (result.correct) {
          setScore((s) => s + result.points)
        }
      })
  }

  const getAnswerClassName = (answer) => {
    if (!feedback || typeof feedback !== 'object') {
      return 'button answer-button'
    }
    if (answer === feedback.correct_answer) {
      return 'button answer-button answer-button--correct'
    }
    if (answer === selectedAnswer && !feedback.correct) {
      return 'button answer-button answer-button--wrong'
    }
    return 'button answer-button'
  }

  if (!question) {
    return (
      <main className="quiz quiz--selection">
        <section className="card quiz-selection-card">
          <h2>Choisir une catégorie</h2>
          {feedback && typeof feedback === 'string' && <p className="message message--error">{feedback}</p>}
          <div className="selection-list">
            <button
              onClick={() => handleStart('')}
              className="button list-button button--primary"
              style={{
                borderLeft: `6px solid ${getCategoryColorWithPalette('')}`,
                background: getCategoryBgWithPalette(''),
                color: getContrastColor(getCategoryColorWithPalette('')),
              }}
            >
              Toutes les catégories
            </button>
            {categories.map((cat) => {
              const color = getCategoryColorWithPalette(cat)
              return (
                <button
                  key={cat}
                  onClick={() => handleStart(cat)}
                  className="button list-button"
                  style={{
                    borderLeft: `6px solid ${color}`,
                    background: getCategoryBgWithPalette(cat, 0.32),
                    color: getContrastColor(color),
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </section>
      </main>
    )
  }

  const catColor = getCategoryColorWithPalette(question.categorie || selectedCat)
  const textColor = getContrastColor(catColor)

  return (
    <main className="quiz quiz--question">
      <section
        className="card quiz-card"
        style={{
          borderLeft: `6px solid ${catColor}`,
          background: getCategoryBgWithPalette(question.categorie || selectedCat, 0.18),
          color: textColor,
        }}
      >
        <div className="quiz-meta">
          <span style={{ color: textColor }}><strong>Catégorie :</strong> {question.categorie}</span>
          <span style={{ color: textColor }}><strong>Score :</strong> {score} pts ({total} questions)</span>
        </div>
        <div className="points" style={{ background: getCategoryBgWithPalette(question.categorie || selectedCat, 0.35), color: textColor }}>{question.nb_point} points</div>
        <h2 className="quiz-question" style={{ color: textColor }}>{question.question}</h2>
        <div className="answers">
          {question.answers.map((answer) => (
            <button
              key={answer}
              disabled={!!feedback}
              onClick={() => handleAnswer(answer)}
              className={getAnswerClassName(answer)}
            >
              {answer}
            </button>
          ))}
        </div>
      </section>
      {feedback && typeof feedback === 'object' && (
        <div className="feedback">
          <p className={feedback.correct ? 'message message--success' : 'message message--error'}>
            {feedback.correct
              ? 'Bonne réponse.'
              : `Mauvaise réponse. La bonne réponse était : ${feedback.correct_answer}`}
          </p>
          <div className="button-row">
            <button onClick={() => loadQuestion(selectedCat)} className="button">
              Question suivante
            </button>
            <button onClick={() => { setQuestion(null); setFeedback(null) }} className="button">
              Changer de catégorie
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
