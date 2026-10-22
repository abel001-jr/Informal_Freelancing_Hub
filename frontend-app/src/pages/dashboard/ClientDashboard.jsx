import { useEffect, useReducer } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiGet } from '../../lib/api'
import DashboardShell from '../../components/dashboard/DashboardShell'
import styles from '../../components/dashboard/Dashboard.module.css'

const sections = {
  overview: { label: 'Overview', icon: '◈', endpoint: 'projects', columns: ['title', 'freelancer', 'deadline', 'status'] },
  projects: { label: 'My projects', icon: '▣', endpoint: 'projects', columns: ['title', 'freelancer', 'deadline', 'status'] },
  jobs: { label: 'My jobs', icon: '⊞', endpoint: 'jobs', columns: ['title', 'budget', 'deadline', 'status'] },
  requests: { label: 'Service requests', icon: '↗', endpoint: 'service-requests', columns: ['title', 'amount', 'deadline', 'status'] },
  notifications: { label: 'Notifications', icon: '◎', endpoint: 'notifications', columns: ['title', 'message', 'created_at', 'is_read'] },
}
function reducer(state, action) {
  if (action.type === 'loading') return { ...state, status: 'loading' }
  if (action.type === 'ready') return { status: 'ready', data: action.data }
  if (action.type === 'error') return { status: 'error', error: action.error }
  return state
}
function valueOf(value, key) {
  if (value == null || value === '') return '—'
  if (key === 'is_read') return value ? 'Read' : 'Unread'
  if (typeof value === 'object') return [value.first_name, value.last_name].filter(Boolean).join(' ') || value.username || value.title
  if (key === 'deadline' || key === 'created_at') return new Date(key === 'deadline' ? value + 'T12:00:00' : value).toLocaleDateString()
  if (key === 'budget' || key === 'amount') return `NLe ${Number(value).toLocaleString()}`
  return String(value).replaceAll('_', ' ')
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const section = Object.hasOwn(sections, params.get('section')) ? params.get('section') : 'overview'
  const config = sections[section]
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const [revision, refresh] = useReducer(value => value + 1, 0)
  const [summary, summaryDispatch] = useReducer(reducer, { status: 'loading' })
  const [records, dispatch] = useReducer(reducer, { status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    summaryDispatch({ type: 'loading' })
    apiGet('dashboard/', controller.signal).then(data => summaryDispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') summaryDispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'loading' })
    apiGet(`${config.endpoint}/?workspace=client&mine=true&page=${page}`, controller.signal)
      .then(data => dispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') dispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [config.endpoint, page, revision])
  const data = summary.data
  const items = records.data?.results ?? []
  const stats = [
    ['Active projects', data?.client_active_projects, 'projects'],
    ['Completed projects', data?.client_completed_projects, 'projects'],
    ['My jobs', data?.jobs, 'jobs'],
    ['Unread notifications', data?.unread_notifications, 'notifications'],
  ]
  return (
    <DashboardShell role="Client" active={section} title={config.label}
      onSelect={key => setParams({ section: key })}
      items={Object.entries(sections).map(([key, item]) => ({ key, label: item.label, icon: item.icon, count: key === 'notifications' ? data?.unread_notifications : 0 }))}
      toolbar={<Link className={styles.refresh} to="?view=services">Find a service ↗</Link>}>
      <main className={styles.content} id="main-content">
        <div className={styles.pageHeading}><div><p className={styles.eyebrow}>YOUR IDEAS. THE RIGHT PEOPLE.</p><h1>{section === 'overview' ? `Welcome back${user?.firstName ? ', ' + user.firstName : ''}.` : config.label}</h1><p>A shared space for your projects and your next possibilities.</p></div><button className={styles.refresh} onClick={refresh}>Refresh data</button></div>
        {summary.status === 'error' && <p className={styles.error} role="alert">{summary.error} <button onClick={refresh}>Retry</button></p>}
        <div className={styles.stats}>{stats.map(([label, value, target]) => <button key={label} className={styles.stat} onClick={() => setParams({ section: target })}><span className={styles.statTop}>{label}</span><strong>{summary.status === 'ready' ? value ?? '—' : '—'}</strong><small>Your client workspace</small></button>)}</div>
        <section className={styles.tableCard} aria-labelledby="client-records-title"><div className={styles.tableHeading}><div><h2 id="client-records-title">{section === 'overview' ? 'Your project desk' : config.label}</h2><p>{records.data?.count ?? '—'} records · Live marketplace data</p></div><Link to="?view=freelancers" className={styles.viewButton}>Explore talent ↗</Link></div>
          {records.status === 'loading' && <p className={styles.empty} role="status">Loading your records…</p>}
          {records.status === 'error' && <p className={styles.error} role="alert">{records.error} <button onClick={refresh}>Try again</button></p>}
          {records.status === 'ready' && <><div className={styles.tableScroll}><table><thead><tr>{config.columns.map(key => <th key={key}>{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}>{config.columns.map(key => <td key={key}>{key === 'status' || key === 'is_read' ? <span className={styles.badge} data-status={String(item[key])}>{valueOf(item[key], key)}</span> : valueOf(item[key], key)}</td>)}</tr>)}</tbody></table></div>{!items.length && <p className={styles.empty}>No records yet. Your next collaboration starts with the right service.</p>}<div className={styles.pagination}><span>Page {page}</span><div><button disabled={!records.data?.previous} onClick={() => setParams({ section, page: String(page - 1) })}>Previous</button><button disabled={!records.data?.next} onClick={() => setParams({ section, page: String(page + 1) })}>Next</button></div></div></>}
        </section>
        <footer className={styles.footer}><span>FreelanceHub · Client workspace</span><span>Bring your next idea to life.</span></footer>
      </main>
    </DashboardShell>
  )
}
