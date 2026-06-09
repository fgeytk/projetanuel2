import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './App.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
