import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

export default function AuthModal({ initialMode = 'login', onClose, onSuccess }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (pseudo.trim().length < (mode === 'register' ? 3 : 2)) {
      setError('Pseudo trop court.')
      return
    }
    if (mode === 'register' && password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }

    setLoading(true)
    try {
      const user =
        mode === 'register'
          ? await register({ pseudo: pseudo.trim(), password, email: email.trim() })
          : await login({ pseudo: pseudo.trim(), password })
      onSuccess?.(user)
      onClose()
    } catch (err) {
      setError(err.message || 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Connexion">
        <div className="modal__head">
          <div>
            <p className="eyebrow">Quiz Brain</p>
            <h2>{mode === 'register' ? 'Rejoins la troupe' : 'Connexion'}</h2>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal__tabs">
          <button type="button" data-active={mode === 'login'} onClick={() => setMode('login')}>
            Connexion
          </button>
          <button type="button" data-active={mode === 'register'} onClick={() => setMode('register')}>
            Inscription
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Nom de scène
            <input
              value={pseudo}
              onChange={(event) => setPseudo(event.target.value)}
              placeholder="Ex : NeonAlex"
              maxLength={40}
              autoFocus
              required
            />
          </label>

          {mode === 'register' && (
            <label className="form-field">
              Email (optionnel)
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="toi@exemple.fr"
                maxLength={160}
              />
            </label>
          )}

          <label className="form-field">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              maxLength={128}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button button--primary" disabled={loading}>
            {loading ? 'Patiente...' : mode === 'register' ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
