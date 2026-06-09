import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, loginUser, logoutUser, registerUser } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMe()
      setUser(data?.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (credentials) => {
    const nextUser = await loginUser(credentials)
    setUser(nextUser)
    return nextUser
  }, [])

  const register = useCallback(async (payload) => {
    const nextUser = await registerUser(payload)
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }
  return context
}
