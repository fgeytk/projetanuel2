import { useState, useEffect } from 'react'

const API = '/api'

export default function App() {
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then(setCategories)
  }, [])

  const loadQuestion = (cat) => {
    const url = cat ? `${API}/question?categorie=${encodeURIComponent(cat)}` : `${API}/question`
    fetch(url)
      .then(r => r.json())
      .then(q => {
        setQuestion(q)
        setFeedback(null)
      })
  }

  const handleStart = (cat) => {
    setSelectedCat(cat)
    setScore(0)
    setTotal(0)
    loadQuestion(cat)
  }

  const handleAnswer = (answer) => {
    fetch(`${API}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answer })
    })
      .then(r => r.json())
      .then(result => {
        setFeedback(result)
        setTotal(t => t + 1)
        if (result.correct) {
          setScore(s => s + result.points)
        }
      })
  }

  const handleNext = () => {
    loadQuestion(selectedCat)
  }

  // Écran de sélection de catégorie
  if (!question) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Quiz MVP</h1>
        <p>Choisissez une catégorie :</p>
        <button
          onClick={() => handleStart('')}
          style={{ display: 'block', width: '100%', padding: 12, marginBottom: 8, fontSize: 16, cursor: 'pointer' }}
        >
          🎲 Toutes les catégories
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleStart(cat)}
            style={{ display: 'block', width: '100%', padding: 12, marginBottom: 8, fontSize: 16, cursor: 'pointer' }}
          >
            {cat}
          </button>
        ))}
      </div>
    )
  }

  // Écran de question
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span><strong>Catégorie :</strong> {question.categorie}</span>
        <span><strong>Score :</strong> {score} pts ({total} questions)</span>
      </div>
      <div style={{ marginBottom: 8, color: '#666' }}>{question.nb_point} points</div>
      <h2>{question.question}</h2>
      <div>
        {question.answers.map((ans, i) => {
          let bg = '#f0f0f0'
          if (feedback) {
            if (ans === feedback.correct_answer) bg = '#90ee90'
            else if (ans === question._selected && !feedback.correct) bg = '#ffcccb'
          }
          return (
            <button
              key={i}
              disabled={!!feedback}
              onClick={() => {
                question._selected = ans
                handleAnswer(ans)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: 12,
                marginBottom: 8,
                fontSize: 16,
                cursor: feedback ? 'default' : 'pointer',
                backgroundColor: bg,
                border: '1px solid #ccc',
                borderRadius: 4,
              }}
            >
              {ans}
            </button>
          )
        })}
      </div>
      {feedback && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: feedback.correct ? 'green' : 'red', fontWeight: 'bold' }}>
            {feedback.correct ? '✅ Bonne réponse !' : `❌ Mauvaise réponse. La bonne réponse était : ${feedback.correct_answer}`}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleNext}
              style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer' }}
            >
              Question suivante →
            </button>
            <button
              onClick={() => { setQuestion(null); setFeedback(null) }}
              style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer' }}
            >
              Changer de catégorie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
