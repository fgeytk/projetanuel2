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
  { id: 'votes', label: 'Votes' },
  { id: 'profile', label: 'Profil' },
  { id: 'admin', label: 'Admin' },
]

export default function App() {
  const { user, logout } = useAuth()
  const [view, setView] = useState('home')
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

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

  function goTo(id) {
    if (id === 'profile' && !user) {
      setAuthOpen(true)
      return
    }
    setView(id)
  }

  async function handleLogout() {
    await logout()
    if (view === 'profile') {
      setView('home')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">QA</span>
          <div>
            <p className="eyebrow">Quiz argumenté</p>
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
                className={view === item.id ? 'tab-button tab-button--active' : 'tab-button'}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {user ? (
            <div className="auth-pill">
              <Avatar seed={user.avatarSeed || user.pseudo} size="sm" />
              <span className="auth-pill__name">{user.pseudo}</span>
              <button type="button" className="button button--compact button--ghost" onClick={handleLogout}>
                Quitter
              </button>
            </div>
          ) : (
            <button type="button" className="button button--primary button--compact" onClick={() => setAuthOpen(true)}>
              Se connecter
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="app-alert">
          <strong>Backend indisponible</strong>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <main className="page-grid">
          <section className="quiz-panel">
            <p className="eyebrow">Chargement</p>
            <h2>Connexion au backend...</h2>
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
              <span>points solidaires</span>
            </div>
            <div>
              <strong>{stats.explanationCount}</strong>
              <span>explications</span>
            </div>
            <div>
              <strong>{stats.voteCount}</strong>
              <span>votes publics</span>
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
      ) : (
        <BackOffice categories={stats.categories.map((category) => category.name)} onDataChange={loadStats} />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setView('profile')} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
