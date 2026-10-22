import { useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../lib/api'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import styles from './FreelancersPage.module.css'

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING': return { ...state, status: 'loading', error: '' }
    case 'SUCCESS': return { status: 'ready', profiles: action.profiles, error: '' }
    case 'ERROR':   return { ...state, status: 'error',   error: action.error }
    default:        return state
  }
}

const INIT = { status: 'loading', profiles: [], error: '' }

function StarRating({ rating }) {
  const val = Number(rating) || 0
  return (
    <span className={styles.stars} aria-label={`${val.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(val) ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
      <span className={styles.ratingNum}>{val.toFixed(1)}</span>
    </span>
  )
}

function FreelancerCard({ profile }) {
  const { user } = profile
  const name    = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  const initial = name[0]?.toUpperCase() ?? '?'
  const skills  = profile.skills
    ? profile.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
    : []

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>{initial}</div>
        <div className={styles.meta}>
          <h2 className={styles.name}>{name}</h2>
          {profile.professional_title && <p className={styles.title}>{profile.professional_title}</p>}
          {user.location && (
            <p className={styles.location}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {user.location}
            </p>
          )}
        </div>
      </div>
      <StarRating rating={profile.rating} />
      {profile.biography && <p className={styles.bio}>{profile.biography}</p>}
      {skills.length > 0 && (
        <div className={styles.skills}>
          {skills.map(skill => <span key={skill} className={styles.skill}>{skill}</span>)}
        </div>
      )}
      <div className={styles.cardFooter}>
        <div className={styles.stat}>
          <strong>{profile.completed_projects}</strong>
          <span>Projects</span>
        </div>
        {profile.hourly_rate && (
          <div className={styles.stat}>
            <strong>NLe {Number(profile.hourly_rate).toLocaleString()}</strong>
            <span>/ hour</span>
          </div>
        )}
        <span className={profile.availability ? styles.available : styles.unavailable}>
          {profile.availability ? 'Available' : 'Busy'}
        </span>
      </div>
    </article>
  )
}

export default function FreelancersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, dispatch]   = useReducer(reducer, INIT)
  const [attempt, retry]    = useReducer(n => n + 1, 0)

  const query = searchParams.get('q') ?? ''

  function setQuery(value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set('q', value)
      else next.delete('q')
      return next
    })
  }

  useEffect(() => {
    const ctrl = new AbortController()
    dispatch({ type: 'LOADING' })

    const params = query ? `?q=${encodeURIComponent(query)}` : ''
    apiGet(`freelancers/${params}`, ctrl.signal)
      .then(data  => dispatch({ type: 'SUCCESS', profiles: data.results ?? data }))
      .catch(err  => {
        if (err.name !== 'AbortError') dispatch({ type: 'ERROR', error: err.message })
      })

    return () => ctrl.abort()
  }, [query, attempt])

  const { status, profiles, error } = state

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <p className="eyebrow">OUR TALENT</p>
          <h1 className={styles.heading}>Browse Freelancers</h1>
        </div>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name or skill…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search freelancers"
        />
      </div>

      {status === 'loading' && <Spinner />}
      {status === 'error' && (
        <Alert variant="error">
          {error}{' '}
          <button onClick={retry} className={styles.retryBtn}>Try again</button>
        </Alert>
      )}
      {status === 'ready' && profiles.length === 0 && (
        <p className={styles.empty}>No freelancers found. Try a different search.</p>
      )}
      {status === 'ready' && profiles.length > 0 && (
        <div className={styles.grid}>
          {profiles.map(p => <FreelancerCard key={p.id} profile={p} />)}
        </div>
      )}
    </div>
  )
}
