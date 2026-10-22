/**
 * API client — all requests go through /api/ which Vite proxies to Django.
 * JWT access token is stored in memory; refresh token in localStorage.
 */

const BASE = '/api'

// ─── Token store (access token kept only in memory) ──────────────────────────
let _accessToken = null

export function setAccessToken(token) {
  _accessToken = token
}

export function getAccessToken() {
  return _accessToken
}

export function clearTokens() {
  _accessToken = null
  localStorage.removeItem('refresh_token')
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function storeRefreshToken(token) {
  localStorage.setItem('refresh_token', token)
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function request(method, path, { body, signal, auth = true } = {}) {
  const multipart = body instanceof FormData
  const headers = { Accept: 'application/json' }
  if (!multipart) headers['Content-Type'] = 'application/json'

  if (auth && _accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers,
    body: body !== undefined ? (multipart ? body : JSON.stringify(body)) : undefined,
    signal,
  })

  // 401 → try a silent token refresh, then replay once
  if (res.status === 401 && auth && getRefreshToken()) {
    const refreshed = await silentRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${_accessToken}`
      const retry = await fetch(`${BASE}/${path}`, {
        method,
        headers,
        body: body !== undefined ? (multipart ? body : JSON.stringify(body)) : undefined,
        signal,
      })
      return handleResponse(retry)
    }
    clearTokens()
  }

  return handleResponse(res)
}

async function handleResponse(res) {
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Surface DRF error messages as a single string
    const message = extractError(data) || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function extractError(data) {
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.non_field_errors) return data.non_field_errors.join(' ')
  const first = Object.values(data)[0]
  if (Array.isArray(first)) return first.join(' ')
  return null
}

async function silentRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefreshToken() }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setAccessToken(data.access)
    if (data.refresh) storeRefreshToken(data.refresh)
    return true
  } catch {
    return false
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export const apiGet = (path, signal) => request('GET', path, { signal })
export const apiPost = (path, body, opts) => request('POST', path, { body, ...opts })
export const apiPatch = (path, body, opts) => request('PATCH', path, { body, ...opts })
export const apiDelete = (path, opts) => request('DELETE', path, opts)

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export async function login(username, password) {
  const data = await apiPost('auth/token/', { username, password }, { auth: false })
  setAccessToken(data.access)
  storeRefreshToken(data.refresh)
  return data
}

export async function register(payload) {
  // POST /api/auth/register/ — backend AI will add this endpoint
  const data = await apiPost('auth/register/', payload, { auth: false })
  return data
}

export async function refreshTokens() {
  return silentRefresh()
}

// ─── Resource helpers ─────────────────────────────────────────────────────────
export const getMe = () => apiGet('auth/me/')
export const getServices = (params = '') => apiGet(`services/${params}`)
export const getCategories = () => apiGet('categories/')
export const getFreelancers = (params = '') => apiGet(`freelancers/${params}`)
export const getNotifications = () => apiGet('notifications/')
export const markAllRead = () => apiPost('notifications/mark_all_read/')
export const getProjects = () => apiGet('projects/')
export const getMessages = () => apiGet('messages/')
