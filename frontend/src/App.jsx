import { useCallback, useEffect, useRef, useState } from 'react'
import BackOffice from './BackOffice.jsx'
import CommunityVote from './CommunityVote.jsx'
import FrontOffice from './FrontOffice.jsx'
import Leaderboard from './Leaderboard.jsx'
import Profile from './Profile.jsx'
import Avatar from './components/Avatar.jsx'
import AuthModal from './components/AuthModal.jsx'
import Hero from './components/Hero.jsx'
import ToastStack from './components/Toast.jsx'
import { useAuth } from './lib/AuthContext.jsx'
import { fetchStats } from './lib/api.js'

const emptyStats = {
  categories: [],
  bestScore: 0,
  donationPoints: 0,
  gameCount: 0,
  maxScore: 0,
  questionCount: 0,
  explanationCount: 0,
  voteCount: 0,
}

const NAV_ITEMS = [
  { id: 'home', label: 'Accueil' },
  { id: 'play', label: 'Jouer' },
  { id: 'leaderboard', label: 'Classement' },
  { id: 'votes', label: 'Le jury' },
]

function AccountMenu({ user, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function select(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar seed={user.avatarSeed || user.pseudo} size="sm" />
        <span className="account-menu__name">{user.pseudo}</span>
        <span className="account-menu__caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="account-menu__panel" role="menu" aria-label="Menu du compte">
          <button type="button" role="menuitem" onClick={() => select(() => onNavigate('profile'))}>
            Profil
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" onClick={() => select(() => onNavigate('admin'))}>
              Administration
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="account-menu__logout"
            onClick={() => select(onLogout)}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { user, ready, logout } = useAuth()
  const [view, setView] = useState('home')
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  const isAdmin = user?.role === 'admin'

  const pushToast = useCallback((toast) => {
    toastId.current += 1
    const id = toastId.current
    setToasts((current) => [...current, { id, ...toast }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const loadStats = useCallback(async () => {
    try {
      setError('')
      const nextStats = await fetchStats()
      setStats(nextStats)
    } catch (err) {
      setError(err.message || 'Backend indisponible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (!ready) {
      return
    }
    if (view === 'admin' && !isAdmin) {
      setView('home')
    }
    if (view === 'profile' && !user) {
      setView('home')
    }
  }, [ready, view, isAdmin, user])

  function goTo(id) {
    if (id === 'profile' && !user) {
      setAuthOpen(true)
      return
    }
    if (id === 'admin' && !isAdmin) {
      setView('home')
      return
    }
    setView(id)
  }

  async function handleLogout() {
    await logout()
    setView('home')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">QA</span>
          <div>
            <p className="eyebrow">Concours de vannes</p>
            <h1 style={{ fontSize: '1.6rem' }}>Quiz Arena</h1>
          </div>
        </div>

        <div className="nav-cluster">
          <nav className="tabs" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
                className={view === item.id ? 'tab-button tab-button--active' : 'tab-button'}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {user ? (
            <AccountMenu user={user} onNavigate={goTo} onLogout={handleLogout} />
          ) : (
            <button type="button" className="button button--primary button--compact" onClick={() => setAuthOpen(true)}>
              Se connecter
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="app-alert" role="alert">
          <strong>Backend indisponible</strong>
          <span>{error}</span>
        </div>
      )}

      <div id="contenu">
        {loading ? (
          <main className="page-grid">
            <section className="quiz-panel">
              <p className="eyebrow">Chargement</p>
              <h2>On chauffe la salle...</h2>
            </section>
          </main>
        ) : view === 'home' ? (
          <>
            <Hero stats={stats} user={user} onPlay={() => setView('play')} onOpenAuth={() => setAuthOpen(true)} />
            <section className="summary-strip" aria-label="Statistiques du quiz">
              <div>
                <strong>{stats.questionCount}</strong>
                <span>questions</span>
              </div>
              <div>
                <strong>{stats.categories.length}</strong>
                <span>catégories</span>
              </div>
              <div>
                <strong>{stats.bestScore}</strong>
                <span>record</span>
              </div>
              <div>
                <strong>{stats.donationPoints}</strong>
                <span>points de rire</span>
              </div>
              <div>
                <strong>{stats.explanationCount}</strong>
                <span>vannes lâchées</span>
              </div>
              <div>
                <strong>{stats.voteCount}</strong>
                <span>votes du public</span>
              </div>
            </section>
          </>
        ) : view === 'play' ? (
          <FrontOffice
            stats={stats}
            onScoreSaved={loadStats}
            onOpenLeaderboard={() => setView('leaderboard')}
            onBadges={(badges) =>
              badges.forEach((badge) =>
                pushToast({
                  variant: 'badge',
                  icon: badge.icon,
                  title: 'Nouveau badge !',
                  message: badge.name,
                }),
              )
            }
          />
        ) : view === 'leaderboard' ? (
          <Leaderboard />
        ) : view === 'votes' ? (
          <CommunityVote onVoteSaved={loadStats} />
        ) : view === 'profile' ? (
          <Profile onPlay={() => setView('play')} onOpenAuth={() => setAuthOpen(true)} />
        ) : isAdmin ? (
          <BackOffice categories={stats.categories.map((category) => category.name)} onDataChange={loadStats} />
        ) : null}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setView('profile')} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
