import { useEffect, useState } from 'react'

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

function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API}/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Mot de passe incorrect')
        return
      }

      localStorage.setItem('adminToken', data.token)
      onSuccess()
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin">
      <section className="admin-section" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Acces BackOffice</h2>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez le mot de passe"
              required
              disabled={loading}
            />
          </label>
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={loading}>
              {loading ? 'Verification...' : 'Acceder'}
            </button>
          </div>
        </form>
        {error && <p className="message" style={{ color: '#d32f2f' }}>{error}</p>}
      </section>
    </main>
  )
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

export default function BackOffice() {
  const [questions, setQuestions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'))

  const loadQuestions = () => {
    const token = localStorage.getItem('adminToken')
    fetch(`${API}/admin/questions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem('adminToken')
          setIsAuthenticated(false)
        }
        return r.json()
      })
      .then(setQuestions)
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />
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

    // Le meme formulaire sert pour l'ajout et la modification.
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `${API}/admin/questions/${editingId}` : `${API}/admin/questions`
    const token = localStorage.getItem('adminToken')

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
        setMessage(editingId ? 'Question modifiee.' : 'Question ajoutee.')
        resetForm()
        loadQuestions()
      })
      .catch((error) => setMessage(error.message))
  }

  const handleEdit = (item) => {
    // On remet les valeurs de la ligne dans le formulaire pour pouvoir les modifier.
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
    setMessage('')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Supprimer cette question ?')) {
      return
    }

    const token = localStorage.getItem('adminToken')
    fetch(`${API}/admin/questions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error('Suppression impossible')
        }
      })
      .then(() => {
        setMessage('Question supprimee.')
        loadQuestions()
        if (editingId === id) {
          resetForm()
        }
      })
      .catch((error) => setMessage(error.message))
  }

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
        {message && <p className="message">{message}</p>}
      </section>

      <section>
        <h2>Questions ({questions.length})</h2>
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
              {questions.map((item) => (
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
