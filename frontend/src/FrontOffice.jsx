import { useEffect, useState } from 'react'

const API = '/api'

export default function FrontOffice() {
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    // On recupere les categories au chargement pour afficher le menu du quiz.
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then(setCategories)
  }, [])

  const loadQuestion = (cat) => {
    const url = cat ? `${API}/question?categorie=${encodeURIComponent(cat)}` : `${API}/question`

    fetch(url)
      .then((r) => r.json())
      .then((q) => {
        // Si l'API renvoie une erreur, on reste sur l'ecran de selection.
        setQuestion(q.error ? null : q)
        setSelectedAnswer('')
        setFeedback(q.error || null)
      })
  }

  const handleStart = (cat) => {
    // Quand on change de categorie, on repart sur un score propre.
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
        <h2>Choisir une categorie</h2>
        {feedback && typeof feedback === 'string' && <p className="message message--error">{feedback}</p>}
        <button onClick={() => handleStart('')} className="button list-button">
          Toutes les categories
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => handleStart(cat)} className="button list-button">
            {cat}
          </button>
        ))}
      </main>
    )
  }

  return (
    <main className="quiz quiz--question">
      <div className="quiz-meta">
        <span><strong>Categorie :</strong> {question.categorie}</span>
        <span><strong>Score :</strong> {score} pts ({total} questions)</span>
      </div>
      <div className="points">{question.nb_point} points</div>
      <h2>{question.question}</h2>
      <div>
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
      {feedback && typeof feedback === 'object' && (
        <div className="feedback">
          <p className={feedback.correct ? 'message message--success' : 'message message--error'}>
            {feedback.correct
              ? 'Bonne reponse.'
              : `Mauvaise reponse. La bonne reponse etait : ${feedback.correct_answer}`}
          </p>
          <div className="button-row">
            <button onClick={() => loadQuestion(selectedCat)} className="button">
              Question suivante
            </button>
            <button onClick={() => { setQuestion(null); setFeedback(null) }} className="button">
              Changer de categorie
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
