import { useEffect, useMemo, useRef, useState } from 'react'
import {
  checkAdminSession,
  createQuestion,
  deleteQuestion,
  fetchAdminQuestions,
  importAdminQuestions,
  loginAdmin,
  logoutAdmin,
  resetAdminQuestions,
  updateQuestion,
} from './lib/api.js'

const emptyForm = {
  category: '',
  points: 10,
  prompt: '',
  correctAnswer: '',
  wrongAnswers: ['', '', ''],
}

function cleanQuestion(question) {
  return {
    category: question.category.trim(),
    points: Number(question.points),
    prompt: question.prompt.trim(),
    correctAnswer: question.correctAnswer.trim(),
    wrongAnswers: question.wrongAnswers.map((answer) => answer.trim()),
  }
}

function isValidQuestion(question) {
  return (
    question.category &&
    question.prompt &&
    question.correctAnswer &&
    Number.isFinite(question.points) &&
    question.points > 0 &&
    question.wrongAnswers.length === 3 &&
    question.wrongAnswers.every(Boolean)
  )
}

function toFormQuestion(question) {
  return {
    category: question.category,
    points: question.points,
    prompt: question.prompt,
    correctAnswer: question.correctAnswer,
    wrongAnswers: [...question.wrongAnswers],
  }
}

function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await loginAdmin(password)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-grid">
      <section className="admin-login">
        <p className="eyebrow">Administration</p>
        <h2>Acces back-office</h2>

        <form onSubmit={handleSubmit} className="stack-form">
          <label className="form-field">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button button--primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}

function TextField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="form-field">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  )
}

export default function BackOffice({ categories, onDataChange }) {
  const fileInputRef = useRef(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [questions, setQuestions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return questions
      .filter((question) => categoryFilter === 'all' || question.category === categoryFilter)
      .filter((question) => {
        if (!normalizedSearch) {
          return true
        }

        return `${question.prompt} ${question.category} ${question.correctAnswer}`
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort((a, b) => b.id - a.id)
  }, [questions, search, categoryFilter])

  async function loadQuestions() {
    setLoading(true)
    setMessage('')

    try {
      const data = await fetchAdminQuestions()
      setQuestions(data)
      setAuthenticated(true)
    } catch (err) {
      setAuthenticated(false)
      setMessage(err.message || 'Impossible de charger les questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function verifySession() {
      setCheckingSession(true)

      try {
        await checkAdminSession()
        setAuthenticated(true)
      } catch {
        setAuthenticated(false)
      } finally {
        setCheckingSession(false)
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadQuestions()
    }
  }, [authenticated])

  if (checkingSession) {
    return (
      <main className="page-grid">
        <section className="admin-login">
          <p className="eyebrow">Administration</p>
          <h2>Verification de la session...</h2>
        </section>
      </main>
    )
  }

  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />
  }

  function updateWrongAnswer(index, value) {
    setForm((current) => ({
      ...current,
      wrongAnswers: current.wrongAnswers.map((answer, answerIndex) => (
        answerIndex === index ? value : answer
      )),
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const question = cleanQuestion(form)
    if (!isValidQuestion(question)) {
      setMessage('Tous les champs sont obligatoires.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      if (editingId) {
        const updated = await updateQuestion(editingId, question)
        setQuestions((current) => current.map((item) => (item.id === editingId ? updated : item)))
        setMessage('Question modifiee.')
      } else {
        const created = await createQuestion(question)
        setQuestions((current) => [created, ...current])
        setMessage('Question ajoutee.')
      }

      resetForm()
      await onDataChange()
    } catch (err) {
      setMessage(err.message || 'Enregistrement impossible')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(question) {
    setEditingId(question.id)
    setForm(toFormQuestion(question))
    setMessage('')
  }

  async function handleDelete(questionId) {
    if (!window.confirm('Supprimer cette question ?')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await deleteQuestion(questionId)
      setQuestions((current) => current.filter((question) => question.id !== questionId))
      if (editingId === questionId) {
        resetForm()
      }
      setMessage('Question supprimee.')
      await onDataChange()
    } catch (err) {
      setMessage(err.message || 'Suppression impossible')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetData() {
    if (!window.confirm('Remettre les questions initiales ?')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const data = await resetAdminQuestions()
      setQuestions(data)
      resetForm()
      setMessage('Questions initiales restaurees.')
      await onDataChange()
    } catch (err) {
      setMessage(err.message || 'Reset impossible')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await logoutAdmin()
    } finally {
      setQuestions([])
      setMessage('')
      resetForm()
    }
    setAuthenticated(false)
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quiz-questions.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw)

      if (!Array.isArray(parsed)) {
        throw new Error('Format JSON invalide')
      }

      const imported = parsed.map(cleanQuestion)
      if (!imported.every(isValidQuestion)) {
        throw new Error('Une ou plusieurs questions sont incompletes')
      }

      const data = await importAdminQuestions(imported)
      setQuestions(data)
      resetForm()
      setMessage(`${data.length} questions importees.`)
      await onDataChange()
    } catch (err) {
      setMessage(err.message || 'Import impossible')
    } finally {
      event.target.value = ''
      setLoading(false)
    }
  }

  return (
    <main className="admin-layout">
      <section className="admin-toolbar">
        <div>
          <p className="eyebrow">Back-office</p>
          <h2>Gestion des questions</h2>
        </div>

        <div className="button-row">
          <button type="button" className="button" onClick={exportData} disabled={loading}>
            Export JSON
          </button>
          <button type="button" className="button" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            Import JSON
          </button>
          <button type="button" className="button button--danger" onClick={handleResetData} disabled={loading}>
            Reset
          </button>
          <button type="button" className="button" onClick={handleLogout}>
            Deconnexion
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importData} />
        </div>
      </section>

      <section className="admin-grid">
        <form className="question-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">{editingId ? `Question #${editingId}` : 'Nouvelle question'}</p>
            <h3>{editingId ? 'Modifier' : 'Ajouter'}</h3>
          </div>

          <TextField
            label="Categorie"
            value={form.category}
            onChange={(value) => setForm((current) => ({ ...current, category: value }))}
          />
          <TextField
            label="Points"
            type="number"
            value={form.points}
            onChange={(value) => setForm((current) => ({ ...current, points: Number(value) }))}
          />
          <label className="form-field form-field--wide">
            Question
            <textarea
              value={form.prompt}
              onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
              required
            />
          </label>
          <TextField
            label="Bonne reponse"
            value={form.correctAnswer}
            onChange={(value) => setForm((current) => ({ ...current, correctAnswer: value }))}
          />
          {form.wrongAnswers.map((answer, index) => (
            <TextField
              key={index}
              label={`Mauvaise reponse ${index + 1}`}
              value={answer}
              onChange={(value) => updateWrongAnswer(index, value)}
            />
          ))}

          {message && <p className="form-message">{message}</p>}

          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={loading}>
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            {editingId && (
              <button type="button" className="button" onClick={resetForm} disabled={loading}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <section className="question-list">
          <div className="list-controls">
            <label className="form-field">
              Recherche
              <input value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="form-field">
              Categorie
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Toutes</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Categorie</th>
                  <th>Pts</th>
                  <th>Question</th>
                  <th>Reponse</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.id}</td>
                    <td>{question.category}</td>
                    <td>{question.points}</td>
                    <td>{question.prompt}</td>
                    <td>{question.correctAnswer}</td>
                    <td>
                      <div className="button-row">
                        <button type="button" className="button button--compact" onClick={() => handleEdit(question)}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="button button--compact button--danger"
                          onClick={() => handleDelete(question.id)}
                        >
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
      </section>
    </main>
  )
}
