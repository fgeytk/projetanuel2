import { useState } from 'react'
import BackOffice from './BackOffice.jsx'
import FrontOffice from './FrontOffice.jsx'
import './App.css'

export default function App() {
  const [view, setView] = useState('quiz')

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Quiz Brain</h1>
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

      {view === 'quiz' ? <FrontOffice /> : <BackOffice />}
    </div>
  )
}
