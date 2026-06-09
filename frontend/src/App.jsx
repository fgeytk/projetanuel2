import { useCallback, useEffect, useMemo, useState } from 'react'
import BackOffice from './BackOffice.jsx'
import FrontOffice from './FrontOffice.jsx'
import Leaderboard from './Leaderboard.jsx'
import { fetchStats } from './lib/api.js'
import './App.css'

const emptyStats = {
  categories: [],
  bestScore: 0,
  gameCount: 0,
  maxScore: 0,
  questionCount: 0,
}

export default function App() {
  const [view, setView] = useState('play')
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const categoryNames = useMemo(() => stats.categories.map((category) => category.name), [stats.categories])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Projet annuel 2</p>
          <h1>Quiz Arena</h1>
        </div>

        <nav className="tabs" aria-label="Navigation principale">
          <button
            type="button"
            onClick={() => setView('play')}
            className={view === 'play' ? 'tab-button tab-button--active' : 'tab-button'}
          >
            Jouer
          </button>
          <button
            type="button"
            onClick={() => setView('leaderboard')}
            className={view === 'leaderboard' ? 'tab-button tab-button--active' : 'tab-button'}
          >
            Classement
          </button>
          <button
            type="button"
            onClick={() => setView('admin')}
            className={view === 'admin' ? 'tab-button tab-button--active' : 'tab-button'}
          >
            Admin
          </button>
        </nav>
      </header>

      <section className="summary-strip" aria-label="Statistiques du quiz">
        <div>
          <strong>{stats.questionCount}</strong>
          <span>questions</span>
        </div>
        <div>
          <strong>{stats.categories.length}</strong>
          <span>categories</span>
        </div>
        <div>
          <strong>{stats.maxScore}</strong>
          <span>points disponibles</span>
        </div>
        <div>
          <strong>{stats.bestScore}</strong>
          <span>record</span>
        </div>
      </section>

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
      ) : view === 'play' ? (
        <FrontOffice stats={stats} onScoreSaved={loadStats} onOpenLeaderboard={() => setView('leaderboard')} />
      ) : view === 'leaderboard' ? (
        <Leaderboard />
      ) : (
        <BackOffice categories={categoryNames} onDataChange={loadStats} />
      )}
    </div>
  )
}
