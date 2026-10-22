import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiGet, apiPost } from '../../lib/api'
import DashboardShell from '../../components/dashboard/DashboardShell'
import base from '../../components/dashboard/Dashboard.module.css'
import styles from './FreelancerDashboard.module.css'

const freelancerSections = {
  overview: { label: 'Overview', glyph: '◈', endpoint: 'projects/?workspace=freelancer', columns: ['title', 'client', 'deadline', 'status'] },
  services: { label: 'My services', glyph: '⊞', endpoint: 'services/?mine=true', columns: ['title', 'price', 'delivery_days', 'status'] },
  projects: { label: 'My projects', glyph: '▣', endpoint: 'projects/?workspace=freelancer', columns: ['title', 'client', 'deadline', 'status'] },
  proposals: { label: 'My proposals', glyph: '↗', endpoint: 'proposals/?mine=true', columns: ['job', 'amount', 'deadline', 'status'] },
  jobs: { label: 'Explore jobs', glyph: '⌕', endpoint: 'jobs/?', columns: ['title', 'budget', 'deadline', 'status'] },
  notifications: { label: 'Notifications', glyph: '◎', endpoint: 'notifications/?', columns: ['title', 'message', 'created_at', 'is_read'] },
}
function reducer(state, action) {
  if (action.type === 'loading') return { ...state, status: 'loading', error: '' }
  if (action.type === 'ready') return { status: 'ready', data: action.data, error: '' }
  if (action.type === 'error') return { ...state, status: 'error', error: action.error }
  return state
}
function human(value) { return String(value ?? '—').replaceAll('_', ' ') }
function valueOf(value, key) {
  if (value == null || value === '') return '—'
  if (key === 'is_read') return value ? 'Read' : 'Unread'
  if (['deadline', 'created_at'].includes(key)) return new Date(key === 'deadline' ? value + 'T12:00:00' : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (['price', 'budget', 'amount'].includes(key)) return `NLe ${Number(value).toLocaleString()}`
  if (typeof value === 'object') return [value.first_name, value.last_name].filter(Boolean).join(' ') || value.username || value.title || JSON.stringify(value)
  return human(value)
}

export default function FreelancerDashboard({ composite = false }) {
  const sections = composite ? {
    overview: { ...freelancerSections.overview, group: 'Workspace' },
    'hiring-projects': { label: 'Hired projects', glyph: '▣', group: 'Hiring', endpoint: 'projects/?workspace=client', columns: ['title', 'freelancer', 'deadline', 'status'] },
    'hiring-jobs': { label: 'My posted jobs', glyph: '⊞', group: 'Hiring', endpoint: 'jobs/?mine=true', columns: ['title', 'budget', 'deadline', 'status'] },
    'hiring-requests': { label: 'Sent service requests', glyph: '↗', group: 'Hiring', endpoint: 'service-requests/?workspace=client', columns: ['title', 'amount', 'deadline', 'status'] },
    projects: { ...freelancerSections.projects, label: 'Freelance projects', group: 'Freelancing' },
    services: { ...freelancerSections.services, group: 'Freelancing' },
    proposals: { ...freelancerSections.proposals, group: 'Freelancing' },
    'incoming-requests': { label: 'Incoming requests', glyph: '↙', group: 'Freelancing', endpoint: 'service-requests/?workspace=freelancer', columns: ['title', 'client', 'amount', 'status'] },
    jobs: { ...freelancerSections.jobs, group: 'Freelancing' },
    notifications: { ...freelancerSections.notifications, group: 'Shared' },
  } : freelancerSections
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const section = Object.hasOwn(sections, params.get('section')) ? params.get('section') : 'overview'
  const config = sections[section]
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const [query, setQuery] = useState('')
  const [revision, refresh] = useReducer(value => value + 1, 0)
  const [summary, summaryDispatch] = useReducer(reducer, { status: 'loading', data: null })
  const [records, recordsDispatch] = useReducer(reducer, { status: 'loading', data: null })
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    summaryDispatch({ type: 'loading' })
    apiGet('dashboard/', controller.signal).then(data => summaryDispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') summaryDispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    const controller = new AbortController()
    recordsDispatch({ type: 'loading' })
    apiGet(`${config.endpoint}&page=${page}`, controller.signal).then(data => recordsDispatch({ type: 'ready', data }))
      .catch(error => { if (error.name !== 'AbortError') recordsDispatch({ type: 'error', error: error.message }) })
    return () => controller.abort()
  }, [config.endpoint, page, revision])

  function go(next) { setParams({ section: next }); setQuery('') }
  async function markRead() {
    setBusy(true)
    try { await apiPost('notifications/mark_all_read/'); setNotice('All notifications marked as read.'); refresh() }
    catch (error) { setNotice(error.message) }
    finally { setBusy(false) }
  }
  const data = summary.data
  const items = records.data?.results ?? []
  const visible = items.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
  const stats = composite && config.group === 'Hiring' ? [
    { label: 'Hired projects in motion', value: data?.client_active_projects, note: 'Your work as a client', target: 'hiring-projects', glyph: '1' },
    { label: 'Completed hired projects', value: data?.client_completed_projects, note: 'Your client-side collaborations', target: 'hiring-projects', glyph: '2' },
    { label: 'Posted jobs', value: data?.jobs, note: 'Jobs you created', target: 'hiring-jobs', glyph: '3' },
    { label: 'Unread notifications', value: data?.unread_notifications, note: 'Shared across your account', target: 'notifications', glyph: '4' },
  ] : [
    { label: 'Projects in motion', value: data?.freelancer_active_projects, note: 'Active, submitted & in revision', target: 'projects', glyph: '↗' },
    { label: 'My services', value: data?.owned_services, note: `${data?.published_services ?? '—'} published in the marketplace`, target: 'services', glyph: '⊞' },
    { label: 'Proposals sent', value: data?.proposals, note: 'Your next possibilities', target: 'proposals', glyph: '✧' },
    { label: 'Projects completed', value: data?.freelancer_completed_projects, note: 'Good work, brought to life', target: 'projects', glyph: '✓' },
  ]
  return (
    <DashboardShell role={composite ? "Combined" : "Freelancer"} active={section} title={config.label} onSelect={go}
      items={Object.entries(sections).map(([key, item]) => ({ key, label: item.label, icon: item.glyph, group: item.group, count: key === 'notifications' ? data?.unread_notifications : 0 }))}
      overlay={dialog && <WorkspaceDialog create={dialog.create} record={dialog.record} section={section} onClose={() => setDialog(null)} onSaved={message => { setNotice(message); setDialog(null); refresh() }} />}
      sidebarExtra={<div className={styles.sidebarTip}><span aria-hidden="true">&#10022;</span><strong>Make room for your next idea.</strong><p>Turn your skills into a service someone needs.</p><button type="button" onClick={() => setDialog({ create: true })}>Create a service <span>&#8599;</span></button></div>}
      toolbar={<><button className={styles.notificationButton} aria-label={`${data?.unread_notifications ?? 0} unread notifications`} onClick={() => go('notifications')}>&#9678; <span>{data?.unread_notifications ?? '?'}</span></button><Link to="?view=services" className={styles.marketplaceLink}>Marketplace &#8599;</Link></>}>
        <main className={base.content} id="main-content">
          <div className={base.pageHeading}><div><p className={base.eyebrow}>{composite ? "ONE WORKSPACE. BOTH SIDES OF YOUR WORK." : "YOUR CRAFT. YOUR NEXT CHAPTER."}</p><h1>{section === 'overview' ? `Welcome back${user?.firstName ? ', ' + user.firstName : ''}.` : config.label}</h1><p>{section === 'overview' ? 'A little progress, a new possibility. Let’s make today a good one.' : 'Keep your work, conversations, and next steps in view.'}</p></div><AddServiceButton onClick={() => setDialog({ create: true })} /></div>
          {notice && <p className={base.notice} role="status">{notice}</p>}
          {summary.status === 'error' && <p className={base.error} role="alert">Could not load your summary. <button onClick={refresh}>Retry</button></p>}
          {composite && section === 'overview' && <section className={styles.compositeLanes} aria-label="Your two work areas">
            <article><p className={base.eyebrow}>HIRING</p><h2>Bring your ideas to life.</h2><p>Manage the people and services you hire, your posted jobs, and outgoing requests.</p><div className={styles.laneMetrics}><span><strong>{data?.client_active_projects ?? '?'}</strong> active projects</span><span><strong>{data?.jobs ?? '?'}</strong> posted jobs</span><span><strong>{data?.client_completed_projects ?? '?'}</strong> completed</span></div><button onClick={() => go('hiring-projects')}>Open hiring projects <span aria-hidden="true">&#8599;</span></button></article>
            <article><p className={base.eyebrow}>FREELANCING</p><h2>Put your craft to work.</h2><p>Keep your service listings, client requests, proposals, and delivery work together.</p><div className={styles.laneMetrics}><span><strong>{data?.freelancer_active_projects ?? '?'}</strong> active projects</span><span><strong>{data?.owned_services ?? '?'}</strong> services</span><span><strong>{data?.proposals ?? '?'}</strong> proposals</span></div><button onClick={() => go('projects')}>Open freelance projects <span aria-hidden="true">&#8599;</span></button></article>
          </section>}
          {composite && <p className={styles.contextLabel}>{config.group === 'Hiring' ? 'Hiring: you are the client in these records.' : config.group === 'Shared' ? 'Shared across both work areas.' : 'Freelancing: you are the service provider in these records.'}</p>}
          <div className={base.stats}>{stats.map(stat => <button key={stat.label} onClick={() => go(stat.target)} className={base.stat}><span className={base.statTop}>{stat.label}<span aria-hidden="true">{stat.glyph}</span></span><strong>{summary.status === 'ready' ? stat.value ?? '—' : '—'}</strong><small>{stat.note}</small></button>)}</div>
          {!composite && section === 'overview' && <div className={styles.overview}><section className={styles.welcomeCard}><div><p className={base.eyebrow}>GOOD WORK STARTS WITH YOU</p><h2>Your skills.<br />Someone’s next big thing.</h2><p>Give your next client a clear picture of what you do best. Build a service around your strongest skill.</p><button onClick={() => setDialog({ create: true })}>Build your next service <span>↗</span></button></div><span className={styles.heroSpark} aria-hidden="true">✦</span></section><section className={styles.nextSteps}><p className={base.eyebrow}>A LITTLE DIRECTION</p><h2>Make your next move</h2><button onClick={() => go('services')}><span className={styles.stepNumber}>01</span><span>Put your craft out there<small>Manage your service listings</small></span><b>↗</b></button><button onClick={() => go('jobs')}><span className={styles.stepNumber}>02</span><span>Find a fresh possibility<small>Explore client job listings</small></span><b>↗</b></button><button onClick={() => go('projects')}><span className={styles.stepNumber}>03</span><span>Keep good work moving<small>Check your project deadlines</small></span><b>↗</b></button></section></div>}
          <section className={base.tableCard} aria-labelledby="freelancer-records-title"><div className={base.tableHeading}><div><h2 id="freelancer-records-title">{section === 'overview' ? (composite ? 'Freelancing project desk' : 'Your project desk') : config.label}</h2><p>{records.data?.count ?? '—'} records · Your workspace, up to date</p></div><div className={styles.tableTools}>{section === 'notifications' && <button disabled={busy} onClick={markRead}>Mark all read</button>}<button onClick={refresh}>Refresh</button><label className={base.search}><span className="sr-only">Search current page</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this page..." /></label></div></div>
          {records.status === 'loading' && <p className={base.empty} role="status">Loading your workspace...</p>}
          {records.status === 'error' && <p className={base.error} role="alert">{records.error} <button onClick={refresh}>Try again</button></p>}
          {records.status === 'ready' && <><div className={base.tableScroll}><table><thead><tr>{config.columns.map(key => <th key={key}>{human(key)}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}>{config.columns.map(key => <td key={key}>{key === 'status' || key === 'is_read' ? <span className={base.badge} data-status={String(item[key])}>{valueOf(item[key], key)}</span> : valueOf(item[key], key)}</td>)}<td><button className={base.viewButton} onClick={() => setDialog({ record: item })}>View <span>↗</span></button></td></tr>)}</tbody></table></div>{!visible.length && <div className={styles.emptyState}><span aria-hidden="true">↗</span><h3>{query ? 'No matches on this page.' : section === 'services' ? 'Your next service starts here.' : 'A little space for what comes next.'}</h3><p>{query ? 'Try a different search or another page.' : section === 'services' ? 'Add a draft, describe your skills, and get ready for your first request.' : 'Your records will appear here as your marketplace journey grows.'}</p>{section === 'services' && !query && <AddServiceButton onClick={() => setDialog({ create: true })} />}</div>}<div className={base.pagination}><span>Page {page} · {visible.length} shown</span><div><button disabled={!records.data?.previous} onClick={() => setParams({ section, page: String(page - 1) })}>Previous</button><button disabled={!records.data?.next} onClick={() => setParams({ section, page: String(page + 1) })}>Next</button></div></div></>}
          </section>
          <footer className={base.footer}><span>FreelanceHub · {composite ? "Your combined workspace" : "Your independent workspace"}</span><span>A little talent. A lot of possibility.</span></footer>
        </main>
    </DashboardShell>
  )
}

function AddServiceButton({ onClick }) {
  return <button className={styles.addButton} type="button" onClick={onClick} aria-label="Add service"><span className={styles.addText}>Add Service</span><span className={styles.addIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></span></button>
}

function WorkspaceDialog({ create, record, section, onClose, onSaved }) {
  const ref = useRef(null)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fields, setFields] = useState({ title: '', description: '', category_id: '', skills: '', price: '', delivery_days: 3 })
  useEffect(() => {
    ref.current.showModal()
    if (!create) return
    const controller = new AbortController()
    async function loadCategories() {
      try {
        let page = 1
        let more = true
        const all = []
        while (more) {
          const data = await apiGet(`categories/?page=${page}`, controller.signal)
          all.push(...(data.results ?? data))
          more = Boolean(data.next)
          page += 1
        }
        if (!controller.signal.aborted) setCategories(all)
      } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message) }
    }
    loadCategories()
    return () => controller.abort()
  }, [create])
  function change(event) { setFields(previous => ({ ...previous, [event.target.name]: event.target.value })) }
  async function save(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try { await apiPost('services/', { ...fields, category_id: Number(fields.category_id), delivery_days: Number(fields.delivery_days) }); onSaved('Service draft saved. Open My services to review and publish it.') }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  async function publish() {
    setBusy(true); setError('')
    try { const data = await apiPost(`services/${record.id}/publish/`); onSaved(data.status === 'pending' ? 'Service submitted for moderation.' : 'Service published.') }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <dialog ref={ref} className={base.dialog} aria-labelledby="freelancer-dialog-title" onCancel={event => { if (busy) event.preventDefault() }} onClose={onClose}><div className={base.dialogHeader}><div><p className={base.eyebrow}>{create ? 'PUT YOUR CRAFT OUT THERE' : `RECORD #${record.id}`}</p><h2 id="freelancer-dialog-title">{create ? 'Create a new service' : record.title || `Your ${section === 'proposals' ? 'proposal' : 'record'}`}</h2></div><button disabled={busy} onClick={onClose} aria-label="Close">×</button></div>{create ? <form className={styles.serviceForm} onSubmit={save}><label>Service title<input name="title" required maxLength={200} value={fields.title} onChange={change} placeholder="I will design a memorable brand identity" /></label><label>Category<select name="category_id" required value={fields.category_id} onChange={change}><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Description<textarea name="description" required rows={4} value={fields.description} onChange={change} placeholder="Describe the work and what your client will receive." /></label><div className={styles.formRow}><label>Price (NLe)<input name="price" required type="number" min="0.01" step="0.01" value={fields.price} onChange={change} /></label><label>Delivery (days)<input name="delivery_days" required type="number" min="1" step="1" value={fields.delivery_days} onChange={change} /></label></div><label>Skills<input name="skills" maxLength={300} value={fields.skills} onChange={change} placeholder="Brand design, illustration, typography" /></label><p>This saves a private draft. Publishing is a separate step and may require email verification and moderation.</p>{error && <p className={base.error} role="alert">{error}</p>}<button className={styles.primaryButton} disabled={busy || !categories.length}>{busy ? 'Saving...' : 'Save service draft'}</button></form> : <><dl className={base.recordDetails}>{Object.entries(record).filter(([, value]) => value != null && value !== '').map(([key, value]) => <div key={key}><dt>{human(key)}</dt><dd>{valueOf(value, key)}</dd></div>)}</dl>{error && <p className={base.error} role="alert">{error}</p>}{section === 'services' && ['draft', 'rejected'].includes(record.status) && <div className={styles.publishAction}><p>Submit this listing for publication. The marketplace’s verification and moderation rules apply.</p><button className={styles.primaryButton} disabled={busy} onClick={publish}>{busy ? 'Submitting...' : 'Publish service'}</button></div>}</>}</dialog>
}
