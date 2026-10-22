import { useEffect, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiGet, apiPost } from '../../lib/api'
import DashboardShell from '../../components/dashboard/DashboardShell'
import styles from '../../components/dashboard/Dashboard.module.css'

const sections = {
  overview: { label: 'Overview', icon: 'grid', endpoint: 'services', columns: ['title', 'freelancer', 'price', 'status'] },
  users: { label: 'Users', icon: 'users', endpoint: 'users', columns: ['username', 'email', 'role', 'is_active'] },
  services: { label: 'Services', icon: 'bag', endpoint: 'services', columns: ['title', 'freelancer', 'price', 'status'] },
  projects: { label: 'Projects', icon: 'folder', endpoint: 'projects', columns: ['title', 'client', 'freelancer', 'status'] },
  reports: { label: 'Reports', icon: 'flag', endpoint: 'reports', columns: ['id', 'reason', 'created_at', 'status'] },
  disputes: { label: 'Disputes', icon: 'shield', endpoint: 'disputes', columns: ['id', 'project', 'created_at', 'status'] },
  payments: { label: 'Payment records', icon: 'wallet', endpoint: 'payments', columns: ['reference', 'amount', 'currency', 'status'] },
  support: { label: 'Support tickets', icon: 'chat', endpoint: 'support-tickets', columns: ['subject', 'user', 'created_at', 'status'] },
  activity: { label: 'Audit log', icon: 'clock', endpoint: 'audit-events', columns: ['action', 'actor', 'created_at', 'reason'] },
}
const paths = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  bag: 'M4 7h16v14H4zM8 7V3h8v4M9 11v2m6-2v2',
  folder: 'M3 5h7l2 3h9v12H3z', flag: 'M5 21V3m0 1h14l-3 5 3 5H5',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm0 5v5m0 3h.01',
  wallet: 'M3 6V4h16v4M3 8h18v13H3zM21 12h-6v5h6',
  chat: 'M3 3h18v14H8l-5 4V3Zm4 5h10M7 12h6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
  arrow: 'M5 12h14m-6-6 6 6-6 6', refresh: 'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',
}
function Icon({ name }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg> }
function human(value) { return String(value ?? '—').replaceAll('_', ' ') }
function display(value, key) {
  if (value == null || value === '') return '—'
  if (key === 'is_active') return value ? 'Active' : 'Suspended'
  if (key.endsWith('_at')) return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (typeof value === 'object') return [value.first_name, value.last_name].filter(Boolean).join(' ') || value.username || value.name || JSON.stringify(value)
  return human(value)
}
function reducer(state, action) {
  if (action.type === 'loading') return { ...state, status: 'loading', error: '' }
  if (action.type === 'ready') return { status: 'ready', data: action.data, error: '' }
  if (action.type === 'error') return { ...state, status: 'error', error: action.error }
  return state
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const section = Object.hasOwn(sections, params.get('section')) ? params.get('section') : 'overview'
  const config = sections[section]
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [query, setQuery] = useState('')
  const [revision, refresh] = useReducer(value => value + 1, 0)
  const [summary, summaryDispatch] = useReducer(reducer, { status: 'loading', data: null })
  const [records, recordsDispatch] = useReducer(reducer, { status: 'loading', data: null })
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    summaryDispatch({ type: 'loading' })
    apiGet('dashboard/', controller.signal)
      .then(data => summaryDispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') summaryDispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const controller = new AbortController()
    recordsDispatch({ type: 'loading' })
    apiGet(`${config.endpoint}/?page=${page}`, controller.signal)
      .then(data => recordsDispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') recordsDispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [config.endpoint, page, revision])

  function go(next) { setParams({ section: next }); setQuery('') }
  const data = summary.data
  const items = records.data?.results ?? (Array.isArray(records.data) ? records.data : [])
  const visible = items.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
  const stats = [
    { label: 'Total members', value: data?.total_users, icon: 'users', note: 'People in your marketplace', section: 'users' },
    { label: 'Active projects', value: data?.active_projects, icon: 'folder', note: 'Collaborations in progress', section: 'projects' },
    { label: 'Awaiting review', value: data?.pending_services, icon: 'bag', note: 'Services needing a decision', section: 'services' },
    { label: 'Open disputes', value: data?.open_disputes, icon: 'shield', note: 'Conversations needing care', section: 'disputes' },
  ]

  return (
    <DashboardShell role="Admin" active={section} title={config.label} onSelect={go}
      items={Object.entries(sections).map(([key, item]) => ({ key, label: item.label, icon: <Icon name={item.icon} />, count: key === 'services' ? data?.pending_services : 0 }))}
      toolbar={<><span className={styles.adminBadge}><Icon name="shield" /> Admin access</span><span className={styles.topAvatar}>{(user?.username || 'A')[0].toUpperCase()}</span></>}>
        <main id="main-content" className={styles.content}>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>A LITTLE OVERSIGHT. A LOT OF POSSIBILITY.</p><h1>{section === 'overview' ? 'Your marketplace, at a glance.' : config.label}</h1><p>{section === 'overview' ? 'Keep good work moving. Take care of the people behind it.' : `Review and explore your marketplace ${config.label.toLowerCase()}.`}</p></div><button className={styles.refresh} type="button" onClick={refresh}><Icon name="refresh" /> Refresh data</button></div>
          {notice && <p className={styles.notice} role="status">{notice}</p>}
          {summary.status === 'error' && <p className={styles.error} role="alert">Summary unavailable: {summary.error} <button onClick={refresh}>Retry</button></p>}
          <div className={styles.stats}>{stats.map(stat => <button type="button" key={stat.label} onClick={() => go(stat.section)} className={styles.stat}><span className={styles.statTop}>{stat.label}<span><Icon name={stat.icon} /></span></span><strong>{summary.status === 'ready' ? stat.value ?? '—' : '—'}</strong><small>{stat.note}</small></button>)}</div>
          {section === 'overview' && <div className={styles.overviewGrid}><section className={styles.attention}><div><span className={styles.eyebrow}>YOUR NEXT MOVE</span><h2>A little attention goes a long way.</h2><p>Review new work, support fair outcomes, and keep the marketplace welcoming.</p></div><div className={styles.attentionActions}><button onClick={() => go('services')}><Icon name="bag" /><span>Service moderation<small>{data?.pending_services ?? '—'} awaiting review</small></span><Icon name="arrow" /></button><button onClick={() => go('disputes')}><Icon name="shield" /><span>Dispute centre<small>{data?.open_disputes ?? '—'} open conversations</small></span><Icon name="arrow" /></button></div></section><section className={styles.pulse}><p className={styles.eyebrow}>WORK IN MOTION</p><h2>Project snapshot</h2><div className={styles.progressRing}><strong>{data ? data.active_projects + data.completed_projects : '—'}<small>active + completed</small></strong></div><div className={styles.legend}><span><i />Active <b>{data?.active_projects ?? '—'}</b></span><span><i />Completed <b>{data?.completed_projects ?? '—'}</b></span></div></section></div>}
          <section className={styles.tableCard} aria-labelledby="records-title"><div className={styles.tableHeading}><div><h2 id="records-title">{section === 'overview' ? 'Service directory' : config.label}</h2><p>{records.status === 'ready' ? `${records.data?.count ?? items.length} records` : 'Fetching records…'} · Live marketplace data</p></div><label className={styles.search}><span className="sr-only">Search current page</span><input type="search" placeholder="Search this page…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
            {records.status === 'loading' && <p className={styles.empty} role="status">Loading records…</p>}
            {records.status === 'error' && <p className={styles.error} role="alert">{records.error} <button onClick={refresh}>Try again</button></p>}
            {records.status === 'ready' && <><div className={styles.tableScroll}><table><thead><tr>{config.columns.map(column => <th key={column}>{human(column)}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}>{config.columns.map(column => <td key={column}>{column === 'status' || column === 'role' || column === 'is_active' ? <span className={styles.badge} data-status={String(item[column])}>{display(item[column], column)}</span> : display(item[column], column)}</td>)}<td><button className={styles.viewButton} onClick={() => setSelected(item)}>Review <span aria-hidden="true">↗</span></button></td></tr>)}</tbody></table></div>{!visible.length && <p className={styles.empty}>{query ? 'No matches on this page. Try another search or page.' : 'No records here yet.'}</p>}<div className={styles.pagination}><span>Page {page} · {visible.length} shown</span><div><button disabled={!records.data?.previous} onClick={() => setParams({ section, page: String(page - 1) })}>Previous</button><button disabled={!records.data?.next} onClick={() => setParams({ section, page: String(page + 1) })}>Next</button></div></div></>}
          </section>
          <footer className={styles.footer}><span>FreelanceHub · Administration</span><span>Thoughtful oversight. Better possibilities.</span></footer>
        </main>
      {selected && <RecordDialog record={selected} section={section} onClose={() => setSelected(null)} onSaved={message => { setNotice(message); setSelected(null); refresh() }} />}
    </DashboardShell>
  )
}

function RecordDialog({ record, section, onClose, onSaved }) {
  const dialog = useRef(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canModerate = ['services', 'overview'].includes(section) && record.status === 'pending'
  useEffect(() => { dialog.current.showModal() }, [])
  async function moderate(action) {
    if (!reason.trim()) { setError('Add a reason for this decision.'); return }
    setBusy(true)
    setError('')
    try {
      await apiPost(`services/${record.id}/${action}/`, { reason: reason.trim() })
      onSaved(`Service #${record.id} ${action === 'approve' ? 'approved' : 'rejected'}.`)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="record-title" onCancel={event => { if (busy) event.preventDefault() }} onClose={onClose}><div className={styles.dialogHeader}><div><p className={styles.eyebrow}>RECORD #{record.id}</p><h2 id="record-title">{record.title || record.subject || record.username || 'Record details'}</h2></div><button disabled={busy} onClick={onClose} aria-label="Close record">×</button></div><dl className={styles.recordDetails}>{Object.entries(record).filter(([, value]) => value != null && value !== '').map(([key, value]) => <div key={key}><dt>{human(key)}</dt><dd>{display(value, key)}</dd></div>)}</dl>{canModerate && <div className={styles.moderation}><label htmlFor="moderation-reason">Decision reason</label><textarea id="moderation-reason" rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain your moderation decision…" disabled={busy} /><p>This decision updates the listing and notifies its freelancer.</p>{error && <p className={styles.error} role="alert">{error}</p>}<div><button disabled={busy} onClick={() => moderate('reject')}>Reject service</button><button disabled={busy} className={styles.approve} onClick={() => moderate('approve')}>{busy ? 'Saving…' : 'Approve service'}</button></div></div>}</dialog>
}
