import { useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../lib/api'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import styles from './ServicesPage.module.css'

// ── Reducer — batches all fetch state in one dispatch ─────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':  return { ...state, status: 'loading', error: '' }
    case 'SUCCESS':  return { status: 'ready', services: action.services, categories: action.categories, error: '' }
    case 'CATS':     return { ...state, categories: action.categories }
    case 'ERROR':    return { ...state, status: 'error', error: action.error }
    default:         return state
  }
}

const INIT = { status: 'loading', services: [], categories: [], error: '' }

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, dispatch] = useReducer(reducer, INIT)
  const [attempt, retryDispatch] = useReducer(n => n + 1, 0)

  const query      = searchParams.get('q')        ?? ''
  const categoryId = searchParams.get('category') ?? ''

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  useEffect(() => {
    const ctrl = new AbortController()
    dispatch({ type: 'LOADING' })

    const params = new URLSearchParams()
    if (query)      params.set('q', query)
    if (categoryId) params.set('category_id', categoryId)

    Promise.all([
      apiGet(`services/?${params}`, ctrl.signal),
      apiGet('categories/', ctrl.signal),
    ])
      .then(([svcData, catData]) => dispatch({
        type: 'SUCCESS',
        services:   svcData.results ?? svcData,
        categories: catData.results ?? catData,
      }))
      .catch(err => {
        if (err.name !== 'AbortError') dispatch({ type: 'ERROR', error: err.message })
      })

    return () => ctrl.abort()
  }, [query, categoryId, attempt])

  const { status, services, categories, error } = state

  return (
    <div className={styles.page}>
      {/* Filters sidebar */}
      <aside className={styles.sidebar}>
        <p className={styles.sidebarHead}>Categories</p>
        <button
          className={[styles.catBtn, !categoryId ? styles.catActive : ''].join(' ')}
          onClick={() => setParam('category', '')}
        >
          All categories
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={[styles.catBtn, categoryId === String(cat.id) ? styles.catActive : ''].join(' ')}
            onClick={() => setParam('category', cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <div className={styles.topBar}>
          <h1 className={styles.heading}>Browse Services</h1>
          <input
            type="search"
            className={styles.search}
            placeholder="Search services…"
            value={query}
            onChange={e => setParam('q', e.target.value)}
            aria-label="Search services"
          />
        </div>

        {status === 'loading' && <Spinner />}
        {status === 'error' && (
          <Alert variant="error">
            {error}{' '}
            <button onClick={retryDispatch} className={styles.retryBtn}>Try again</button>
          </Alert>
        )}
        {status === 'ready' && services.length === 0 && (
          <p className={styles.empty}>No services found. Try adjusting your filters.</p>
        )}
        {status === 'ready' && services.length > 0 && (
          <div className={styles.grid}>
            {services.map(s => (
              <article key={s.id} className={styles.card}>
                {s.image && (
                  <div className={styles.cardImg}>
                    <img src={s.image} alt="" loading="lazy" />
                  </div>
                )}
                <div className={styles.cardBody}>
                  <p className="eyebrow">{s.category?.name ?? 'Service'}</p>
                  <h2 className={styles.cardTitle}>{s.title}</h2>
                  <p className={styles.cardDesc}>{s.description}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>NLe {Number(s.price).toLocaleString()}</span>
                    <span className={styles.delivery}>{s.delivery_days}d delivery</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
