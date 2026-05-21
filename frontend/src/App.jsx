import { useEffect, useState } from 'react'
import './App.css'

const API = '/api'

const emptyForm = {
  categorie: '',
  nb_point: 5,
  question: '',
  reponse_vrai: '',
  reponse_fausse1: '',
  reponse_fausse2: '',
  reponse_fausse3: '',
}

function Field({ label, name, value, onChange, type = 'text' }) {
  return (
    <label className="form-field">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required
        min={type === 'number' ? 1 : undefined}
      />
    </label>
  )
}

export default function App() {
  const [view, setView] = useState('quiz')
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [adminQuestions, setAdminQuestions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')

  const refreshCategories = () => {
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then(setCategories)
  }

  const loadAdminQuestions = () => {
    fetch(`${API}/admin/questions`)
      .then((r) => r.json())
      .then(setAdminQuestions)
  }

  useEffect(() => {
    refreshCategories()
  }, [])

  useEffect(() => {
    if (view === 'admin') {
      loadAdminQuestions()
    }
  }, [view])

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

  const handleFormChange = (event) => {
    const { name, value, type } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmitQuestion = (event) => {
    event.preventDefault()
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `${API}/admin/questions/${editingId}` : `${API}/admin/questions`

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.json()
          throw new Error(error.detail || 'Erreur API')
        }
        return r.json()
      })
      .then(() => {
        setAdminMessage(editingId ? 'Question modifiee.' : 'Question ajoutee.')
        resetForm()
        loadAdminQuestions()
        refreshCategories()
      })
      .catch((error) => setAdminMessage(error.message))
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      categorie: item.categorie,
      nb_point: item.nb_point,
      question: item.question,
      reponse_vrai: item.reponse_vrai,
      reponse_fausse1: item.reponse_fausse1,
      reponse_fausse2: item.reponse_fausse2,
      reponse_fausse3: item.reponse_fausse3,
    })
    setAdminMessage('')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Supprimer cette question ?')) {
      return
    }

    fetch(`${API}/admin/questions/${id}`, { method: 'DELETE' })
      .then((r) => {
        if (!r.ok) {
          throw new Error('Suppression impossible')
        }
      })
      .then(() => {
        setAdminMessage('Question supprimee.')
        loadAdminQuestions()
        refreshCategories()
        if (editingId === id) {
          resetForm()
        }
      })
      .catch((error) => setAdminMessage(error.message))
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quiz MVP</h1>
        <nav className="tabs">
          <button
            onClick={() => setView('quiz')}
            className={view === 'quiz' ? 'button tab-button tab-button--active' : 'button tab-button'}
          >
            Quiz
          </button>
          <button
            onClick={() => setView('admin')}
            className={view === 'admin' ? 'button tab-button tab-button--active' : 'button tab-button'}
          >
            Admin
          </button>
        </nav>
      </header>

      {view === 'quiz' ? renderQuiz() : renderAdmin()}
    </div>
  )

  function renderQuiz() {
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

  function renderAdmin() {
    return (
      <main className="admin">
        <section className="admin-section">
          <h2>{editingId ? 'Modifier une question' : 'Ajouter une question'}</h2>
          <form onSubmit={handleSubmitQuestion} className="question-form">
            <Field label="Categorie" name="categorie" value={form.categorie} onChange={handleFormChange} />
            <Field label="Points" name="nb_point" type="number" value={form.nb_point} onChange={handleFormChange} />
            <Field label="Question" name="question" value={form.question} onChange={handleFormChange} />
            <Field label="Bonne reponse" name="reponse_vrai" value={form.reponse_vrai} onChange={handleFormChange} />
            <Field label="Mauvaise reponse 1" name="reponse_fausse1" value={form.reponse_fausse1} onChange={handleFormChange} />
            <Field label="Mauvaise reponse 2" name="reponse_fausse2" value={form.reponse_fausse2} onChange={handleFormChange} />
            <Field label="Mauvaise reponse 3" name="reponse_fausse3" value={form.reponse_fausse3} onChange={handleFormChange} />
            <div className="button-row">
              <button type="submit" className="button button--primary">
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="button">
                  Annuler
                </button>
              )}
            </div>
          </form>
          {adminMessage && <p className="message">{adminMessage}</p>}
        </section>

        <section>
          <h2>Questions ({adminQuestions.length})</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {['ID', 'Categorie', 'Pts', 'Question', 'Bonne reponse', 'Actions'].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminQuestions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.categorie}</td>
                    <td>{item.nb_point}</td>
                    <td>{item.question}</td>
                    <td>{item.reponse_vrai}</td>
                    <td>
                      <div className="button-row">
                        <button onClick={() => handleEdit(item)} className="button">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="button button--danger">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }
}
