import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext } from './authContextValue'
import {
  login as apiLogin,
  register as apiRegister,
  clearTokens,
  getRefreshToken,
  refreshTokens,
  setAccessToken,
  storeRefreshToken,
  getMe,
} from '../lib/api'

function buildUser(account) {
  if (!account?.id) return null
  return {
    id: account.id,
    username: account.username,
    role: account.is_admin ? 'admin' : account.role,
    firstName: account.first_name ?? '',
    lastName: account.last_name ?? '',
    activeWorkspace: account.active_workspace,
    emailVerified: account.email_verified,
    photo: account.profile_picture,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [status, setStatus] = useState('loading')
  const refreshTimer        = useRef(null)

  const scheduleRefresh = useCallback(function schedule() {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      const ok = await refreshTokens()
      if (ok) schedule()
      else     handleLogout()
    }, 55 * 60 * 1000)
  }, [])

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        if (getRefreshToken() && await refreshTokens()) {
          const account = await getMe()
          if (active) {
            setUser(buildUser(account))
            scheduleRefresh()
          }
        }
      } catch {
        if (active) clearTokens()
      } finally {
        if (active) setStatus('ready')
      }
    }
    restore()
    return () => { active = false; clearTimeout(refreshTimer.current) }
  }, [scheduleRefresh])

  async function handleLogin(username, password) {
    const data = await apiLogin(username, password)
    try {
      setUser(buildUser(await getMe()))
    } catch (error) {
      clearTokens()
      throw error
    }
    scheduleRefresh()
    return data
  }

  async function handleRegister(payload) {
    const data = await apiRegister(payload)
    if (data.access) {
      setAccessToken(data.access)
      if (data.refresh) storeRefreshToken(data.refresh)
      setUser(buildUser(await getMe()))
      scheduleRefresh()
    }
    return data
  }

  function handleLogout() {
    clearTokens()
    setUser(null)
    clearTimeout(refreshTimer.current)
  }

  const refreshUser = useCallback(async () => {
    const account = await getMe()
    setUser(buildUser(account))
    return account
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      status,
      login:    handleLogin,
      register: handleRegister,
      logout:   handleLogout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
