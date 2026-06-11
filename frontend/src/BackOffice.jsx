import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCategory,
  createQuestion,
  deleteCategory,
  deleteQuestion,
  fetchAdminCategories,
  fetchAdminQuestions,
  importAdminQuestions,
  resetAdminQuestions,
  updateCategory,
  updateQuestion,
} from './lib/api.js'
import { useAuth } from './lib/AuthContext.jsx'

const emptyForm = {
  category: '',
  points: 10,
  prompt: '',
  correctAnswer: '',
  wrongAnswers: ['', '', ''],
  explanation: '',
  explanationKeywordsText: '',
}

function cleanQuestion(question) {
  const correctAnswer = String(question.correctAnswer || '').trim()
  const explanation = String(question.explanation || `La bonne reponse est ${correctAnswer}.`).trim()
  const keywordsText = String(question.explanationKeywordsText || '')
  const keywordsArray = Array.isArray(question.explanationKeywords) ? question.explanationKeywords : []

  return {
    category: String(question.category || '').trim(),
    points: Number(question.points),
    prompt: String(question.prompt || '').trim(),
    correctAnswer,
    wrongAnswers: (question.wrongAnswers || []).map((answer) => String(answer).trim()),
    explanation,
    explanationKeywords: keywordsText
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .concat(keywordsArray.map((keyword) => String(keyword).trim()).filter(Boolean)),
  }
}

function isValidQuestion(question) {
  return (
    question.category &&
    question.prompt &&
    question.correctAnswer &&
    question.explanation &&
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
    explanation: question.explanation || '',
    explanationKeywordsText: (question.explanationKeywords || []).join(', '),
  }
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
  const { user, ready } = useAuth()
  const isAdmin = user?.role === 'admin'

  const fileInputRef = useRef(null)
  const [questions, setQuestions] = useState([])
  const [adminCategories, setAdminCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
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
    } catch (err) {
      setMessage(err.message || 'Impossible de charger les questions')
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const data = await fetchAdminCategories()
      setAdminCategories(data)
    } catch (err) {
      setMessage(err.message || 'Impossible de charger les categories')
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadQuestions()
      loadCategories()
    }
  }, [isAdmin])

  // Défense en profondeur : le serveur refuse déjà (401/403), l'UI n'affiche rien sans rôle admin.
  if (!ready) {
    return (
      <main className="page-grid">
        <section className="admin-login">
          <p className="eyebrow">Administration</p>
          <h2>Vérification de la session...</h2>
        </section>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="page-grid">
        <section className="admin-login">
          <p className="eyebrow">Administration</p>
          <h2>Accès réservé</h2>
          <p className="result-copy">Cette section est réservée aux comptes administrateurs.</p>
        </section>
      </main>
    )
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
      await loadCategories()
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
      await loadCategories()
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
      await loadCategories()
    } catch (err) {
      setMessage(err.message || 'Reset impossible')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault()
    if (!newCategoryName.trim()) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await createCategory(newCategoryName)
      setNewCategoryName('')
      await loadCategories()
      await onDataChange()
      setMessage('Categorie ajoutee.')
    } catch (err) {
      setMessage(err.message || 'Creation de categorie impossible')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateCategory(event) {
    event.preventDefault()
    if (!editingCategoryId || !editingCategoryName.trim()) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await updateCategory(editingCategoryId, editingCategoryName)
      setEditingCategoryId(null)
      setEditingCategoryName('')
      await loadCategories()
      await loadQuestions()
      await onDataChange()
      setMessage('Categorie modifiee.')
    } catch (err) {
      setMessage(err.message || 'Modification de categorie impossible')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm('Supprimer cette categorie ?')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await deleteCategory(categoryId)
      await loadCategories()
      await onDataChange()
      setMessage('Categorie supprimee.')
    } catch (err) {
      setMessage(err.message || 'Suppression de categorie impossible')
    } finally {
      setLoading(false)
    }
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
      await loadCategories()
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
          <label className="form-field form-field--wide">
            Explication attendue
            <textarea
              value={form.explanation}
              onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
              required
            />
          </label>
          <label className="form-field form-field--wide">
            Mots-cles de validation
            <input
              value={form.explanationKeywordsText}
              onChange={(event) => setForm((current) => ({ ...current, explanationKeywordsText: event.target.value }))}
              placeholder="Ex : capitale, france, paris"
            />
          </label>

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

        <section className="question-form">
          <div className="section-heading">
            <p className="eyebrow">Categories</p>
            <h3>Gestion</h3>
          </div>

          <form className="category-admin-form" onSubmit={handleCreateCategory}>
            <label className="form-field">
              Nouvelle categorie
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
            </label>
            <button type="submit" className="button button--primary" disabled={loading}>
              Ajouter
            </button>
          </form>

          {editingCategoryId && (
            <form className="category-admin-form" onSubmit={handleUpdateCategory}>
              <label className="form-field">
                Renommer la categorie
                <input
                  value={editingCategoryName}
                  onChange={(event) => setEditingCategoryName(event.target.value)}
                />
              </label>
              <button type="submit" className="button button--primary" disabled={loading}>
                Enregistrer
              </button>
            </form>
          )}

          <div className="category-admin-list">
            {adminCategories.map((category) => (
              <div key={category.id}>
                <strong>{category.name}</strong>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() => {
                      setEditingCategoryId(category.id)
                      setEditingCategoryName(category.name)
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="button button--compact button--danger"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

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
